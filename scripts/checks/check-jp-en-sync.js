#!/usr/bin/env node
/**
 * FocusView_FromRanking — JA/EN structural parity (ROADMAP 5-5).
 */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const ja = fs.readFileSync(path.join(root, "index.html"), "utf8");
const en = fs.readFileSync(path.join(root, "ski-powder-hunter-en.html"), "utf8");

const pairs = [
  ["function openFocusFromRanking", "function openFocusFromRanking"],
  ["function openFocusFromMap", "function openFocusFromMap"],
  ["function buildFocusViewRankingBlock", "function buildFocusViewRankingBlock"],
  ["function setFocusBaMode", "function setFocusBaMode"],
  ["scripts/focus-view-ranking.js", "scripts/focus-view-ranking.js"],
  ["FocusViewRanking.initAfterRender", "FocusViewRanking.initAfterRender"],
  ["!useFocusRankingShell", "!useFocusRankingShell"],
  ["map-detail-sheet--focus-ranking", "map-detail-sheet--focus-ranking"],
  ["view-map--focus-ranking", "view-map--focus-ranking"],
  ["id=\"focus-day-chips\"", "id=\"focus-day-chips\""],
  ["b-glance__signal", "b-glance__signal"],
  ["--signal-go", "--signal-go"],
  ["gap:8px", "gap:8px"],
  ["[lang=\"en\"] .day-chips", "[lang=\"en\"] .day-chips"],
  ["--slot-w:76px", "--slot-w:76px"],
  ["scroll-snap-type:x mandatory", "scroll-snap-type:x mandatory"],
  ["FV_SLOT_UI_JA", "FV_SLOT_UI_EN"],
  ["FV_SLOT_ARIA_JA", "FV_SLOT_ARIA_EN"],
  ["prefers-reduced-motion", "prefers-reduced-motion"],
  ["min-height:44px", "min-height:44px"],
  ["btn-top-sm", "btn-top-sm"],
  ["showTopView()", "showTopView()"],
  ["recenterMapForFromMapDetail", "recenterMapForFromMapDetail"],
  ["getMobileMapSheetPaddingPx", "getMobileMapSheetPaddingPx"],
  [".leaflet-control-zoom{display:none!important}", ".leaflet-control-zoom{display:none!important}"],
];

let failed = false;
for (const [jaToken, enToken] of pairs) {
  const inJa = ja.includes(jaToken);
  const inEn = en.includes(enToken);
  if (!inJa || !inEn) {
    console.error(`[FAIL] parity: JA=${inJa} EN=${inEn} — ${jaToken} / ${enToken}`);
    failed = true;
  }
}

if (failed) process.exit(1);
console.log("check-jp-en-sync: OK (" + pairs.length + " FocusView parity checks)");
