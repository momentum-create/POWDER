(function () {
  var id =
    (typeof window.__GA4_MEASUREMENT_ID === "string" && window.__GA4_MEASUREMENT_ID.trim()) ||
    "";
  if (!id || id === "G-XXXXXXXX" || id === "G-PLACEHOLDER") return;

  window.dataLayer = window.dataLayer || [];
  function gtag() {
    window.dataLayer.push(arguments);
  }
  window.gtag = gtag;
  gtag("js", new Date());
  gtag("config", id, { anonymize_ip: true });

  var s = document.createElement("script");
  s.async = true;
  s.src = "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(id);
  document.head.appendChild(s);
})();
