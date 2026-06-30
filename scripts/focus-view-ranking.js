/**
 * FocusView_FromRanking — mock-016 DOM helpers (ranking route only).
 * Loaded by ski-powder-hunter*.html; expects page globals for weather/resort data.
 */
(function (global) {
  "use strict";

  var SIGNAL = {
    go: "#3ecf8e",
    caution: "#e8c547",
    nogo: "#e86a6a",
  };

  /** BUG-10: WCAG AA 4.5:1 @ 11px bold — #ffebeb on #7a2e2e ≈ 5.8:1 */
  var BADGE_FG = "#ffebeb";
  var BADGE_BG = "rgba(122, 46, 46, 0.92)";

  /** snow-data v1 — glance 判定閾値（変更は handoff snow-data.md と同期） */
  var GLANCE_THRESHOLDS = {
    SCORE_NOGO: 35,
    SCORE_CAUTION: 55,
    RAIN_WET: 0.3,
    RAIN_DOMINANT: 0.7,
  };

  function escapeAttr(s) {
    return String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/</g, "&lt;");
  }

  /**
   * BUG-07: wet slot SR — rain state in aria-label complete form.
   */
  function buildSlotAriaLabel(ariaBase, snowCm, rainRatio, totalWater, missing, isJa) {
    var isWet = totalWater >= 0.1 && rainRatio > 0.3;
    var isRainDominant = rainRatio > 0.7;
    var state;
    if (missing || totalWater < 0.1) {
      state = isJa ? "降雪なし" : "no precipitation";
    } else if (isRainDominant) {
      state = isJa ? "雨" : "rain";
    } else if (isWet) {
      state = isJa ? "雪と雨" : "snow and rain";
    } else {
      state = isJa ? "雪" : "snow";
    }
    var mmVal =
      missing || totalWater < 0.1
        ? isJa
          ? "0 mm"
          : "0 mm"
        : snowCm.toFixed(snowCm >= 10 ? 0 : 1) + " mm";
    return isJa
      ? ariaBase + "、" + state + "、" + mmVal
      : ariaBase + ", " + state + ", " + mmVal;
  }

  /**
   * Glance verdict from powder score + rain (snow-data v1).
   */
  function computeGlanceState(dayOffset, daily, r, isJa, helpers) {
    var h = helpers || {};
    var getSnowfallForDisplay = h.getSnowfallForDisplay;
    var getSnowfallAdjusted = h.getSnowfallAdjusted;
    var getPrevDayDisplayForResort = h.getPrevDayDisplayForResort;
    var calcPowderScore = h.calcPowderScore;
    var getDayIndex = h.getDayIndex;
    var targetDayOffset = h.targetDayOffset != null ? h.targetDayOffset : dayOffset;

    var ps =
      typeof calcPowderScore === "function"
        ? calcPowderScore(daily, r, dayOffset)
        : null;
    var score = ps && ps.score != null ? ps.score : 50;

    var rainLevel = 0;
    if (daily && daily.hourly_snowfall) {
      var dayIdx =
        typeof getDayIndex === "function"
          ? getDayIndex(daily, dayOffset)
          : dayOffset;
      var snowArr = daily.hourly_snowfall;
      var rainArr = daily.hourly_rain || [];
      var snowMmDay = 0;
      var rainMmDay = 0;
      var baseDay = dayIdx * 24;
      for (var i = baseDay; i < baseDay + 24 && i < snowArr.length; i++) {
        snowMmDay += snowArr[i] || 0;
        rainMmDay += rainArr[i] || 0;
      }
      var totalMm = snowMmDay + rainMmDay;
      if (totalMm > 0) {
        var ratio = rainMmDay / totalMm;
        if (ratio > GLANCE_THRESHOLDS.RAIN_DOMINANT) rainLevel = 2;
        else if (ratio > GLANCE_THRESHOLDS.RAIN_WET) rainLevel = 1;
      }
    }

    var level = "go";
    if (score < GLANCE_THRESHOLDS.SCORE_NOGO || rainLevel >= 2) level = "nogo";
    else if (score < GLANCE_THRESHOLDS.SCORE_CAUTION || rainLevel >= 1) level = "caution";

    var dayLabels = isJa
      ? ["今日", "明日", "明後日", "+3日", "+4日"]
      : ["Today", "Tomorrow", "Day +2", "Day +3", "Day +4"];
    var dayRef = dayLabels[dayOffset] || (isJa ? "+" + dayOffset + "日" : "Day +" + dayOffset);

    var verdict;
    if (level === "go") {
      verdict = isJa ? "条件良好（参考）" : "Favorable (ref.)";
    } else if (level === "nogo") {
      verdict = isJa ? dayRef + "は参考上厳しめ" : dayRef + " unfavorable (ref.)";
    } else {
      verdict = isJa ? dayRef + "は参考上注意" : dayRef + " caution (ref.)";
    }

    var daySnow =
      typeof getSnowfallAdjusted === "function"
        ? getSnowfallAdjusted(daily, r, dayOffset)
        : null;
    if (daySnow == null) daySnow = 0;
    var jpdPop =
      typeof getPrevDayDisplayForResort === "function"
        ? getPrevDayDisplayForResort(r.id, dayOffset, daily, r)
        : null;
    var priorCm = jpdPop && jpdPop.total != null ? jpdPop.total : null;
    var todayStr = daySnow.toFixed(1);
    var priorStr = priorCm != null ? priorCm.toFixed(1) : "—";

    var detailHtml = isJa
      ? '当日 <span class="l2-v">' +
        todayStr +
        ' cm</span> · 前日 <span class="l2-v">' +
        priorStr +
        " cm</span>"
      : 'Selected day <span class="l2-v">' +
        todayStr +
        ' cm</span> · Prior day <span class="l2-v">' +
        priorStr +
        " cm</span>";

    var rainBadge = ["", isJa ? "雪＋雨" : "Snow + rain", isJa ? "雨優勢" : "Rain-dominant"];
    var showRain = rainLevel > 0;
    var badgeText = showRain ? rainBadge[rainLevel] || "" : "";

    return {
      level: level,
      verdict: verdict,
      detailHtml: detailHtml,
      showRain: showRain,
      badgeText: badgeText,
      rainLevel: rainLevel,
    };
  }

  /**
   * S-4: FromMap モバイルシート用 glance 一行（016 シェルは使わない）。
   */
  function buildFromMapGlanceHtml(dayOffset, daily, r, isJa, helpers) {
    var state = computeGlanceState(dayOffset, daily, r, isJa, helpers);
    if (!state) return "";
    var badge = state.showRain && state.badgeText
      ? '<span class="b-glance__badge">' + escapeAttr(state.badgeText) + "</span>"
      : '<span class="b-glance__badge" hidden></span>';
    return (
      '<div class="b-glance b-glance--frommap b-glance--' +
      state.level +
      '" aria-live="polite">' +
      '<div class="b-glance__signal" aria-hidden="true"></div>' +
      '<div class="b-glance__body">' +
      '<div class="b-glance__main">' +
      '<p class="b-glance__verdict">' +
      escapeAttr(state.verdict) +
      "</p>" +
      '<p class="b-glance__detail">' +
      state.detailHtml +
      "</p>" +
      "</div>" +
      badge +
      "</div></div>"
    );
  }

  function applyGlanceToDom(glanceEl, state) {
    if (!glanceEl || !state) return;
    glanceEl.classList.remove("b-glance--go", "b-glance--caution", "b-glance--nogo");
    glanceEl.classList.add("b-glance--" + state.level);
    var verdictEl = glanceEl.querySelector(".b-glance__verdict");
    var detailEl = glanceEl.querySelector(".b-glance__detail");
    var badgeEl = glanceEl.querySelector(".b-glance__badge");
    if (verdictEl) verdictEl.textContent = state.verdict;
    if (detailEl) detailEl.innerHTML = state.detailHtml;
    if (badgeEl) {
      badgeEl.textContent = state.badgeText || "";
      badgeEl.hidden = !state.showRain;
    }
  }

  function initDayChipTabs(tablistEl, onSelectDay) {
    if (!tablistEl) return;
    var tabs = tablistEl.querySelectorAll('[role="tab"]');
    if (!tabs.length) return;

    function selectTab(index, focus, fireCallback) {
      if (index < 0 || index >= tabs.length) return;
      tabs.forEach(function (tab, i) {
        var selected = i === index;
        tab.setAttribute("aria-selected", selected ? "true" : "false");
        tab.tabIndex = selected ? 0 : -1;
      });
      if (fireCallback !== false && typeof onSelectDay === "function") onSelectDay(index);
      if (focus) tabs[index].focus();
    }

    tabs.forEach(function (tab, index) {
      tab.addEventListener("click", function () {
        selectTab(index, false, true);
      });
      tab.addEventListener("keydown", function (e) {
        var next = index;
        if (e.key === "ArrowRight" || e.key === "ArrowDown") {
          next = (index + 1) % tabs.length;
        } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
          next = (index - 1 + tabs.length) % tabs.length;
        } else if (e.key === "Home") {
          next = 0;
        } else if (e.key === "End") {
          next = tabs.length - 1;
        } else {
          return;
        }
        e.preventDefault();
        selectTab(next, true, true);
      });
    });

    var selectedIdx = 0;
    tabs.forEach(function (tab, i) {
      if (tab.getAttribute("aria-selected") === "true") selectedIdx = i;
    });
    selectTab(selectedIdx, false, false);
  }

  /**
   * After #map-detail-sheet-body gets FocusView HTML.
   */
  function initAfterRender(resortId, helpers) {
    if (typeof global.setFocusBaMode === "function") {
      global.setFocusBaMode("b");
    }
    var screen = document.querySelector("#map-detail-sheet-body .map-focus-screen");
    if (!screen) return;

    var glance = screen.querySelector("#b-glance");
    var isJa = (screen.getAttribute("lang") || "ja").indexOf("ja") === 0;
    var daily = helpers && helpers.weatherCache
      ? helpers.weatherCache[resortId]
      : null;
    var r = helpers && helpers.resortMap ? helpers.resortMap[resortId] : null;
    var dayOffset =
      helpers && helpers.targetDayOffset != null
        ? helpers.targetDayOffset
        : typeof global.targetDayOffset !== "undefined"
          ? global.targetDayOffset
          : 0;

    if (glance && daily && r && daily !== "loading") {
      var state = computeGlanceState(dayOffset, daily, r, isJa, helpers);
      applyGlanceToDom(glance, state);
    }

    var tablist = screen.querySelector("#focus-day-chips");
    if (tablist) {
      initDayChipTabs(tablist, function (offset) {
        if (typeof global.setTargetDayOffset === "function") {
          global.setTargetDayOffset(offset);
        }
        if (typeof global.openFocusFromRanking === "function") {
          global.openFocusFromRanking(resortId, { noMove: true });
        }
      });
    }
  }

  global.FocusViewRanking = {
    SIGNAL: SIGNAL,
    BADGE_FG: BADGE_FG,
    BADGE_BG: BADGE_BG,
    GLANCE_THRESHOLDS: GLANCE_THRESHOLDS,
    buildSlotAriaLabel: buildSlotAriaLabel,
    buildFromMapGlanceHtml: buildFromMapGlanceHtml,
    computeGlanceState: computeGlanceState,
    applyGlanceToDom: applyGlanceToDom,
    initDayChipTabs: initDayChipTabs,
    initAfterRender: initAfterRender,
    escapeAttr: escapeAttr,
  };
})(typeof window !== "undefined" ? window : globalThis);
