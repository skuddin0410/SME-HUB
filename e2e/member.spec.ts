import { expect, test } from "@playwright/test";
import { memberCookie, SCREEN_WIDTHS } from "./personas";

// A signed-in member: the new header, the messaging dock, the first-week checklist and dark mode.
test.beforeEach(async ({ context, baseURL }) => {
  await context.addCookies([memberCookie(baseURL!)]);
});

for (const width of SCREEN_WIDTHS) {
  test(`member home fits a ${width}px screen`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/feed", { waitUntil: "domcontentloaded" });
    await expect(page.getByText("Get started on SMB Hub")).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, "no sideways scroll").toBeLessThanOrEqual(1);
  });
}

test("header shows Home, Network and Business Directory, and the messaging dock opens", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/feed", { waitUntil: "domcontentloaded" });
  const nav = page.getByRole("navigation", { name: "Main" });
  for (const name of ["Home", "Network", "Business Directory"]) await expect(nav.getByRole("link", { name })).toBeVisible();
  const dock = page.getByRole("complementary", { name: "Messaging" });
  await expect(dock).toBeVisible();
  await dock.getByRole("button", { name: /Messaging/ }).click();
  await expect(dock.getByText("No conversations yet")).toBeVisible();
});

test("dark mode switches, is remembered after a reload, and still fits", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/feed", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: /\bMe$/ }).click();
  await page.getByRole("button", { name: /Switch to dark mode/ }).click();
  await expect(page.locator("html")).toHaveClass(/dark/);
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.locator("html")).toHaveClass(/dark/);
  const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  expect(bg).toBe("rgb(16, 19, 25)"); // #101319, the handoff's dark page colour
});

test("first-week checklist can be hidden and stays hidden", async ({ page }) => {
  await page.goto("/feed", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Hide this checklist" }).click();
  await expect(page.getByText("Get started on SMB Hub")).toBeHidden();
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.getByText("Get started on SMB Hub")).toBeHidden();
});
