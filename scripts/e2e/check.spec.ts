/**
 * VoiceBridge E2E test suite.
 * Run with: npx playwright test --config=scripts/e2e/playwright.config.ts
 *
 * Requires dev server running on port 3000.
 * Requires scripts/e2e/fixtures/test-audio.wav (node scripts/e2e/gen-fixture.mjs).
 *
 * Flow ordering: 1 (record) must run before 2/3/4.
 * Playwright workers run tests in each describe block sequentially by default.
 */

import { test, expect, Page } from "@playwright/test";

// ── helpers ─────────────────────────────────────────────────────────────────

async function collectErrors(page: Page): Promise<string[]> {
  const errors: string[] = [];
  page.on("pageerror", (e: Error) => errors.push(`[pageerror] ${e.message}`));
  page.on("console", (m: any) => {
    if (m.type() === "error") errors.push(`[console.error] ${m.text()}`);
  });
  return errors;
}

async function doRecord(page: Page) {
  await page.goto("/");
  await page.waitForSelector("header", { timeout: 15_000 });

  const recordBtn = page.getByTestId("btn-record");
  await expect(recordBtn).toBeVisible({ timeout: 10_000 });
  await recordBtn.click();

  await expect(page.getByTestId("btn-stop")).toBeVisible({ timeout: 5_000 });
  await page.waitForTimeout(4_500);
  await page.getByTestId("btn-stop").click();

  await expect(page.getByTestId("btn-send")).toBeVisible({ timeout: 8_000 });
  await page.getByTestId("btn-send").click();

  // Wait for memo to appear (Vercel Blob + Whisper + Claude can take up to 90s)
  await expect(page.getByTestId("memo-item").first()).toBeVisible({ timeout: 90_000 });
}

// ── WebKit smoke ─────────────────────────────────────────────────────────────

test.describe("WebKit smoke", () => {
  test.skip(({ browserName }: { browserName: string }) => browserName !== "webkit", "WebKit only");

  test("page loads and record button renders without crash", async ({ page }: { page: Page }) => {
    const errors = await collectErrors(page);
    await page.goto("/");
    await page.waitForSelector("header", { timeout: 15_000 });
    await expect(page.getByTestId("btn-record")).toBeVisible({ timeout: 10_000 });
    await page.getByTestId("btn-record").click();
    await page.waitForTimeout(800);

    const appErrors = errors.filter(
      (e) =>
        !e.includes("favicon") &&
        !e.includes("NotAllowedError") &&
        !e.includes("Permission denied") &&
        !e.includes("NotSupportedError"),
    );
    expect(appErrors, `Unexpected JS errors:\n${appErrors.join("\n")}`).toHaveLength(0);
  });
});

// ── Chromium full flows ───────────────────────────────────────────────────────

// Run these tests serially so Flow 1's memo persists in the DB for Flows 2/3/4.
test.describe.serial("Chromium full demo", () => {
  test.skip(({ browserName }: { browserName: string }) => browserName !== "chromium", "Chromium only");

  // ── Flow 1: Record → memo ──────────────────────────────────────────────────
  test("Flow 1 — record → memo appears in sidebar", async ({ page }: { page: Page }) => {
    const errors = await collectErrors(page);
    await doRecord(page);

    const memoItem = page.getByTestId("memo-item").first();
    const title = (await memoItem.textContent()) ?? "";
    expect(title.length, "Memo title should not be empty").toBeGreaterThan(0);

    const appErrors = errors.filter(
      (e) =>
        !e.includes("favicon") &&
        !e.toLowerCase().includes("clerk") &&
        !e.includes("middleware"),
    );
    expect(appErrors, `JS errors:\n${appErrors.join("\n")}`).toHaveLength(0);
  });

  // ── Flow 2: Semantic search ────────────────────────────────────────────────
  test("Flow 2 — semantic search returns an answer", async ({ page }: { page: Page }) => {
    await page.goto("/");
    await page.waitForSelector("header", { timeout: 15_000 });

    // Wait for memo created by Flow 1
    await expect(page.getByTestId("memo-item").first()).toBeVisible({ timeout: 15_000 });

    const searchInput = page.getByTestId("search-input");
    await searchInput.fill("What was this memo about?");
    await searchInput.press("Enter");

    await expect(page.getByTestId("search-results")).toBeVisible({ timeout: 30_000 });
    const text = await page.getByTestId("search-results").textContent();
    expect((text ?? "").length, "Search result should have content").toBeGreaterThan(10);
  });

  // ── Flow 3: Segment translation ───────────────────────────────────────────
  test("Flow 3 — translate button works", async ({ page }: { page: Page }) => {
    await page.goto("/");
    await page.waitForSelector("header", { timeout: 15_000 });

    const memoItem = page.getByTestId("memo-item").first();
    await expect(memoItem).toBeVisible({ timeout: 15_000 });
    await memoItem.click();

    const translateBtn = page.locator("button", { hasText: /→ (EN|KO)/i }).first();
    const hasTranslate = await translateBtn.isVisible().catch(() => false);

    if (!hasTranslate) {
      console.warn("Flow 3: No translate buttons — single-language memo (soft pass).");
      return;
    }

    await translateBtn.click();
    await expect(page.locator("p.italic").first()).toBeVisible({ timeout: 20_000 });
  });

  // ── Flow 4: Delete memo ───────────────────────────────────────────────────
  test("Flow 4 — delete memo removes it from sidebar", async ({ page }: { page: Page }) => {
    await page.goto("/");
    await page.waitForSelector("header", { timeout: 15_000 });

    const memoItems = page.getByTestId("memo-item");
    const initialCount = await memoItems.count();
    if (initialCount === 0) {
      console.warn("Flow 4: No memos to delete — skipping.");
      return;
    }

    const firstItem = memoItems.first();
    await firstItem.hover();
    page.on("dialog", (d: any) => d.accept());

    const deleteBtn = firstItem.getByTestId("btn-delete-memo");
    await expect(deleteBtn).toBeVisible({ timeout: 3_000 });
    await deleteBtn.click();

    await expect(memoItems).toHaveCount(Math.max(0, initialCount - 1), { timeout: 10_000 });
  });
});
