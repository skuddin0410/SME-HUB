import { expect, test } from "@playwright/test";

test("help centre home has the search, topics and no old brand name", async ({ page }) => {
  await page.goto("/help", { waitUntil: "networkidle" });
  await expect(page.getByRole("heading", { name: "How can we help?", level: 1 })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Browse by topic" })).toBeVisible();
  await expect(page.getByRole("link", { name: /Getting started/ })).toBeVisible();
  await expect(page.getByRole("link", { name: "Back to SME Hub" })).toBeVisible();
  const text = await page.locator("body").innerText();
  expect(text).not.toMatch(/SMB (Hub|Advisor)/);
});

test("the old first-week article now opens as Get your profile ready, with its new picture", async ({ page }) => {
  await page.goto("/help/a/first-week", { waitUntil: "networkidle" });
  await expect(page.getByRole("heading", { name: "Get your profile ready", level: 1 })).toBeVisible();
  const img = page.locator('img[src="/help-media/start-ready.webp"]');
  await expect(img).toBeVisible();
  expect(await img.evaluate((i: HTMLImageElement) => i.complete && i.naturalWidth > 0)).toBe(true);
  expect(await page.locator('[src*="start-firstweek"]').count()).toBe(0);
});

test("old #/a/ links from the one-page Help Centre still land on the article", async ({ page }) => {
  await page.goto("/help#/a/first-week", { waitUntil: "networkidle" });
  await expect(page).toHaveURL(/\/help\/a\/first-week$/);
  await expect(page.getByRole("heading", { name: "Get your profile ready", level: 1 })).toBeVisible();
});

test("the Member Spotlight article sits under Your profile", async ({ page }) => {
  await page.goto("/help/c/profile", { waitUntil: "networkidle" });
  await page.getByRole("link", { name: /Get featured: the Member Spotlight/ }).first().click();
  await expect(page.getByRole("heading", { name: "Get featured: the Member Spotlight", level: 1 })).toBeVisible();
  await expect(page.getByRole("link", { name: "Your profile" }).first()).toBeVisible();
});

test("search finds spotlight, profile ready and website", async ({ page }) => {
  for (const [q, title] of [["spotlight", "Get featured: the Member Spotlight"], ["profile ready", "Get your profile ready"], ["website", "Create your account"]]) {
    await page.goto(`/help/search?q=${encodeURIComponent(q)}`, { waitUntil: "networkidle" });
    await expect(page.getByRole("link", { name: new RegExp(title) }).first()).toBeVisible();
  }
  await page.goto("/help/search?q=zzzzqq", { waitUntil: "networkidle" });
  await expect(page.getByText("No articles match.")).toBeVisible();
});

test("a screenshot opens large and closes with Escape", async ({ page }) => {
  await page.goto("/help/a/first-week", { waitUntil: "networkidle" });
  await page.locator("button.zoom").first().click();
  await expect(page.getByRole("dialog", { name: "Enlarged screenshot" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("a missing article says so and links home", async ({ page }) => {
  await page.goto("/help/a/nope", { waitUntil: "networkidle" });
  await expect(page.getByText("We couldn’t find that page.")).toBeVisible();
  await expect(page.getByRole("link", { name: "Help Centre home", exact: true })).toBeVisible();
});
