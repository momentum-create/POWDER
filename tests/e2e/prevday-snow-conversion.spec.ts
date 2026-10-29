import { test, expect } from "@playwright/test";

const PAGES = [
  { name: "JA", path: "/" },
  { name: "EN", path: "/ski-powder-hunter-en.html" },
];

for (const { name, path } of PAGES) {
  test.describe(`previous-day JMA snow conversion (${name})`, () => {
    test("1 mm of precipitation is about 1 cm of fresh snow", async ({ page }) => {
      await page.goto(path, { waitUntil: "domcontentloaded" });
      await page.waitForFunction(() => typeof jmaHourlyPrecipTempToSnowCm === "function");

      const r = await page.evaluate(() => ({
        cold: jmaHourlyPrecipTempToSnowCm(1, -5),
        freezing: jmaHourlyPrecipTempToSnowCm(1, 0),
        blend: jmaHourlyPrecipTempToSnowCm(1, 2),
        rain: jmaHourlyPrecipTempToSnowCm(5, 4),
        dry: jmaHourlyPrecipTempToSnowCm(0, -3),
        noTemp: jmaHourlyPrecipTempToSnowCm(1, null),
      }));

      expect(r.cold).toBeCloseTo(1, 5);
      expect(r.freezing).toBeCloseTo(1, 5);
      expect(r.blend).toBeCloseTo(0.5, 5);
      expect(r.rain).toBe(0);
      expect(r.dry).toBe(0);
      expect(r.noTemp).toBeNull();
    });

    test("Kutchan 2026-10-28 (12 mm at about 0-4 C) totals under 10 cm", async ({ page }) => {
      await page.goto(path, { waitUntil: "domcontentloaded" });
      await page.waitForFunction(() => typeof sumJmaPrevSnowHourRange === "function");

      const total = await page.evaluate(() => {
        const precip = [0.5, 0.5, 2, 2, 1, 1, 1, 0, 0.5, 0, 0.5, 0.5, 0.5, 0, 0.5, 0, 0, 0, 0, 0, 0, 0, 1, 0.5];
        const temp = [4.6, 2.9, 1.6, 1.5, 0.8, 1.2, 1.3, 1.5, 0.4, 1.0, 1.9, 1.2, 1.2, 1.5, 2.1, 2.5, 2.0, 1.8, 1.5, 1.2, 1.0, 0.5, -0.5, -0.4];
        return sumJmaPrevSnowHourRange(precip, temp, 0, 24);
      });

      expect(total).toBeGreaterThan(5);
      expect(total).toBeLessThan(10);
    });
  });
}
