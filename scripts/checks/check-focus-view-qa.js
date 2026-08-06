#!/usr/bin/env node
/**
 * FocusView_FromRanking — 24-point regression + BUG-07 SR + 320/390 overflow.
 * Usage: node scripts/checks/check-focus-view-qa.js [baseUrl]
 * Default base: http://127.0.0.1:4173
 */
const { chromium } = require("playwright");
const path = require("path");

const ROOT = path.resolve(__dirname, "..", "..");
const BASE = (process.argv[2] || "http://127.0.0.1:4173").replace(/\/$/, "");
const RESORT_ID = 1;

function mockDaily() {
  const hourly = new Array(24 * 7).fill(0);
  for (let i = 0; i < hourly.length; i++) hourly[i] = i % 6 === 0 ? 2.5 : 0.5;
  const rain = new Array(24 * 7).fill(0);
  rain[18] = 3;
  rain[19] = 4;
  rain[20] = 2;
  const days = 7;
  return {
    snowfall_sum: Array.from({ length: days }, (_, d) => 8 + d * 2),
    temperature_2m_min: Array.from({ length: days }, () => -8),
    temperature_2m_max: Array.from({ length: days }, () => -2),
    wind_speed_10m_max: Array.from({ length: days }, () => 12),
    wind_direction_10m_dominant: Array.from({ length: days }, () => 270),
    hourly_snowfall: hourly,
    hourly_rain: rain,
    hourly_temperature: new Array(24 * 7).fill(-5),
    hourly_wind_speed: new Array(24 * 7).fill(8),
    hourly_wind_direction: new Array(24 * 7).fill(270),
  };
}

async function bootFocus(page, file, width, height) {
  await page.setViewportSize({ width, height });
  await page.goto(`${BASE}/${file}`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForFunction(() => typeof RESORT_MAP !== "undefined", null, { timeout: 30000 });
  await page.evaluate(
    ({ id, daily }) => {
      weatherCache[id] = daily;
      targetDayOffset = 0;
      if (typeof showMapView === "function") showMapView(id);
    },
    { id: RESORT_ID, daily: mockDaily() }
  );
  await page.waitForSelector("#map-detail-sheet.map-detail-sheet--focus-ranking #focus-day-chips", {
    timeout: 20000,
  });
  await page.waitForTimeout(500);
}

async function measure(page) {
  return page.evaluate(() => {
    const screen = document.querySelector("#map-detail-sheet-body .map-focus-screen");
    const chips = document.querySelector("#focus-day-chips");
    const tl = document.querySelector(".tl-scroll");
    const glance = document.querySelector("#b-glance");
    const l2 = document.querySelector("#l2-block");
    const strip = document.querySelector(".map-strip");
    const tabs = chips ? chips.querySelectorAll('[role="tab"]') : [];
    const selected = chips
      ? Array.from(tabs).map((t) => t.getAttribute("aria-selected"))
      : [];
    const styles = chips ? getComputedStyle(chips) : null;
    const enStyles = screen && screen.getAttribute("lang") === "en" ? getComputedStyle(screen) : null;
    const slotLabels = Array.from(document.querySelectorAll(".tl-slot[role=listitem]")).map((el) =>
      el.getAttribute("aria-label")
    );
    let minFont = 99;
    document.querySelectorAll("#map-detail-sheet-body .map-focus-screen *").forEach((el) => {
      const fs = parseFloat(getComputedStyle(el).fontSize);
      if (fs > 0 && fs < minFont) minFont = fs;
    });
    const body = document.querySelector("#map-detail-sheet-body");
    const overflowX =
      body && body.scrollWidth > body.clientWidth + 1 ? body.scrollWidth - body.clientWidth : 0;
    const docOverflow = document.documentElement.scrollWidth > window.innerWidth + 1;
    const legacySelectors = [
      ".popup-pw",
      ".popup-operating-row",
      ".popup-detail-row",
      ".popup-nearby",
      ".popup-feedback",
      ".popup-btns",
      ".popup-nav",
      ".loading-row",
    ];
    const legacyVisible = legacySelectors.filter((sel) => {
      const el = document.querySelector(`#map-detail-sheet-body ${sel}`);
      if (!el) return false;
      const cs = getComputedStyle(el);
      return cs.display !== "none" && cs.visibility !== "hidden";
    });
    const scroller = document.querySelector("#map-detail-sheet .map-detail-sheet__scroller");
    const straySiblings = scroller
      ? Array.from(scroller.children).filter((el) => {
          if (el.classList.contains("map-focus-screen")) return false;
          const cs = getComputedStyle(el);
          return cs.display !== "none" && cs.visibility !== "hidden";
        }).length
      : 0;
    const verdictEl = document.querySelector("#glance-verdict");
    const detailEl = document.querySelector("#glance-detail");
    const topBtn = document.querySelector(".btn-top-sm");
    let topBtnVisible = null;
    if (topBtn) {
      const cs = getComputedStyle(topBtn);
      topBtnVisible = cs.display !== "none" && cs.visibility !== "hidden";
    }
    let verdictFirst = null;
    let verdictLarger = null;
    if (verdictEl && detailEl) {
      const vRect = verdictEl.getBoundingClientRect();
      const dRect = detailEl.getBoundingClientRect();
      verdictFirst = vRect.top <= dRect.top + 1;
      verdictLarger =
        parseFloat(getComputedStyle(verdictEl).fontSize) >
        parseFloat(getComputedStyle(detailEl).fontSize);
    }
    return {
      chipsGap: styles ? styles.gap : null,
      chipsScrollW: chips ? chips.scrollWidth : 0,
      chipsClient: chips ? chips.clientWidth : 0,
      chipsSnap: styles ? styles.scrollSnapType : null,
      tlOverflow: tl ? tl.scrollWidth > tl.clientWidth + 1 : false,
      tlScrollW: tl ? tl.scrollWidth : 0,
      tlClient: tl ? tl.clientWidth : 0,
      tabCount: tabs.length,
      ariaSelectedAll: selected.length === 5 && selected.every((v) => v === "true" || v === "false"),
      dayChipsAria: chips ? chips.getAttribute("aria-label") : null,
      l2Hidden: l2 ? l2.hidden : null,
      glanceHidden: glance ? glance.hidden : null,
      glanceClass: glance ? glance.className : "",
      verdict: document.querySelector("#glance-verdict")?.textContent || "",
      stripTop: strip ? strip.getBoundingClientRect().top : null,
      minFont,
      slotW: enStyles ? enStyles.getPropertyValue("--slot-w").trim() : null,
      slotLabels,
      overflowX,
      docOverflow,
      legacyVisible,
      straySiblings,
      verdictFirst,
      verdictLarger,
      topBtnVisible,
      topBtnMinHeight: topBtn ? getComputedStyle(topBtn).minHeight : null,
    };
  });
}

async function runCase(page, file, vp, caseId) {
  const isJa = file.includes("-en") ? false : true;
  const label = `${vp.w}x${vp.h} ${isJa ? "JA" : "EN"} C${caseId}`;
  const m0 = await measure(page);

  if (caseId === 1) {
    const chipOverflow = m0.chipsScrollW > m0.chipsClient + 2;
    if (isJa) {
      if (m0.docOverflow || m0.overflowX > 2) throw new Error(`${label}: horizontal overflow`);
      if (vp.w >= 700 && chipOverflow) throw new Error(`${label}: JA chips should fit at 700`);
    } else {
      if (m0.chipsGap !== "8px") throw new Error(`${label}: gap=${m0.chipsGap}`);
      if (vp.w <= 390 && !m0.chipsSnap.includes("mandatory")) {
        throw new Error(`${label}: EN snap=${m0.chipsSnap}`);
      }
    }
    if (m0.chipsGap !== "8px") throw new Error(`${label}: gap=${m0.chipsGap}`);
    return { label, pass: true, m0 };
  }

  if (caseId === 2) {
    const chip = page.locator('#focus-day-chips [data-day-offset="1"]');
    await chip.click();
    await page.waitForTimeout(300);
    const m1 = await measure(page);
    const sel = await page.evaluate(() => {
      const tabs = document.querySelectorAll("#focus-day-chips [role=tab]");
      return Array.from(tabs).map((t, i) => ({
        i,
        sel: t.getAttribute("aria-selected"),
        offset: t.getAttribute("data-day-offset"),
      }));
    });
    const tomorrow = sel.find((s) => s.offset === "1");
    if (!tomorrow || tomorrow.sel !== "true") throw new Error(`${label}: aria-selected not on tomorrow`);
    if (!m1.verdict) throw new Error(`${label}: empty verdict after day switch`);
    return { label, pass: true, verdict: m1.verdict };
  }

  if (caseId === 3) {
    if (vp.w <= 390 && isJa && !m0.tlOverflow) {
      throw new Error(`${label}: JA tl-scroll should overflow at ${vp.w}`);
    }
    if (vp.w >= 700 && isJa && m0.tlOverflow) {
      throw new Error(`${label}: JA tl-scroll should fit at 700`);
    }
    return { label, pass: true };
  }

  if (caseId === 4) {
    if (m0.tabCount !== 5) throw new Error(`${label}: tabCount=${m0.tabCount}`);
    if (!m0.ariaSelectedAll) throw new Error(`${label}: aria-selected incomplete`);
    if (m0.minFont < 11) throw new Error(`${label}: minFont=${m0.minFont}`);
    if (isJa && m0.dayChipsAria !== "対象日") throw new Error(`${label}: aria=${m0.dayChipsAria}`);
    if (!isJa && m0.dayChipsAria !== "Target days") throw new Error(`${label}: aria=${m0.dayChipsAria}`);
    if (!isJa && m0.slotW !== "76px") throw new Error(`${label}: --slot-w=${m0.slotW}`);
    if (!m0.l2Hidden) throw new Error(`${label}: l2 not hidden`);
    if (m0.glanceHidden) throw new Error(`${label}: glance hidden`);
    if (!m0.glanceClass.includes("b-glance--")) throw new Error(`${label}: no glance level class`);
    if (m0.legacyVisible && m0.legacyVisible.length) {
      throw new Error(`${label}: legacy popup visible: ${m0.legacyVisible.join(",")}`);
    }
    if (m0.straySiblings) throw new Error(`${label}: stray scroller siblings=${m0.straySiblings}`);
    if (m0.verdictFirst === false) throw new Error(`${label}: verdict not above detail`);
    if (m0.verdictLarger === false) throw new Error(`${label}: verdict not larger than detail`);
    if (m0.topBtnVisible !== true) throw new Error(`${label}: btn-top-sm not visible`);
    if (m0.topBtnMinHeight !== "44px") throw new Error(`${label}: btn-top-sm min-height=${m0.topBtnMinHeight}`);
    return { label, pass: true };
  }

  throw new Error(`unknown case ${caseId}`);
}

async function checkBug07(page, file) {
  const labels = await page.evaluate(() =>
    Array.from(document.querySelectorAll('.tl-slot[role="listitem"]')).map((el) =>
      el.getAttribute("aria-label")
    )
  );
  const isJa = !file.includes("-en");
  const wet = labels.filter((l) => l && (l.includes("雨") || l.toLowerCase().includes("rain")));
  if (!wet.length) throw new Error("BUG-07: no wet slot aria-labels found");
  for (const l of wet) {
    if (isJa && !/、/.test(l)) throw new Error(`BUG-07 JA incomplete: ${l}`);
    if (!isJa && !/,/.test(l)) throw new Error(`BUG-07 EN incomplete: ${l}`);
  }
  return wet[0];
}

async function checkOverflow320(page, file) {
  await bootFocus(page, file, 320, 568);
  const m = await measure(page);
  if (m.docOverflow || m.overflowX > 2) {
    throw new Error(`320 overflow: doc=${m.docOverflow} body=${m.overflowX}px`);
  }
  if (m.chipsGap !== "8px") throw new Error(`320 gap=${m.chipsGap}`);
  if (m.legacyVisible && m.legacyVisible.length) {
    throw new Error(`320 legacy visible: ${m.legacyVisible.join(",")}`);
  }
  if (m.straySiblings) throw new Error(`320 stray scroller siblings=${m.straySiblings}`);
  return m;
}

async function checkRankingEntry320390(page, file) {
  for (const w of [320, 390]) {
    await page.setViewportSize({ width: w, height: 844 });
    await page.goto(`${BASE}/${file}`, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForFunction(() => typeof showMapView === "function", null, { timeout: 30000 });
    await page.evaluate(
      ({ id, daily }) => {
        weatherCache[id] = daily;
        targetDayOffset = 0;
        showMapView(id);
      },
      { id: RESORT_ID, daily: mockDaily() }
    );
    await page.waitForSelector("#map-detail-sheet.map-detail-sheet--focus-ranking", { timeout: 20000 });
    await page.waitForTimeout(400);
    const m = await measure(page);
    if (m.legacyVisible && m.legacyVisible.length) {
      throw new Error(`${w} ranking legacy: ${m.legacyVisible.join(",")}`);
    }
    if (m.straySiblings) throw new Error(`${w} ranking stray siblings=${m.straySiblings}`);
    if (m.verdictFirst === false) throw new Error(`${w} verdict not first`);
    if (m.verdictLarger === false) throw new Error(`${w} verdict not larger`);
  }
}

async function checkTopButtonNav(page, file) {
  await bootFocus(page, file, 390, 844);
  const before = await page.evaluate(() => ({
    topDisplay: document.getElementById("view-top")?.style.display,
    mapDisplay: document.getElementById("view-map")?.style.display,
  }));
  await page.click(".btn-top-sm");
  await page.waitForTimeout(300);
  const after = await page.evaluate(() => ({
    topDisplay: document.getElementById("view-top")?.style.display,
    mapDisplay: document.getElementById("view-map")?.style.display,
    sheetOpen: document.getElementById("map-detail-sheet")?.classList.contains("map-detail-sheet--open"),
  }));
  if (after.topDisplay !== "flex") throw new Error("showTopView did not show view-top");
  if (after.mapDisplay !== "none") throw new Error("showTopView did not hide view-map");
  if (after.sheetOpen) throw new Error("showTopView left detail sheet open");
}

async function checkMapPinNoTopButton(page, file) {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${BASE}/${file}`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForFunction(() => typeof showMapView === "function", null, { timeout: 30000 });
  await page.evaluate(
    ({ id, daily }) => {
      weatherCache[id] = daily;
      targetDayOffset = 0;
      showMapView();
    },
    { id: RESORT_ID, daily: mockDaily() }
  );
  await page.waitForTimeout(500);
  await page.evaluate(
    ({ id }) => {
      openFocusFromMap(id);
    },
    { id: RESORT_ID }
  );
  await page.waitForTimeout(800);
  const hasTop = await page.evaluate(() => !!document.querySelector(".btn-top-sm"));
  if (hasTop) throw new Error("map pin path must not render btn-top-sm");
}

async function main() {
  const viewports = [
    { w: 375, h: 812 },
    { w: 390, h: 844 },
    { w: 700, h: 900 },
  ];
  const files = ["index.html", "ski-powder-hunter-en.html"];
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  let passed = 0;
  const failures = [];

  try {
    for (const file of files) {
      for (const vp of viewports) {
        await bootFocus(page, file, vp.w, vp.h);
        for (let c = 1; c <= 4; c++) {
          try {
            await runCase(page, file, vp, c);
            passed++;
            process.stdout.write(".");
          } catch (e) {
            failures.push(e.message);
          }
          if (c < 4) await bootFocus(page, file, vp.w, vp.h);
        }
      }
      await bootFocus(page, file, 375, 812);
      try {
        const sample = await checkBug07(page, file);
        passed++;
        process.stdout.write("7");
      } catch (e) {
        failures.push(e.message);
      }
    }

    for (const file of files) {
      try {
        await checkOverflow320(page, file);
        passed++;
        process.stdout.write("O");
      } catch (e) {
        failures.push(`${file} 320: ${e.message}`);
      }
      try {
        await checkRankingEntry320390(page, file);
        passed++;
        process.stdout.write("R");
      } catch (e) {
        failures.push(`${file} ranking 320/390: ${e.message}`);
      }
      try {
        await checkTopButtonNav(page, file);
        passed++;
        process.stdout.write("T");
      } catch (e) {
        failures.push(`${file} top nav: ${e.message}`);
      }
      try {
        await checkMapPinNoTopButton(page, file);
        passed++;
        process.stdout.write("M");
      } catch (e) {
        failures.push(`${file} map pin no-top: ${e.message}`);
      }
    }
  } finally {
    await context.close();
    await browser.close();
  }

  console.log("");
  const expected = 24 + 2 + 2 + 2 + 2 + 2;
  if (failures.length) {
    console.error(`check-focus-view-qa: ${passed}/${expected} passed`);
    failures.forEach((f) => console.error("  FAIL:", f));
    process.exit(1);
  }
  console.log(`check-focus-view-qa: ${passed}/${expected} OK (24 matrix + BUG-07×2 + 320×2 + ranking 320/390×2 + top-nav×2 + map-pin×2)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
