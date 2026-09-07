/**
 * JAPOW / japowsearch.com — GA4 + Gumroad funnel events (Phase 0)
 * Events: view_gumroad_cta · click_gumroad
 */
(function () {
  "use strict";

  var id =
    (typeof window.__GA4_MEASUREMENT_ID === "string" && window.__GA4_MEASUREMENT_ID.trim()) ||
    "";
  if (!id || id === "G-XXXXXXXX" || id === "G-PLACEHOLDER") {
    return;
  }

  window.dataLayer = window.dataLayer || [];
  function gtag() {
    window.dataLayer.push(arguments);
  }
  window.gtag = gtag;
  gtag("js", new Date());
  gtag("config", id, { anonymize_ip: true, send_page_view: true });

  var s = document.createElement("script");
  s.async = true;
  s.src = "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(id);
  document.head.appendChild(s);

  function parseUtm() {
    var q = new URLSearchParams(window.location.search);
    return {
      utm_source: q.get("utm_source") || undefined,
      utm_medium: q.get("utm_medium") || undefined,
      utm_campaign: q.get("utm_campaign") || undefined,
    };
  }

  function track(eventName, params) {
    if (typeof window.gtag !== "function") {
      return;
    }
    window.gtag("event", eventName, params || {});
  }

  window.japowAnalytics = {
    measurementId: id,
    track: track,
    trackGumroadCtaView: function (extra) {
      track("view_gumroad_cta", Object.assign({ engagement_type: "view" }, parseUtm(), extra || {}));
    },
    trackGumroadClick: function (extra) {
      track("click_gumroad", Object.assign({ engagement_type: "click" }, parseUtm(), extra || {}));
    },
  };

  document.addEventListener(
    "click",
    function (ev) {
      var anchor = ev.target && ev.target.closest ? ev.target.closest("a[href]") : null;
      if (!anchor) {
        return;
      }
      var href = anchor.getAttribute("href") || "";
      if (!/gumroad\.com/i.test(href)) {
        return;
      }
      window.japowAnalytics.trackGumroadClick({
        link_url: href,
        link_text: (anchor.textContent || "").trim().slice(0, 80),
      });
    },
    true
  );

  function observeGumroadCtas() {
    var nodes = document.querySelectorAll("[data-japow-gumroad-cta]");
    if (!nodes.length || typeof IntersectionObserver !== "function") {
      return;
    }
    var seen = new WeakSet();
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting || seen.has(entry.target)) {
            return;
          }
          seen.add(entry.target);
          window.japowAnalytics.trackGumroadCtaView({
            cta_id: entry.target.getAttribute("data-japow-gumroad-cta") || "unknown",
          });
        });
      },
      { threshold: 0.25 }
    );
    nodes.forEach(function (el) {
      io.observe(el);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", observeGumroadCtas);
  } else {
    observeGumroadCtas();
  }
})();
