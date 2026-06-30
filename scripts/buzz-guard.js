/**
 * Reddit / traffic-spike guards for Open-Meteo and static data loads.
 * Loaded before inline app script in ski-powder-hunter*.html
 */
(function (global) {
  "use strict";

  var MAX_LIVE_API_FETCHES_PER_SESSION = 24;
  var MAX_FETCH_REMAINING_PER_CLICK = 30;
  var WEATHER_JSON_RETRIES = 2;
  var WEATHER_JSON_RETRY_MS = 800;
  var FETCH_REMAINING_STORAGE_KEY = "powder.fetchRemaining.day.v1";
  var JMA_PROBE_BUDGET_KEY = "powder.jmaProbeBudget.v1";
  var JMA_PROBE_BUDGET_PER_SESSION = 16;

  var state = {
    weatherJsonOk: false,
    weatherJsonEntries: 0,
    liveApiFetchCount: 0,
    siteConfig: null,
    jmaProbeCount: 0,
  };

  function todayJstKey() {
    try {
      return new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Tokyo",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date());
    } catch (_e) {
      return new Date().toISOString().slice(0, 10);
    }
  }

  function readJmaProbeBudget() {
    try {
      var raw = sessionStorage.getItem(JMA_PROBE_BUDGET_KEY);
      if (!raw) return 0;
      var n = parseInt(raw, 10);
      return isNaN(n) ? 0 : n;
    } catch (_e) {
      return 0;
    }
  }

  function writeJmaProbeBudget(n) {
    try {
      sessionStorage.setItem(JMA_PROBE_BUDGET_KEY, String(n));
    } catch (_e) {}
  }

  state.jmaProbeCount = readJmaProbeBudget();

  function burstMode() {
    return !state.weatherJsonOk;
  }

  function allowLiveFetch(requested) {
    var n = requested || 1;
    if (state.weatherJsonOk && state.weatherJsonEntries >= 400) {
      return n <= Math.max(0, MAX_LIVE_API_FETCHES_PER_SESSION - state.liveApiFetchCount);
    }
    if (!state.weatherJsonOk) {
      var cap = Math.min(MAX_LIVE_API_FETCHES_PER_SESSION, 12);
      return n <= Math.max(0, cap - state.liveApiFetchCount);
    }
    return n <= Math.max(0, MAX_LIVE_API_FETCHES_PER_SESSION - state.liveApiFetchCount);
  }

  function consumeLiveFetch(requested) {
    var n = requested || 1;
    if (!allowLiveFetch(n)) return false;
    state.liveApiFetchCount += n;
    return true;
  }

  function shouldShowFetchRemainingButton() {
    if (!state.weatherJsonOk) return false;
    if (state.weatherJsonEntries < 400) return true;
    return false;
  }

  function fetchRemainingUsedToday() {
    try {
      return localStorage.getItem(FETCH_REMAINING_STORAGE_KEY) === todayJstKey();
    } catch (_e) {
      return false;
    }
  }

  function markFetchRemainingUsed() {
    try {
      localStorage.setItem(FETCH_REMAINING_STORAGE_KEY, todayJstKey());
    } catch (_e) {}
  }

  function canUseFetchRemaining() {
    if (!shouldShowFetchRemainingButton()) return false;
    return !fetchRemainingUsedToday();
  }

  function allowJmaProbe() {
    return state.jmaProbeCount < JMA_PROBE_BUDGET_PER_SESSION;
  }

  function consumeJmaProbe(n) {
    var count = n || 1;
    if (state.jmaProbeCount + count > JMA_PROBE_BUDGET_PER_SESSION) return false;
    state.jmaProbeCount += count;
    writeJmaProbeBudget(state.jmaProbeCount);
    return true;
  }

  function jmaProbeLookbackMin(kind, hasStoredTime) {
    if (hasStoredTime) return kind === "6h" ? 360 : 120;
    if (burstMode()) return kind === "6h" ? 360 : 180;
    return kind === "6h" ? 1440 : 720;
  }

  function jmaProbeStepMin(hasStoredTime) {
    if (hasStoredTime) return 120;
    if (burstMode()) return 120;
    return 60;
  }

  function sleep(ms) {
    return new Promise(function (resolve) {
      setTimeout(resolve, ms);
    });
  }

  async function fetchWeatherJson(url) {
    var lastErr = null;
    for (var attempt = 0; attempt <= WEATHER_JSON_RETRIES; attempt++) {
      try {
        var res = await fetch(url, { cache: "default" });
        if (!res.ok) throw new Error("HTTP " + res.status);
        var data = await res.json();
        if (!data || typeof data !== "object") throw new Error("invalid json");
        var entries = 0;
        for (var k in data) {
          if (Object.prototype.hasOwnProperty.call(data, k) && data[k]) entries++;
        }
        state.weatherJsonOk = entries >= 400;
        state.weatherJsonEntries = entries;
        return { data: data, lastModified: res.headers.get("Last-Modified") };
      } catch (e) {
        lastErr = e;
        if (attempt < WEATHER_JSON_RETRIES) await sleep(WEATHER_JSON_RETRY_MS * (attempt + 1));
      }
    }
    state.weatherJsonOk = false;
    state.weatherJsonEntries = 0;
    if (lastErr) console.warn("[BuzzGuard] weather.json load failed", lastErr);
    return null;
  }

  async function loadSiteConfig(url) {
    try {
      var res = await fetch(url || "data/site-config.json", { cache: "default" });
      if (!res.ok) return null;
      var cfg = await res.json();
      state.siteConfig = cfg && typeof cfg === "object" ? cfg : null;
      return state.siteConfig;
    } catch (_e) {
      return null;
    }
  }

  function resolveSnowApiBase() {
    var cfg = state.siteConfig;
    if (!cfg || typeof cfg.snowApiBase !== "string") return "";
    var base = cfg.snowApiBase.trim();
    if (!base) return "";
    if (base === "same-origin" && global.location && global.location.origin) {
      return global.location.origin.replace(/\/$/, "");
    }
    return base.replace(/\/$/, "");
  }

  function updateFetchRemainingUi() {
    var btn = global.document && global.document.getElementById("btn-fetch-remaining");
    if (!btn) return;
    var show = canUseFetchRemaining();
    btn.hidden = !show;
    btn.disabled = !show;
    if (!show && !state.weatherJsonOk) {
      btn.title = "天気キャッシュ未取得のため、一括取得は無効です";
    } else if (!show && fetchRemainingUsedToday()) {
      btn.title = "本日は利用済みです（JST・1日1回）";
    }
  }

  global.PowderBuzzGuard = {
    state: state,
    burstMode: burstMode,
    allowLiveFetch: allowLiveFetch,
    consumeLiveFetch: consumeLiveFetch,
    shouldShowFetchRemainingButton: shouldShowFetchRemainingButton,
    canUseFetchRemaining: canUseFetchRemaining,
    markFetchRemainingUsed: markFetchRemainingUsed,
    allowJmaProbe: allowJmaProbe,
    consumeJmaProbe: consumeJmaProbe,
    jmaProbeLookbackMin: jmaProbeLookbackMin,
    jmaProbeStepMin: jmaProbeStepMin,
    fetchWeatherJson: fetchWeatherJson,
    loadSiteConfig: loadSiteConfig,
    resolveSnowApiBase: resolveSnowApiBase,
    updateFetchRemainingUi: updateFetchRemainingUi,
    MAX_FETCH_REMAINING_PER_CLICK: MAX_FETCH_REMAINING_PER_CLICK,
  };
})(typeof window !== "undefined" ? window : globalThis);
