import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import path from "node:path";
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
  await expect(box.locator(".cpb")).toHaveText(["Photo", "Video", "Question", "Hiring", "Event"]);
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
  await expect(dlg.getByRole("group", { name: "Post type" }).getByRole("button")).toHaveText(["Update", "Question", "Win", "Hiring", "Intro", "Offer"]);
  await expect(dlg.getByRole("button", { name: "Update", pressed: true })).toBeVisible(); // Update 10: the default
  await expect(dlg.getByLabel("Add photos, up to 10")).toBeVisible();
  await expect(dlg.getByLabel("Add a video")).toBeVisible();
  await dlg.getByRole("button", { name: "Add a poll" }).click();
  await expect(dlg.getByLabel("Poll option 1")).toBeVisible();
  await dlg.getByRole("button", { name: "Add another option" }).click();
  await expect(dlg.getByLabel("Poll option 3")).toBeVisible();
  await expect(dlg.getByRole("button", { name: "Add a poll" })).toHaveCount(0);
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
  await expect(dlg).toBeHidden({ timeout: 20_000 });
  await expect(page.locator(".cpbar")).toHaveText("Start a post");
  await page.locator(".cpbar").click();
  await expect(dlg.getByRole("button", { name: "Update", pressed: true })).toBeVisible(); // the type goes back to Update
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

// ===== Update 10: photos, video, short links, hashtag suggestions, the Update type =====
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");
const pngs = (n: number, from = 1) => Array.from({ length: n }, (_, i) => ({ name: `shop-${from + i}.png`, mimeType: "image/png", buffer: PNG }));

test("pick 5 photos at once, remove one, add more up to 10, then post them", async ({ page, request }) => {
  await page.goto("/feed", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Start a post" }).click();
  const dlg = page.getByRole("dialog", { name: "Test Member" });
  await page.locator("#cpphotos").setInputFiles(pngs(5));
  await expect(dlg.locator(".cpth img")).toHaveCount(5);
  await expect(dlg.getByText("5 of 10 photos")).toBeVisible();
  await expect(dlg.locator(".cpadd")).toBeVisible();
  await dlg.getByRole("button", { name: "Remove photo 2" }).click();
  await expect(dlg.getByText("4 of 10 photos")).toBeVisible();
  await page.locator("#cpphotos").setInputFiles(pngs(7, 6));
  await expect(dlg.getByText("10 of 10 photos")).toBeVisible();
  await expect(dlg.getByText("You can add up to 10 photos. We added the first 6.")).toBeVisible();
  await expect(dlg.locator(".cpadd")).toHaveCount(0);
  await expect(dlg.getByRole("button", { name: "Post", exact: true })).toBeEnabled({ timeout: 15_000 }); // every photo uploaded
  await dlg.getByLabel("Write a post").fill("Our new shop, in photos");
  await dlg.getByRole("button", { name: "Post", exact: true }).click();
  await expect(dlg).toBeHidden({ timeout: 20_000 });
  const made = (await (await request.get("http://127.0.0.1:54398/__posts")).json()) as { body: string; images?: string[]; image_url: string; kind: string }[];
  const p = made.find((x) => x.body === "Our new shop, in photos")!;
  expect(p.images).toHaveLength(10);
  expect(p.image_url).toBe(p.images![0]);
  expect(p.images![0]).toMatch(/\/storage\/v1\/object\/public\/media\/00000000-0000-4000-8000-000000000001\/post-[0-9a-f-]{36}\.jpg$/);
  expect(p.kind).toBe("update");
});

test("add a video, see it with a remove button, then post it", async ({ page, request }) => {
  await page.goto("/feed", { waitUntil: "networkidle" });
  await page.locator(".cpbox").getByRole("button", { name: "Video" }).click();
  const dlg = page.getByRole("dialog", { name: "Test Member" });
  await page.locator("#cpvideo").setInputFiles(path.join(__dirname, "..", "public", "zip", "img", "story-show.mp4"));
  await expect(dlg.getByLabel("Video to post")).toBeVisible();
  await expect(dlg.getByRole("button", { name: "Remove video" })).toBeVisible();
  await expect(dlg.getByLabel("Add a video")).toHaveCount(0); // one video per post
  await expect(dlg.getByRole("button", { name: "Post", exact: true })).toBeEnabled({ timeout: 20_000 });
  await dlg.getByLabel("Write a post").fill("A quick tour of the workshop");
  await dlg.getByRole("button", { name: "Post", exact: true }).click();
  await expect(dlg).toBeHidden({ timeout: 20_000 });
  const made = (await (await request.get("http://127.0.0.1:54398/__posts")).json()) as { body: string; video_url?: string }[];
  expect(made.find((x) => x.body === "A quick tour of the workshop")?.video_url).toMatch(/\/storage\/v1\/object\/public\/post-videos\/00000000-0000-4000-8000-000000000001\/video-[0-9a-f-]{36}\.mp4$/);
  // a file that is not a video is turned away
  await page.locator(".cpbar").click();
  await page.locator("#cpvideo").setInputFiles({ name: "notes.txt", mimeType: "text/plain", buffer: Buffer.from("hi") });
  await expect(dlg.getByText("That file isn’t a video")).toBeVisible();
});

test("the window suggests hashtags, shows links short and suggests marking a question", async ({ page }) => {
  await page.goto("/feed", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Start a post" }).click();
  const dlg = page.getByRole("dialog", { name: "Test Member" });
  const box = dlg.getByLabel("Write a post");
  await box.fill("Founded in 2001, we now stock video conferencing headsets. See https://www.yealink.com/en/product-list/video-conferencing?utm_source=x");
  await expect(dlg.getByText("Suggested hashtags:")).toBeVisible();
  const tags = dlg.locator(".cptag");
  expect(await tags.count()).toBeLessThanOrEqual(6);
  await expect(dlg.getByRole("button", { name: "#videoconferencing" })).toBeVisible();
  await expect(dlg.locator(".cplinks")).toContainText("Links will show short: yealink.com/en/product-list/vi…");
  await dlg.getByRole("button", { name: "#videoconferencing" }).click();
  await expect(box).toHaveValue(/\n\n#videoconferencing $/);
  await expect(dlg.getByRole("button", { name: "#videoconferencing" })).toHaveCount(0); // already in the post
  await box.fill("Can anyone recommend a bookkeeper in Calgary?");
  await expect(dlg.getByText("Asking for help? Mark it as a")).toBeVisible();
  await dlg.getByRole("button", { name: "Make it a question" }).click();
  await expect(dlg.getByRole("button", { name: "Question", pressed: true })).toBeVisible();
  await expect(dlg.getByText("Asking for help? Mark it as a")).toHaveCount(0);
});

test("the toolbar is one line of labelled buttons, all the same height; on phones they are round icons", async ({ page }) => {
  await page.goto("/feed", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Start a post" }).click();
  const btns = page.locator(".cpf .cpi");
  await expect(btns).toHaveText(["Photo", "Video", "Poll", "Improve with AI"]);
  const boxes = await Promise.all((await btns.all()).map((b) => b.boundingBox()));
  for (const b of boxes) { expect(Math.round(b!.height)).toBe(36); expect(Math.abs(b!.y - boxes[0]!.y)).toBeLessThan(1); }
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator(".cpf .cpi span").first()).toBeHidden();
  const small = await Promise.all((await btns.all()).map((b) => b.boundingBox()));
  for (const b of small) { expect(Math.round(b!.width)).toBe(38); expect(Math.abs(b!.y - small[0]!.y)).toBeLessThan(1); }
  await expect(page.getByLabel("Add photos, up to 10")).toBeVisible();
});

test("a post shows its video above the photos, a +N gallery, a short link and the Update tag; photos open large", async ({ page }) => {
  await page.goto("/posts/00000000-0000-4000-8000-0000000000a5", { waitUntil: "networkidle" });
  const post = page.locator("article.post").first();
  await expect(post.locator(".tag.update")).toHaveText("Update");
  await expect(post.getByText("No answers yet. Can you help?")).toHaveCount(0);
  const vid = post.locator(".cpvpost video");
  await expect(vid).toHaveAttribute("controls", "");
  expect(await vid.evaluate((v: HTMLVideoElement) => v.autoplay)).toBe(false);
  expect(await post.evaluate((el) => { const v = el.querySelector(".cpvpost")!, g = el.querySelector(".cpgal")!; return !!(v.compareDocumentPosition(g) & Node.DOCUMENT_POSITION_FOLLOWING); })).toBe(true);
  await expect(post.locator(".cpgal.n4 .cpgi")).toHaveCount(4);
  await expect(post.locator(".cpmore")).toHaveText("+1");
  const link = post.locator("a.cplink");
  await expect(link).toHaveText("yealink.com/en/product-list/vi…");
  await expect(link).toHaveAttribute("href", "https://www.yealink.com/en/product-list/video-conferencing");
  await expect(link).toHaveAttribute("target", "_blank");
  await expect(link).toHaveAttribute("rel", "noopener nofollow ugc");
  await post.getByRole("button", { name: "Open photo 1 of 5" }).click();
  const big = page.getByRole("dialog", { name: "Photo 1 of 5" });
  await expect(big).toBeVisible();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("dialog", { name: "Photo 2 of 5" })).toBeVisible();
  await page.getByRole("button", { name: "Previous photo" }).click();
  await page.getByRole("button", { name: "Previous photo" }).click();
  await expect(page.getByRole("dialog", { name: "Photo 5 of 5" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(post.getByRole("button", { name: "Open photo 1 of 5" })).toBeFocused();
  await page.goto("/posts/00000000-0000-4000-8000-0000000000a6", { waitUntil: "networkidle" });
  await expect(page.locator(".cpgal.n2 .cpgi")).toHaveCount(2);
});

test("a question with no answers asks members to help", async ({ page }) => {
  await page.goto("/feed", { waitUntil: "networkidle" });
  const post = page.locator("article.post", { hasText: "Wholesale boxes" });
  await expect(post.locator(".tag.question")).toHaveText("Question");
  await expect(post.getByText("No answers yet. Can you help?")).toBeVisible();
});

test("scheduled posts can be published now, moved or cancelled", async ({ page }) => {
  await page.goto("/scheduled", { waitUntil: "domcontentloaded" });
  await expect(page.getByText("Launch day")).toBeVisible();
  await expect(page.getByRole("button", { name: "Publish now" })).toBeVisible();
  await page.getByRole("button", { name: "Change time" }).click();
  await expect(page.getByLabel("New date and time")).toBeVisible();
  await expect(page.getByRole("button", { name: "Cancel post" })).toBeVisible();
});

for (const path of ["/feed", "/scheduled", "/posts/00000000-0000-4000-8000-0000000000a5"]) {
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
