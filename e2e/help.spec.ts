import { expect, test } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

/**
 * Next.js 15 sometimes drops a link click after fetching the page (vercel/next.js#83386); a person just clicks
 * again. The tests do the same, so they check our pages rather than that bug.
 */
async function clickTo(page: import("@playwright/test").Page, link: import("@playwright/test").Locator, url: RegExp) {
  await expect(async () => {
    if (!url.test(page.url())) await link.click({ timeout: 2000 });
    await expect(page).toHaveURL(url, { timeout: 3000 });
  }).toPass({ timeout: 20_000 });
}

// Update 7: the full Help Centre inside the site (all 82 articles in e2e/help-fixture.json).
const KB = JSON.parse(fs.readFileSync(path.join(__dirname, "help-fixture.json"), "utf8")) as { help_articles: { id: string; title: string; html: string }[]; help_topics: { id: string; title: string }[] };

test("Help home sits inside the site, with popular questions, 15 topics and Still need help", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await clickTo(page, page.getByRole("link", { name: "Help", exact: true }).first(), /\/help$/);
  await expect(page.getByRole("heading", { name: "How can we help?", level: 1 })).toBeVisible();
  await expect(page.getByText("82 step-by-step answers with screenshots.")).toBeVisible();
  await expect(page.locator(".hcpopi")).toHaveCount(8);
  await expect(page.locator(".hctopic")).toHaveCount(15);
  await expect(page.getByRole("link", { name: /Getting started.*6 articles/ })).toBeVisible();
  await expect(page.getByRole("link", { name: "Contact us" }).last()).toHaveAttribute("href", "/contact");
  await expect(page.locator("header .tbtn", { hasText: "Help" })).toBeVisible(); // the site's own header
  await expect(page.locator("footer").getByRole("link", { name: "Help" })).toHaveAttribute("href", "/help");
  await expect(page).toHaveTitle("Help Centre | SME Hub");
  expect(await page.locator("video, .vbox, .hcvids").count()).toBe(0);
});

test("search updates as you type and finds the checklist's questions", async ({ page }) => {
  await page.goto("/help", { waitUntil: "networkidle" });
  const box = page.getByLabel("Search help articles");
  for (const [q, title] of [["reset password", "Forgot your password? Reset it"], ["add my business", "Add your business"], ["sell my business", "Sell your business on SME Hub"]]) {
    await box.fill(q);
    await expect(page.getByRole("heading", { name: new RegExp(`results? for “${q}”`) })).toBeVisible();
    await expect(page.locator(".hcitem").first()).toContainText(title);
  }
  await box.fill("reset password");
  await expect(page.locator(".hcitem").first()).toContainText("Forgot your password? Reset it");
  await box.fill("sell my business");
  await expect(page.locator(".hcitem").first()).toContainText("Sell your business on SME Hub");
  await clickTo(page, page.locator(".hcitem").first(), /\/help\/sell-your-business$/);
  await expect(page.locator(".hcside").getByLabel("Search help articles")).toHaveValue("sell my business");
  await page.goto("/help/account");
  await expect(page.getByRole("link", { name: "See search results for “sell my business”" })).toBeVisible();
  await page.goto("/help");
  await box.fill("zzzzqq");
  await expect(page.getByText("No answers found.")).toBeVisible();
  await page.getByRole("button", { name: "Clear search" }).click();
  await expect(page.getByRole("heading", { name: "Popular questions" })).toBeVisible();
});

test("typing in the search box on an article jumps to the results", async ({ page }) => {
  await page.goto("/help/first-week", { waitUntil: "networkidle" });
  await page.locator(".hcside").getByLabel("Search help articles").pressSequentially("stories");
  await expect(page).toHaveURL(/\/help\?q=s/);
  await expect(page.getByRole("heading", { name: /results? for “/ })).toBeVisible();
});

test("a topic page lists its articles; an article has the topic menu, steps, feedback and previous/next", async ({ page, request }) => {
  await page.goto("/help/profile", { waitUntil: "networkidle" });
  await expect(page.getByRole("heading", { name: "Your profile", level: 1 })).toBeVisible();
  await clickTo(page, page.locator(".hcitem", { hasText: "Get featured: the Member Spotlight" }), /\/help\/member-spotlight$/);
  await expect(page.getByRole("heading", { name: "Get featured: the Member Spotlight", level: 1 })).toBeVisible();
  await expect(page.locator(".hcsub a[aria-current=page]")).toHaveText("Get featured: the Member Spotlight");
  await expect(page.getByRole("link", { name: /Previous/ })).toBeVisible();
  await expect(page).toHaveTitle("Get featured: the Member Spotlight | SME Hub Help");
  await page.getByRole("button", { name: "No" }).click();
  await expect(page.getByText("Thanks. We’ll use this to improve the article.")).toBeVisible();
  await expect.poll(async () => (await (await request.get("http://127.0.0.1:54398/__help_votes")).json()).some((v: { p_article: string; p_helpful: boolean }) => v.p_article === "member-spotlight" && v.p_helpful === false)).toBe(true);
});

test("a screenshot opens bigger and closes with Escape", async ({ page }) => {
  await page.goto("/help/first-week", { waitUntil: "networkidle" });
  await page.locator(".hcbody .zoom").first().click();
  const dlg = page.getByRole("dialog");
  await expect(dlg.locator("img")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("old addresses and links still land on the right page", async ({ page }) => {
  await page.goto("/help/a/first-week");
  await expect(page).toHaveURL(/\/help\/first-week$/);
  await page.goto("/help/c/profile");
  await expect(page).toHaveURL(/\/help\/profile$/);
  await page.goto("/help/search?q=stories");
  await expect(page).toHaveURL(/\/help\?q=stories$/);
  await page.goto("/help#/a/first-week", { waitUntil: "networkidle" });
  await expect(page).toHaveURL(/\/help\/first-week$/);
  await page.goto("/frequently-asked-questions");
  await expect(page).toHaveURL(/\/help$/);
});

test("all 82 articles open, and every screenshot loads", async ({ page, request }) => {
  test.setTimeout(240_000);
  const pics = new Set<string>();
  for (const a of KB.help_articles) {
    const r = await request.get(`/help/${a.id}`);
    expect(r.status(), a.id).toBe(200);
    const html = await r.text();
    expect(html, a.id).toContain(a.title.replace(/&/g, "&amp;").replace(/’/g, "’"));
    for (const m of html.matchAll(/src="(\/help-media\/[^"]+)"/g)) pics.add(m[1]);
  }
  expect(pics.size).toBeGreaterThan(60);
  for (const p of pics) expect((await request.get(p)).status(), p).toBe(200);
  void page;
});

test("a missing article says so and links to Help home", async ({ page }) => {
  await page.goto("/help/nope", { waitUntil: "networkidle" });
  await expect(page.getByText("We couldn’t find that help page.")).toBeVisible();
  await expect(page.getByRole("link", { name: "Help Centre home" })).toHaveAttribute("href", "/help");
});
