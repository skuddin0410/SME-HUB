import { expect, test } from "@playwright/test";
import { PUBLIC_PAGES, SCREEN_WIDTHS } from "./personas";


// Acceptance checklist item 9: every page fits every screen with no sideways scroll.
for (const width of SCREEN_WIDTHS) {
  for (const path of new Set([...PUBLIC_PAGES, "/businesses", "/businesses?view=list", "/businesses?view=map", "/businesses/maple-demo", "/businesses/maple-demo?tab=about", "/businesses/maple-demo?tab=reviews", "/businesses/maple-demo?tab=shop", "/businesses/maple-demo?tab=events"])) {
    test(`${path} fits a ${width}px screen`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      const response = await page.goto(path, { waitUntil: "domcontentloaded" });
      expect(response?.status() ?? 0, "page loads").toBeLessThan(500);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow, "no sideways scroll").toBeLessThanOrEqual(1);
    });
  }
}
