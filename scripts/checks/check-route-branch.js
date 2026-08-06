#!/usr/bin/env node
/**
 * ROADMAP phase 1 — route branch smoke check (FocusView_FromRanking vs map pin).
 */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const files = ["index.html", "ski-powder-hunter-en.html"].map((f) =>
  path.join(root, f)
);

const required = [
  "function openFocusFromRanking",
  "function openFocusFromMap",
  "opts.focusFromRanking",
  "mobileDetailEntry",
  "useFocusRankingShell",
  "buildFocusViewRankingBlock",
  "!isFocusFromRanking",
  "!useFocusRankingShell",
  "b-glance__verdict",
  "focus-day-chips",
  "scripts/focus-view-ranking.js",
  "openFocusFromRanking(openResortId)",
  "openFocusFromMap(r.id)",
  "if(isMobilePopup && useFocusRankingShell){",
  "contentHtml = mobileTopHtml || contentHtml;",
  "btn-top-sm",
  "showTopView()",
  "topAria: \"ランキングに戻る\"",
  "topAria: \"Back to ranking\"",
  "recenterMapForFromMapDetail",
  "getMobileMapSheetPaddingPx",
  ".leaflet-control-zoom{display:none!important}",
  "display:none!important",
  ".view-map.view-map--focus-ranking .leaflet-popup",
];

const mapMarkerOk = /m\.on\("click",\(\)=>openFocusFromMap\(r\.id\)\)/;

let failed = false;

for (const file of files) {
  const src = fs.readFileSync(file, "utf8");
  const label = path.basename(file);
  for (const token of required) {
    if (!src.includes(token)) {
      console.error(`[FAIL] ${label}: missing "${token}"`);
      failed = true;
    }
  }
  if (!mapMarkerOk.test(src)) {
    console.error(`[FAIL] ${label}: map marker must call openFocusFromMap(r.id)`);
    failed = true;
  }
  if (/m\.on\("click",\(\)=>openFocusFromRanking/.test(src)) {
    console.error(`[FAIL] ${label}: map marker must not call openFocusFromRanking`);
    failed = true;
  }
  if (/pw-card.*selectResort\(/.test(src)) {
    console.error(`[FAIL] ${label}: sidebar pw-card must use openFocusFromMap`);
    failed = true;
  }
  if (/map-detail-sheet--focus-ranking \.popup-btns\{\s*display:grid!important/.test(src)) {
    console.error(`[FAIL] ${label}: focus-ranking must not force popup-btns display:grid`);
    failed = true;
  }
  if (/top-card.*openFocusFromRanking/.test(src)) {
    console.error(`[FAIL] ${label}: top-card should use showMapView, not openFocusFromRanking directly`);
    failed = true;
  }
}

if (failed) {
  process.exit(1);
}
console.log("check-route-branch: OK");
