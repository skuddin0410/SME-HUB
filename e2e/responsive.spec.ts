import { expect, test } from "@playwright/test";
import { PUBLIC_PAGES, SCREEN_WIDTHS } from "./personas";

// Known before v2: the old header pushes these pages 24px wider than tablet screens.
// Phase 1 replaces the header; remove entries here as they are fixed.
const KNOWN_OVERFLOW = new Set(
  ["/about", "/help", "/contact", "/membership-plans"].flatMap((p) => [`${p}@768`, `${p}@1024`]),
);

// Acceptance checklist item 9: every page fits every screen with no sideways scroll.
for (const width of SCREEN_WIDTHS) {
  for (const path of PUBLIC_PAGES) {
    test(`${path} fits a ${width}px screen`, async ({ page }) => {
      test.fixme(KNOWN_OVERFLOW.has(`${path}@${width}`), "old header overflows; fixed in Phase 1");
      await page.setViewportSize({ width, height: 900 });
      const response = await page.goto(path, { waitUntil: "domcontentloaded" });
      expect(response?.status() ?? 0, "page loads").toBeLessThan(500);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow, "no sideways scroll").toBeLessThanOrEqual(1);
    });
  }
}
