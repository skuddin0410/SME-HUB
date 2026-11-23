import { expect, test } from "@playwright/test";
import { SECTIONS } from "../lib/content";

for (const k of ["blog", "news", "podcast"] as const) {
  test(`${k} list shows a featured piece, topic chips and the magazine band`, async ({ page }) => {
    await page.goto(SECTIONS[k].path, { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Topic" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Subscribe now" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Member blogs" })).toBeVisible();
  });
  test(`${k} article page has takeaways, contents and related`, async ({ page }) => {
    const it = SECTIONS[k].items[0];
    await page.goto(`${SECTIONS[k].path}/${it.slug}`, { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: it.title, level: 1 })).toBeVisible();
    await expect(page.getByText("Key takeaways")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Related" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Find an advisor" })).toBeVisible();
  });
}

test("search narrows the article list", async ({ page }) => {
  await page.goto("/blog?q=zzzznomatch", { waitUntil: "domcontentloaded" });
  await expect(page.getByText("Nothing matches.")).toBeVisible();
});
