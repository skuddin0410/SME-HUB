import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { memberCookie } from "./personas";

const MOCK = "http://127.0.0.1:54398";
// these tests share in-memory test data (stories, answers, bookings), so they run one after another
test.describe.configure({ mode: "default" });
test.beforeEach(async ({ request }) => { await request.get(`${MOCK}/__reset_stories`); });

test("the feed shows the stories row: your story first, then members with stories you may see", async ({ page, context, baseURL }) => {
  await context.addCookies([memberCookie(baseURL!)]);
  await page.goto("/feed", { waitUntil: "domcontentloaded" });
  const row = page.getByRole("region", { name: "Community Stories" });
  await expect(row).toBeVisible();
  await expect(row.getByText("Your story")).toBeVisible();
  await expect(row.getByRole("button", { name: "Priya Raman’s story, not seen yet" })).toBeVisible();
  await expect(row.getByRole("button", { name: "Isabelle Tremblay’s story, not seen yet" })).toBeVisible();
  // Luc's story is for his connections only; a 9-day-old story has left the feed
  await expect(row.getByRole("button", { name: /Luc Bouchard/ })).toHaveCount(0);
});

test("the viewer plays a story, moves on, likes, and closes with Escape", async ({ page, context, baseURL }) => {
  await context.addCookies([memberCookie(baseURL!)]);
  await page.goto("/feed", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Priya Raman’s story, not seen yet" }).click();
  const box = page.getByRole("dialog", { name: "Story from Priya Raman" });
  await expect(box).toBeVisible();
  await expect(box.getByText("New this week: Maple Oat Sourdough.")).toBeVisible();
  await expect(box.locator("img.stfg")).toHaveAttribute("src", /\/api\/story-media\//);
  const like = box.getByRole("button", { name: "Like this story" });
  await like.click();
  await expect(box.getByRole("button", { name: "Unlike this story" })).toHaveAttribute("aria-pressed", "true");
  await box.getByRole("button", { name: "Pause" }).click();
  await expect(box.getByRole("button", { name: "Play" })).toBeVisible();
  // the next item: Isabelle's story follows Priya's
  await page.getByRole("button", { name: "Next story item" }).click();
  await expect(page.getByRole("dialog", { name: "Story from Isabelle Tremblay" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator("#stv")).toHaveCount(0);
});

test("a story's file is served through the checked address, and a hidden story's file is not", async ({ page, context, baseURL, request }) => {
  await context.addCookies([memberCookie(baseURL!)]);
  const ok = await page.request.get("/api/story-media/00000000-0000-4000-8000-000000570051");
  expect(ok.status()).toBe(200);
  expect(ok.headers()["content-type"]).toBe("image/jpeg");
  const hidden = await page.request.get("/api/story-media/00000000-0000-4000-8000-000000570054");
  expect(hidden.status()).toBe(404);
  const visitor = await request.get(`${baseURL}/api/story-media/00000000-0000-4000-8000-000000570051`);
  expect(visitor.status()).toBe(404);
});

test("reporting a story asks for a reason", async ({ page, context, baseURL }) => {
  await context.addCookies([memberCookie(baseURL!)]);
  await page.goto("/feed", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Priya Raman’s story, not seen yet" }).click();
  await page.getByRole("button", { name: "More options" }).click();
  await page.getByRole("menuitem", { name: "Report story" }).click();
  const dlg = page.getByRole("dialog", { name: "Report this story" });
  await dlg.getByRole("radio", { name: "Spam or selling" }).click();
  await dlg.getByRole("button", { name: "Send report" }).click();
  await expect(page.locator(".toast")).toHaveText("Thanks. The Hub team will review this story.");
});

test("the New story window shows the limits from Stories settings and refuses a wrong file", async ({ page, context, baseURL }) => {
  await context.addCookies([memberCookie(baseURL!)]);
  await page.goto("/feed", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Add to your story" }).first().click();
  const dlg = page.getByRole("dialog", { name: "New story" });
  await expect(dlg.getByText("Up to 5 per story · JPG, PNG, WebP, MP4, MOV, WebM · up to 25 MB · videos up to 30 seconds")).toBeVisible();
  await expect(dlg.getByLabel("Who can see this")).toHaveValue("members");
  await expect(dlg.getByRole("button", { name: "Publish story" })).toBeDisabled();
  await dlg.locator("#stfile").setInputFiles({ name: "notes.gif", mimeType: "image/gif", buffer: Buffer.from("GIF89a") });
  await expect(dlg.getByText("This file type is not allowed. Use JPG, PNG, WebP, MP4, MOV, WebM.")).toBeVisible();
  await expect(dlg.getByText("Remove or retry the items marked in red before you publish.")).toBeVisible();
  await dlg.getByRole("button", { name: "Remove notes.gif" }).click();
  await expect(dlg.getByText("This file type is not allowed")).toHaveCount(0);
});

test("Stories settings that allow only paid members stop a free member from posting", async ({ page, context, baseURL }) => {
  await context.addCookies([memberCookie(baseURL!, false, { stories: { publish: "paid" } })]);
  await page.goto("/feed", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("button", { name: "Add to your story" })).toHaveCount(1);
  await page.getByRole("button", { name: "Add to your story" }).click();
  await expect(page.locator(".toast")).toHaveText("Stories are for SMB Plus members and Advisors right now");
});

test("a profile shows today's story and highlights", async ({ page, context, baseURL }) => {
  await context.addCookies([memberCookie(baseURL!)]);
  await page.goto("/members/00000000-0000-4000-8000-000000000011", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Stories and highlights" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Today’s story from Priya Raman" })).toBeVisible();
  await page.getByRole("button", { name: "Highlight: Behind the Scenes" }).click();
  const box = page.getByRole("dialog", { name: "Story from Priya Raman" });
  await expect(box.getByText("Behind the Scenes")).toBeVisible();
  await expect(box.getByText("Packing our first wholesale order.")).toBeVisible();
});

test("moderators review stories in Moderation", async ({ page, context, baseURL }) => {
  await context.addCookies([memberCookie(baseURL!, true)]);
  await page.goto("/moderation?tab=stories", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Waiting for approval" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Reported stories" })).toBeVisible();
  await expect(page.getByText("Approval is off in Stories settings, so new stories publish straight away.")).toBeVisible();
});

for (const dark of [false, true]) {
  test(`the story viewer has no serious accessibility problems (${dark ? "dark" : "light"})`, async ({ page, context, baseURL }) => {
    await context.addCookies([memberCookie(baseURL!)]);
    if (dark) await page.emulateMedia({ colorScheme: "dark" });
    await page.goto("/feed", { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: "Priya Raman’s story, not seen yet" }).click();
    await page.getByRole("button", { name: "Pause" }).click();
    const r = await new AxeBuilder({ page }).include("#stv").analyze();
    expect(r.violations.filter((v) => ["serious", "critical"].includes(v.impact ?? ""))).toEqual([]);
  });
}

// ===== Made in Canada Pavilion =====
test("the pavilion lists exhibitors with their Canadian claims and filters them", async ({ page }) => {
  await page.goto("/pavilion", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Buy from, build with and back Canadian businesses", level: 1 })).toBeVisible();
  await expect(page.getByText("13 exhibitors").first()).toBeVisible();
  await page.getByRole("button", { name: "Software and AI tools (3)" }).click();
  await expect(page.getByText("3 exhibitors")).toBeVisible();
  await expect(page.getByRole("button", { name: "Harbour Forecast" })).toBeVisible();
  await page.getByRole("button", { name: "All exhibitors (13)" }).click();
  await page.getByRole("group", { name: "Claim" }).getByRole("button", { name: "Product of Canada" }).click();
  await expect(page.getByText("1 exhibitor", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Atelier Bouchard" }).click();
  const dlg = page.getByRole("dialog", { name: "Atelier Bouchard" });
  await expect(dlg.getByText("Canadian claims, declared by the seller")).toBeVisible();
  await expect(dlg.getByRole("link", { name: "Ask for an introduction" })).toHaveAttribute("href", "/auth/sign-up");
});

test("a member asks for an introduction and exhibits a product for review", async ({ page, context, baseURL }) => {
  await context.addCookies([memberCookie(baseURL!)]);
  await page.goto("/pavilion", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("link", { name: "Ask for an introduction" }).first()).toHaveAttribute("href", /\/messages\?with=.+&text=Hi%20/);
  await page.getByRole("button", { name: "Exhibit your product free" }).first().click();
  const dlg = page.getByRole("dialog", { name: "Exhibit in the Made in Canada Pavilion" });
  await dlg.getByLabel("Product or business name").fill("Test Bakery");
  await dlg.getByLabel("What you make or do, in one sentence").fill("Sourdough and pastries for cafes in Toronto.");
  await dlg.getByRole("button", { name: "Send for review" }).click();
  await expect(page.locator(".toast")).toHaveText("Please tick the box to confirm your claim");
  await dlg.getByRole("checkbox").check();
  await dlg.getByRole("button", { name: "Send for review" }).click();
  await expect(page.locator(".toast")).toHaveText("Sent to the Hub team for review");
  await expect(page.getByText("Your listing · waiting for the Hub team")).toBeVisible();
});

// ===== Ask the Hub =====
test("Ask the Hub answers from member posts and members who can help, and counts the allowance", async ({ page, context, baseURL, request }) => {
  await request.get(`${MOCK}/__reset_ask`);
  await context.addCookies([memberCookie(baseURL!)]);
  await page.goto("/ask", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: /Ask the Hub/, level: 1 })).toBeVisible();
  await expect(page.getByText("10 of 10 free questions left this month")).toBeVisible();
  await page.getByLabel("Your question").fill("How should I price wholesale orders?");
  await page.getByRole("button", { name: "Ask", exact: true }).click();
  await expect(page.getByRole("heading", { name: "How should I price wholesale orders?" })).toBeVisible();
  await expect(page.getByText("What members have said")).toBeVisible();
  await expect(page.getByText("Start from your cost per unit")).toBeVisible();
  await expect(page.getByRole("link", { name: "Luc Bouchard" })).toBeVisible();
  await expect(page.getByText("9 of 10 free questions left this month")).toBeVisible();
  await expect(page.getByRole("link", { name: "Ask the community" })).toHaveAttribute("href", /\/feed\?compose=question&text=How/);
});

test("visitors are asked to join before asking", async ({ page }) => {
  await page.goto("/ask", { waitUntil: "domcontentloaded" });
  await expect(page.getByText("Join free to ask the Hub’s AI assistant. Free members get 10 questions a month.")).toBeVisible();
});

// ===== AI matchmaking =====
test("AI matchmaking: five questions, then matches with reasons and a call to book", async ({ page, context, baseURL, request }) => {
  await request.get(`${MOCK}/__reset_matches`);
  await context.addCookies([memberCookie(baseURL!)]);
  await page.goto("/matches", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: /Meet the right owner/, level: 1 })).toBeVisible();
  await expect(page.getByText("Question 1 of 5 · Your goal")).toBeVisible();
  await page.getByRole("button", { name: /Expert advice/ }).click();
  await page.getByRole("button", { name: "Next" }).click();
  await page.getByRole("button", { name: "Lease advice" }).click();
  await page.getByRole("button", { name: "Next" }).click();
  await page.getByRole("button", { name: "Next" }).click();
  await page.getByRole("button", { name: "Next" }).click();
  await expect(page.getByRole("heading", { name: "Ready to find your matches?" })).toBeVisible();
  await expect(page.getByText("Lease advice", { exact: true }).last()).toBeVisible();
  await page.getByRole("button", { name: "Find my matches" }).click();
  await expect(page.getByText("Your best match")).toBeVisible();
  await expect(page.getByRole("link", { name: "Kwame Asante" })).toBeVisible();
  await expect(page.getByText("Can help you with lease advice").first()).toBeVisible();
  await expect(page.getByRole("img", { name: "Match score 88 percent" }).last()).toBeVisible();
  await page.locator(".mtop .mslot").first().click();
  await expect(page.getByText("Introduction booked.")).toBeVisible();
  await expect(page.locator(".toast")).toHaveText("Booked with Kwame Asante");
});

test("visitors see the matchmaking page and are asked to join", async ({ page }) => {
  await page.goto("/matches", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("link", { name: "Join free to get matched" })).toBeVisible();
});

test("Home shows the Good morning card with people worth meeting once the member has answered", async ({ page, context, baseURL, request }) => {
  await request.get(`${MOCK}/__reset_matches`);
  await context.addCookies([memberCookie(baseURL!)]);
  await page.goto("/feed", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("link", { name: "Say who you want to meet" })).toBeVisible();
  await page.goto("/matches", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Next" }).click();
  await page.getByRole("button", { name: "Bookkeeping" }).click();
  for (let i = 0; i < 3; i++) await page.getByRole("button", { name: "Next" }).click();
  await page.getByRole("button", { name: "Find my matches" }).click();
  await expect(page.getByText("Your best match")).toBeVisible();
  await page.goto("/feed", { waitUntil: "domcontentloaded" });
  await expect(page.getByText(/people are worth meeting today/)).toBeVisible();
  await expect(page.getByRole("link", { name: "Draft a message" }).first()).toHaveAttribute("href", /\/messages\?with=/);
});
