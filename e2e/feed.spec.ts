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

// Update 9: a small post box in the feed; the full form opens in a pop-up window.
test("the post box opens the window, and the shortcuts open it in the right state", async ({ page }) => {
  await page.goto("/feed", { waitUntil: "networkidle" });
  const box = page.locator(".cpbox");
  await expect(box.getByRole("button", { name: "Start a post" })).toBeVisible();
  await expect(box.locator(".cpb")).toHaveText(["Photo", "Question", "Hiring", "Event"]);
  await expect(box.getByRole("link", { name: "Event" })).toHaveAttribute("href", "/events");
  await expect(page.getByLabel("Write a post")).toBeHidden();
  await box.getByRole("button", { name: "Question" }).click();
  const dlg = page.getByRole("dialog", { name: "Test Member" });
  await expect(dlg).toBeVisible();
  await expect(dlg.getByRole("button", { name: "Question", pressed: true })).toBeVisible();
  await expect(dlg.getByLabel("Write a post")).toBeFocused();
  await expect(dlg.getByLabel("Write a post")).toHaveAttribute("placeholder", "What do you want to ask the community?");
  await page.keyboard.press("Escape");
  await expect(dlg).toBeHidden();
  await box.getByRole("button", { name: "Hiring" }).click();
  await expect(dlg.getByRole("button", { name: "Hiring", pressed: true })).toBeVisible();
  await dlg.getByRole("button", { name: "Close" }).click();
  await expect(dlg).toBeHidden();
});

test("the window has Post to, title, types, poll and AI; closing keeps the draft", async ({ page }) => {
  await page.goto("/feed", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Start a post" }).click();
  const dlg = page.getByRole("dialog", { name: "Test Member" });
  await expect(dlg.getByLabel("Post to")).toHaveValue("public");
  await expect(dlg.getByLabel("Post to").locator("option").first()).toHaveText("Post to: Everyone");
  await expect(dlg.getByLabel("Post title")).toHaveAttribute("placeholder", "Title (optional)");
  await expect(dlg.getByRole("group", { name: "Post type" }).getByRole("button")).toHaveText(["Question", "Win", "Hiring", "Intro", "Offer"]);
  await expect(dlg.getByRole("button", { name: "Add photo" })).toBeAttached();
  await dlg.getByRole("button", { name: "Add poll" }).click();
  await expect(dlg.getByLabel("Poll option 1")).toBeVisible();
  await dlg.getByRole("button", { name: "Add another option" }).click();
  await expect(dlg.getByLabel("Poll option 3")).toBeVisible();
  await expect(dlg.getByRole("button", { name: "Add poll" })).toHaveCount(0);
  await dlg.getByRole("button", { name: "Remove poll" }).click();
  await expect(dlg.getByRole("button", { name: "Schedule" })).toHaveCount(0); // the Hub team only
  await dlg.getByRole("button", { name: "Improve with AI" }).click();
  await expect(dlg.getByText("Write a few words first")).toBeVisible();
  await dlg.getByLabel("Write a post").fill("we fixed our delivery times by batching orders");
  await dlg.getByRole("button", { name: "Improve with AI" }).click();
  await expect(dlg.getByLabel("Write a post")).toHaveValue("We fixed our delivery times by batching orders.");
  await page.mouse.click(5, 300); // outside the window
  await expect(dlg).toBeHidden();
  await expect(page.locator(".cpbar")).toHaveText("Continue your draft: We fixed our delivery times by batching orders.");
  await page.locator(".cpbar").click();
  await expect(dlg.getByLabel("Write a post")).toHaveValue("We fixed our delivery times by batching orders.");
});

test("Offer is locked for Free members and opens the Plus message", async ({ page }) => {
  await page.goto("/feed", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Start a post" }).click();
  await page.getByRole("button", { name: "Offer, for Plus members and Advisors" }).click();
  await expect(page.getByRole("dialog", { name: "Offers are for Plus members and Advisors" })).toBeVisible();
  await expect(page.getByRole("link", { name: "See membership plans" })).toHaveAttribute("href", "/membership-plans");
  await page.getByRole("button", { name: "Not now" }).click();
  await expect(page.getByLabel("Write a post")).toBeVisible();
});

test("posting closes the window and empties the box; a missing post keeps it open", async ({ page, request }) => {
  await page.goto("/feed", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Start a post" }).click();
  const dlg = page.getByRole("dialog", { name: "Test Member" });
  await dlg.getByRole("button", { name: "Post", exact: true }).click();
  await expect(dlg.getByRole("alert")).toHaveText("Write something before posting.");
  await expect(dlg).toBeVisible();
  await dlg.getByRole("button", { name: "Win" }).click();
  await dlg.getByLabel("Write a post").fill("Landed our first wholesale account today");
  await dlg.getByRole("button", { name: "Post", exact: true }).click();
  await expect(dlg).toBeHidden({ timeout: 20_000 }); // the server re-renders the whole page with the new post, which can take a while here
  await expect(page.locator(".cpbar")).toHaveText("Start a post");
  const made = (await (await request.get("http://127.0.0.1:54398/__posts")).json()) as { body: string; kind: string; visibility: string }[];
  expect(made.at(-1)).toMatchObject({ body: "Landed our first wholesale account today", kind: "win", visibility: "public" });
});

test("the Hub team can schedule from the window", async ({ page, context, baseURL }) => {
  await context.clearCookies();
  await context.addCookies([memberCookie(baseURL!, true)]);
  await page.goto("/feed", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Start a post" }).click();
  const dlg = page.getByRole("dialog", { name: "Team Lead" });
  await expect(dlg.getByRole("button", { name: "Offer" })).toHaveAttribute("aria-pressed", "false"); // not locked for the team
  await dlg.getByRole("button", { name: "Schedule" }).click();
  await expect(dlg.getByLabel("Publish on")).toBeVisible();
  await expect(dlg.getByRole("button", { name: "Schedule", exact: true })).toBeVisible();
  await expect(dlg.getByRole("link", { name: "Scheduled posts" })).toHaveAttribute("href", "/scheduled");
  await dlg.getByRole("button", { name: "Post now instead" }).click();
  await expect(dlg.getByRole("button", { name: "Post", exact: true })).toBeVisible();
});

test("the feed has a slim Show and Sort by line", async ({ page }) => {
  await page.goto("/feed?scope=mine", { waitUntil: "networkidle" });
  await expect(page.getByRole("heading", { name: "Latest from the community" })).toHaveCount(0);
  const show = page.getByLabel("Show:");
  await expect(show).toHaveValue("mine");
  await expect(show.locator("option")).toHaveText(["All updates", "Created by me", "I have reacted to", "From my groups", "From my connections", "From people I follow", "Hashtags I follow"]);
  await expect(page.getByLabel("Sort by:")).toHaveValue("top");
  // Next.js 15 can drop a navigation (vercel/next.js#83386); a person picks again, and so does the test
  await expect(async () => {
    if (!/sort=latest/.test(page.url())) await page.getByLabel("Sort by:").selectOption("latest");
    await expect(page).toHaveURL(/scope=mine&sort=latest|sort=latest&scope=mine/, { timeout: 3000 });
  }).toPass({ timeout: 20_000 });
  await expect(page.getByLabel("Sort by:")).toHaveValue("latest");
  await expect(async () => {
    if (/scope=mine/.test(page.url())) { await page.getByLabel("Show:").selectOption("mine"); await page.getByLabel("Show:").selectOption("all"); }
    await expect(page).toHaveURL(/\/feed\?sort=latest$/, { timeout: 3000 });
  }).toPass({ timeout: 20_000 });
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
