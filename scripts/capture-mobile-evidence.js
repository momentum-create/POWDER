const { chromium } = require("playwright");
const path = require("path");

const BASE_URL = "http://127.0.0.1:4173/";
const OUT_DIR = path.resolve(__dirname, "..", "docs", "qa", "evidence", "2026-03-23-mobile-pass");

async function clickByLabels(page, labels) {
  for (const label of labels) {
    const button = page.getByRole("button", { name: label }).first();
    if ((await button.count()) > 0) {
      await button.click({ timeout: 3000 });
      return true;
    }
  }
  return false;
}

async function openTop(page) {
  await clickByLabels(page, ["TOP", "Top"]);
}

async function openMap(page) {
  await clickByLabels(page, ["マップ", "Map"]);
}

async function setDay(page, mode) {
  if (mode === "today") {
    await clickByLabels(page, ["今日", "Today"]);
    return;
  }
  if (mode === "tomorrow") {
    await clickByLabels(page, ["明日", "Tomorrow", "Tmrw"]);
    return;
  }
  if (mode === "plus3") {
    await clickByLabels(page, ["+3日", "+3d", "+3"]);
    return;
  }
}

async function capture(page, viewport, mode, filename) {
  await page.setViewportSize(viewport);
  await page.goto(BASE_URL, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1800);
  await openTop(page);
  await page.waitForTimeout(600);
  await setDay(page, mode);
  await page.waitForTimeout(1200);
  await page.screenshot({ path: path.join(OUT_DIR, filename), fullPage: true });
}

async function captureMap(page) {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(BASE_URL, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1800);
  await openMap(page);
  await page.waitForTimeout(1200);
  await page.screenshot({
    path: path.join(OUT_DIR, "map-snow-toggle-390.png"),
    fullPage: true,
  });
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  try {
    await capture(page, { width: 375, height: 812 }, "today", "top-today-375.png");
    await capture(page, { width: 390, height: 844 }, "tomorrow", "top-tomorrow-390.png");
    await capture(page, { width: 700, height: 900 }, "plus3", "top-plus3-700.png");
    await captureMap(page);
  } finally {
    await context.close();
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
