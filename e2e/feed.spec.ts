import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { memberCookie, SCREEN_WIDTHS } from "./personas";

// Phase 3: the feed as a signed-in member (post options, poll, reactions, scopes, scheduled posts).
test.beforeEach(async ({ context, baseURL }) => {
  await context.addCookies([memberCookie(baseURL!)]);
});

test("a post shows its title, six reactions and a poll that shows results after a vote", async ({ page }) => {
  await page.goto("/feed", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Wholesale boxes" })).toBeVisible();
  for (const label of ["Like", "Celebrate", "Support", "Love", "Insightful", "Funny"]) {
    await expect(page.getByRole("button", { name: new RegExp(`^${label}, \\d+`) })).toBeVisible();
  }
  const poll = page.getByRole("group", { name: "Poll" });
  await expect(poll.getByText("4 votes")).toBeVisible();
  await expect(poll.getByText("%")).toHaveCount(0); // results stay hidden until you vote
  await poll.getByRole("button", { name: "Six boxes" }).click();
  await expect(poll.getByText("5 votes")).toBeVisible();
  await expect(poll.getByText("%").first()).toBeVisible();
});

test("the composer offers title, cover, poll, schedule and closing comments", async ({ page }) => {
  await page.goto("/feed", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: /Start a post/ }).click();
  await expect(page.getByLabel("Post title")).toBeVisible();
  await expect(page.getByLabel("Cover picture")).toBeAttached();
  await page.getByRole("button", { name: "Poll" }).click();
  await expect(page.getByLabel("Poll option 1")).toBeVisible();
  await page.getByRole("button", { name: "Add option" }).click();
  await expect(page.getByLabel("Poll option 3")).toBeVisible();
  await page.getByRole("button", { name: "Schedule" }).click();
  await expect(page.getByLabel("Publish date and time")).toBeVisible();
  await expect(page.getByRole("checkbox", { name: "Close comments" })).toBeVisible();
});

test("the feed has a scope row and a Scheduled link", async ({ page }) => {
  await page.goto("/feed?scope=mine", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("link", { name: "My posts" })).toHaveAttribute("aria-current", "page");
  for (const name of ["Reacted", "Groups", "Connections", "Following"]) await expect(page.getByRole("navigation", { name: "Whose posts" }).getByRole("link", { name })).toBeVisible();
  await page.getByRole("navigation", { name: "Whose posts" }).getByRole("link", { name: "Scheduled" }).click();
  await expect(page).toHaveURL(/\/scheduled$/);
});

test("scheduled posts can be published now, moved or cancelled", async ({ page }) => {
  await page.goto("/scheduled", { waitUntil: "domcontentloaded" });
  await expect(page.getByText("Launch day")).toBeVisible();
  await expect(page.getByRole("button", { name: "Publish now" })).toBeVisible();
  await page.getByRole("button", { name: "Change time" }).click();
  await expect(page.getByLabel("New date and time")).toBeVisible();
  await expect(page.getByRole("button", { name: "Cancel post" })).toBeVisible();
});

for (const path of ["/feed", "/scheduled"]) {
  test(`${path} has no accessibility violations`, async ({ page }) => {
    await page.goto(path, { waitUntil: "domcontentloaded" });
    await page.getByRole("heading").first().waitFor();
    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
    expect(results.violations.map((v) => `${v.id}: ${v.nodes[0]?.target}`)).toEqual([]);
  });
}

for (const width of SCREEN_WIDTHS) {
  test(`feed fits a ${width}px screen`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    await page.goto("/feed", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "Wholesale boxes" })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  });
}
