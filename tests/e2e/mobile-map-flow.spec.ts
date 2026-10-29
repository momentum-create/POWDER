import { test, expect, type Page } from "@playwright/test";

type LocalePack = {
  html: string;
  toMap: RegExp;
  closeSearch: RegExp;
  today: string;
  tomorrow: string;
  listBtn: RegExp;
};

const JA: LocalePack = {
  html: "/",
  toMap: /マップで全ゲレンデを見る/,
  closeSearch: /^閉じる$/,
  today: "今日",
  tomorrow: "明日",
  listBtn: /^一覧$/,
};

const EN: LocalePack = {
  html: "/ski-powder-hunter-en.html",
  toMap: /View all resorts on map/i,
  closeSearch: /^Close$/,
  today: "Today",
  tomorrow: "Tmrw",
  listBtn: /^List$/,
};

async function enterMap(page: Page, pack: LocalePack) {
  await page.goto(pack.html, { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: pack.toMap }).click();
  const viewMap = page.locator("#view-map");
  await expect(viewMap).toBeVisible();
  await expect(page.locator("#map.leaflet-container")).toBeVisible({ timeout: 20_000 });
}

async function openSearch(page: Page) {
  await page.locator("#map-search-fab").click();
  const overlay = page.locator("#map-search-overlay");
  await expect(overlay).toHaveClass(/is-open/);
  await expect(overlay).toBeVisible();
}

test.describe("mobile map flows (JA)", () => {
  const pack = JA;

  test("1) map chrome sits over the map", async ({ page }) => {
    await enterMap(page, pack);
    const stack = page.locator("#map-mock009-stack");
    await expect(stack).toBeVisible();
    const mapStage = page.locator(".map-stage");
    const mapBox = await mapStage.boundingBox();
    const stackBox = await stack.boundingBox();
    expect(mapBox).toBeTruthy();
    expect(stackBox).toBeTruthy();
    expect(mapBox!.height).toBeGreaterThan(stackBox!.height * 0.8);
    await expect(page.locator("#map-search-overlay")).toBeHidden();
    await expect(page.locator("#view-map .search-fab")).toBeVisible();
  });

  test("2) date rail — today and tomorrow", async ({ page }) => {
    await enterMap(page, pack);
    const rail = page.locator("#map-date-btns .date-card:not([disabled])");
    await expect(rail).toHaveCount(7);
    for (const label of [pack.today, pack.tomorrow]) {
      const card = rail.filter({ hasText: label });
      await card.click();
      await expect(card).toHaveClass(/is-active/);
    }
  });

  test("3) search overlay open/close", async ({ page }) => {
    await enterMap(page, pack);
    await expect(page.locator("#map-search-overlay")).toBeHidden();
    await openSearch(page);
    await page.locator("#map-search-overlay-close").click();
    const overlay = page.locator("#map-search-overlay");
    await expect(overlay).not.toHaveClass(/is-open/);
    await expect(overlay).toBeHidden();
  });

  test("4) JMA toggle is desktop-only on a phone", async ({ page }) => {
    await enterMap(page, pack);
    await expect(page.locator("#jma-toggle")).toBeHidden();
  });

  test("5) pin select → detail sheet → close", async ({ page }) => {
    await enterMap(page, pack);
    await page.evaluate(() => {
      // @ts-expect-error app globals
      selectResort(1, { noMove: true });
    });
    const sheet = page.locator("#map-detail-sheet");
    await expect(sheet).toHaveClass(/map-detail-sheet--open/);
    await page.locator(".map-detail-sheet__close--floating").click();
    await expect(sheet).not.toHaveClass(/map-detail-sheet--open/);
  });

  test("6) back to ranking list", async ({ page }) => {
    await enterMap(page, pack);
    await page.getByRole("button", { name: pack.listBtn }).click();
    await expect(page.locator("#view-top")).toBeVisible();
    await expect(page.locator("#view-map")).toBeHidden();
  });
});

test.describe("mobile map flows (EN)", () => {
  const pack = EN;

  test("7) EN equivalent journey", async ({ page }) => {
    await enterMap(page, pack);
    await expect(page.locator("#map-date-btns .date-card:not([disabled])")).toHaveCount(7);
    const today = page.locator("#map-date-btns .date-card").filter({ hasText: pack.today });
    await today.click();
    await expect(today).toHaveClass(/is-active/);
    await openSearch(page);
    await page.getByRole("button", { name: pack.closeSearch }).click();
    await expect(page.locator("#map-search-overlay")).toBeHidden();
    await page.evaluate(() => {
      // @ts-expect-error app globals
      selectResort(1, { noMove: true });
    });
    await expect(page.locator("#map-detail-sheet")).toHaveClass(/map-detail-sheet--open/);
    await page.locator(".map-detail-sheet__close--floating").click();
    await page.getByRole("button", { name: pack.listBtn }).click();
    await expect(page.locator("#view-top")).toBeVisible();
  });
});

test.describe("desktop map JMA toggle", () => {
  test.use({
    viewport: { width: 1280, height: 800 },
    isMobile: false,
    hasTouch: false,
  });

  test("8) OFF / 3h / 6h radios", async ({ page }) => {
    await enterMap(page, JA);
    const panel = page.locator("#jma-toggle");
    await expect(panel).toBeVisible();
    for (const value of ["3h", "6h", ""]) {
      await panel.locator(`input[name="jma-snow-kind"][value="${value}"]`).click();
      await expect(panel.locator(`input[name="jma-snow-kind"][value="${value}"]`)).toBeChecked();
    }
  });
});
