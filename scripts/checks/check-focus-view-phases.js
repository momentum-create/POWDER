#!/usr/bin/env node
/**
 * ROADMAP 5-1〜5-5 static DoD markers (mock-016 .device-screen → production).
 */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const files = ["index.html", "ski-powder-hunter-en.html"].map((f) =>
  path.join(root, f)
);

const phases = {
  "5-1": [
    "function openFocusFromRanking",
    "function openFocusFromMap",
    "!useFocusRankingShell",
    "!isFocusFromRanking",
  ],
  "5-2": [
    "map-focus-screen",
    "map-strip",
    "close-fab",
    "height:72px",
    "class=\"sheet\"",
    "l1-head",
    "btn-next-sm",
    "btn-top-sm",
    "showTopView()",
  ],
  "5-3": [
    "b-glance__verdict",
    "b-glance__signal",
    "b-glance--go",
    "focus-day-chips",
    "day-chip__cal",
    "gap:8px",
    "computeGlanceState",
    "buildSlotAriaLabel",
  ],
  "5-4": [
    "id=\"l2-block\" hidden",
    "tl-legend",
    "tl-scroll",
    "tl-slot",
    "band-prev",
    "setFocusBaMode",
  ],
  "5-5": [
    '[lang="en"]',
    "--slot-w:76px",
    "-webkit-line-clamp:2",
    "prefers-reduced-motion",
    "focus-visible",
  ],
};

let failed = false;
for (const file of files) {
  const src = fs.readFileSync(file, "utf8");
  const label = path.basename(file);
  for (const [phase, tokens] of Object.entries(phases)) {
    for (const token of tokens) {
      if (!src.includes(token)) {
        console.error(`[FAIL] ${label} ${phase}: missing "${token}"`);
        failed = true;
      }
    }
  }
}

if (failed) process.exit(1);
console.log("check-focus-view-phases: OK (5-1〜5-5 markers in JA+EN)");
