import { expect, test } from "@playwright/test";

// Update 15: the Grant Finder is public; program pages can be read without an account
test("Find funding lists programs, checked ones first, and filters by type and search", async ({ page }) => {
  await page.goto("/grants", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Find funding for your business", level: 1 })).toBeVisible();
  await expect(page.getByRole("heading", { name: "3 programs found" })).toBeVisible();
  await expect(page.locator(".gfcard h3").first()).toHaveText("CanExport SMEs");
  await expect(page.locator(".gfbadge.ok").first()).toContainText("Checked by CanadianSME · Nov 2026");
  await expect(page.locator(".gfbadge.src").first()).toContainText("From the official source");
  await expect(async () => {
    await page.locator("#gftype").selectOption("train");
    await expect(page.getByRole("heading", { name: "1 program found" })).toBeVisible({ timeout: 1000 });
  }).toPass();
  await expect(page.getByRole("link", { name: "Search the government finder" })).toHaveAttribute("target", "_blank");
  await expect(page.getByRole("link", { name: "How to spot a grant scam" })).toHaveAttribute("href", "/grants/safe");
});

test("a program page shows who can apply, how to apply and links to the official page", async ({ page }) => {
  const res = await page.goto("/grants/canexport", { waitUntil: "domcontentloaded" });
  expect(res?.status()).toBe(200);
  await expect(page.getByRole("heading", { name: "CanExport SMEs", level: 1 })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Who can apply" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "How to apply" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Apply on the official page" })).toHaveAttribute("href", "https://www.tradecommissioner.gc.ca/");
  await expect(page.getByText("This is a grant.", { exact: false })).toBeVisible();
  await page.goto("/grants/nope", { waitUntil: "domcontentloaded" });
  await expect(page.getByText(/not found|could not be found|doesn’t exist/i).first()).toBeVisible();
});

test("Avoid scams explains the warning signs", async ({ page }) => {
  await page.goto("/grants/safe", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "How to spot a grant scam", level: 1 })).toBeVisible();
  await expect(page.getByRole("heading", { name: "They ask for a fee to get you a grant" })).toBeVisible();
});

test("All categories lists 32 industries and searches specialities (Update 15)", async ({ page }) => {
  await page.goto("/categories", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Every kind of Canadian small business", level: 1 })).toBeVisible();
  await expect(page.locator(".xcat")).toHaveCount(32);
  await expect(async () => {
    await page.locator("#catq").fill("plumb");
    await expect(page.locator(".xcat")).toHaveCount(1, { timeout: 1000 });
  }).toPass();
  await expect(page.getByRole("link", { name: "Plumbers" })).toHaveAttribute("href", "/businesses?category=Construction+%26+Trades&q=Plumbers");
  await page.goto("/businesses", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("link", { name: /All 32 industries/ })).toHaveAttribute("href", "/categories");
});
