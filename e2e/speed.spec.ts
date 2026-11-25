import { expect, test } from "@playwright/test";
import { memberCookie } from "./personas";

// Speed: a click answers at once, even when the server is slow (the directory's database call is made to take 1.5 seconds here)
const MOCK = "http://127.0.0.1:54398";

test("clicking a tab lights it up and shows the next page's loading shape before the server answers", async ({ page, context, baseURL, request }) => {
  await context.addCookies([memberCookie(baseURL!, false, undefined, { ready: 5 })]);
  await page.goto("/feed", { waitUntil: "networkidle" });
  await request.get(`${MOCK}/__delay?ms=1500&path=directory_facets`);
  try {
    const t0 = Date.now();
    await page.locator("header").getByRole("link", { name: "Business Directory", exact: true }).first().click();
    await expect(page.locator("header").getByRole("link", { name: "Business Directory", exact: true }).first()).toHaveAttribute("aria-current", "page", { timeout: 1000 });
    await expect(page.locator("[aria-busy=true]").first()).toBeVisible({ timeout: 1000 });
    expect(Date.now() - t0).toBeLessThan(1400);
  } finally {
    await request.get(`${MOCK}/__delay?ms=0`);
  }
  await expect(page.locator(".bdcats")).toBeVisible({ timeout: 20000 });
  await expect(page.locator("[aria-busy=true]")).toHaveCount(0);
});

test("a link to another website, or one opened in a new tab, does not show a loading shape", async ({ page, context, baseURL }) => {
  await context.addCookies([memberCookie(baseURL!, false, undefined, { ready: 5 })]);
  await page.goto("/grants/canexport", { waitUntil: "networkidle" });
  const [popup] = await Promise.all([page.waitForEvent("popup"), page.getByRole("link", { name: "Apply on the official page" }).click()]);
  await popup.close();
  await expect(page.locator("[aria-busy=true]")).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "CanExport SMEs", level: 1 })).toBeVisible();
});
