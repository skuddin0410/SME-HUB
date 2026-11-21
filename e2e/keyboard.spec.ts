import { expect, test } from "@playwright/test";
import { memberCookie } from "./personas";

// Keyboard use: the skip link is the first stop, focus is visible, menus open and close without a mouse.
test("skip link is first, and Escape closes a header menu", async ({ page, context, baseURL }) => {
  await context.addCookies([memberCookie(baseURL!)]);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/feed", { waitUntil: "domcontentloaded" });
  await page.keyboard.press("Tab");
  const skip = page.getByRole("link", { name: "Skip to content" });
  await expect(skip).toBeFocused();
  await expect(skip).toBeVisible();
  await page.getByRole("button", { name: "About" }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByText("About SMB Hub").first()).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "About" })).toHaveAttribute("aria-expanded", "false");
});

test("focused controls show an outline", async ({ page }) => {
  await page.goto("/about", { waitUntil: "domcontentloaded" });
  await page.getByRole("link", { name: "Help" }).first().focus();
  await page.keyboard.press("Shift+Tab");
  await page.keyboard.press("Tab");
  const outline = await page.evaluate(() => getComputedStyle(document.activeElement!).outlineStyle);
  expect(outline).not.toBe("none");
});
