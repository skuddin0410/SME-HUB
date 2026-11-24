import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { memberCookie } from "./personas";

const MEMBER_ID = "00000000-0000-4000-8000-000000000001";
/** a member who has already skipped the set-up window, so it does not open by itself over what a test does */
const skipSetup = (page: import("@playwright/test").Page) => page.addInitScript((id) => { try { localStorage.setItem("smehub.setup.skipped", id); } catch {} }, MEMBER_ID);

// Update 3: "Your profile is N of 5 ready", the set-up windows, soft limits, Member Spotlight, and the team's follow-up page.

test.describe("a member with 2 of 5 done", () => {
  test.beforeEach(async ({ context, baseURL, page }) => {
    await context.addCookies([memberCookie(baseURL!, false, undefined, { ready: 2 })]);
    await skipSetup(page);
  });

  test("Home shows the card with the missing steps, and the right rail says Profile ready 2 of 5", async ({ page }) => {
    await page.goto("/feed", { waitUntil: "domcontentloaded" });
    const card = page.locator("#pccard");
    await expect(card.getByRole("heading", { name: "Your profile is 2 of 5 ready" })).toBeVisible();
    await expect(card.getByText("3 steps left")).toBeVisible();
    for (const t of ["Add a profile photo", "Add your headline", "Add your city", "Say what you can help with", "Add your business page"]) await expect(card.getByText(t, { exact: true })).toBeVisible();
    await expect(card.getByText("Done")).toHaveCount(2);
    await expect(card.getByText("Let AI set it up from your website")).toBeVisible();
    await expect(page.getByText("Profile ready", { exact: true })).toBeVisible();
    await expect(page.getByText("2 of 5", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("Next: add your city")).toBeVisible();
    // the old percent meter is gone
    await expect(page.getByText("Profile strength")).toHaveCount(0);
  });

  test("with no real signal the yellow line is the plain sentence", async ({ page }) => {
    await page.goto("/feed", { waitUntil: "domcontentloaded" });
    await expect(page.locator(".pcmiss")).toContainText("Ready profiles show up in member search, the Directory and daily “People to meet”.");
  });

  test("the yellow line uses real numbers when there are 2 or more", async ({ context, baseURL, page }) => {
    await context.clearCookies();
    await context.addCookies([memberCookie(baseURL!, false, undefined, { ready: 2, searches: 5 })]);
    await page.goto("/feed", { waitUntil: "domcontentloaded" });
    await expect(page.locator(".pcmiss")).toContainText("5 owners searched the Business Directory for what you do this week.");
    await expect(page.locator(".pcmiss")).toContainText("Your business isn’t listed, so they didn’t find you.");
  });

  test("Add city opens a small window and Save asks for a value", async ({ page }) => {
    await page.goto("/feed", { waitUntil: "domcontentloaded" });
    await page.locator("#pccard").getByRole("button", { name: "Add" }).first().click();
    const dlg = page.getByRole("dialog");
    await expect(dlg.getByRole("heading", { name: "Your city" })).toBeVisible();
    await dlg.getByRole("button", { name: "Save" }).click();
    await expect(dlg.getByRole("alert")).toHaveText("Add your city");
    await dlg.getByRole("button", { name: "Cancel" }).click();
    await expect(dlg).toHaveCount(0);
  });

  test("Can help with: pick up to 5", async ({ page }) => {
    await page.goto("/feed", { waitUntil: "domcontentloaded" });
    await page.locator("#pccard").getByRole("button", { name: "Add" }).nth(1).click();
    const dlg = page.getByRole("dialog");
    await expect(dlg.getByRole("heading", { name: "What can you help with?" })).toBeVisible();
    for (const t of ["Bookkeeping", "Local marketing", "Hiring", "Websites", "Catering"]) await dlg.getByRole("button", { name: t, exact: true }).click();
    await dlg.getByRole("button", { name: "Sales", exact: true }).click();
    await expect(dlg.getByRole("alert")).toHaveText("Pick up to 5");
    await expect(dlg.getByRole("button", { name: "Sales", exact: true })).toHaveAttribute("aria-pressed", "false");
  });

  test("AI set-up: 3 questions give a draft to check, and the business page can be unticked", async ({ page }) => {
    await page.goto("/feed", { waitUntil: "domcontentloaded" });
    await page.locator("#pccard").getByRole("button", { name: "Set it up for me" }).click();
    const dlg = page.getByRole("dialog");
    await expect(dlg.getByRole("heading", { name: "Let AI set up your profile" })).toBeVisible();
    await dlg.getByRole("button", { name: "Skip for now. I’ll do it later." }).isVisible();
    await dlg.getByRole("button", { name: "No website? Answer 3 questions" }).click();
    await expect(dlg.getByRole("heading", { name: "3 quick questions" })).toBeVisible();
    await dlg.getByLabel("Business name").fill("Morgan Home Renovations");
    await dlg.getByLabel("2. Where are you based?").fill("Mississauga, ON");
    await dlg.getByLabel("3. What can you help other owners with?").fill("renovation quotes, hiring");
    await dlg.getByRole("button", { name: "Write my profile" }).click();
    await expect(dlg.getByRole("heading", { name: "Here’s your draft. Does it look right?" })).toBeVisible();
    await expect(dlg.getByText("Written from your answers.")).toBeVisible();
    await expect(dlg.getByText("Construction and trades · Mississauga, ON")).toBeVisible();
    await expect(dlg.getByText("Saved as a draft. You add your logo and hours, then submit it for review.")).toBeVisible();
    await dlg.getByLabel("Create it").uncheck();
    await expect(dlg.getByText("You can add your business page later from My Businesses.")).toBeVisible();
    await dlg.getByRole("button", { name: "Remove Hiring" }).click();
    await expect(dlg.getByRole("button", { name: "Remove Hiring" })).toHaveCount(0);
    const a11y = await new AxeBuilder({ page }).include("[role=dialog]").analyze();
    expect(a11y.violations).toEqual([]);
  });

  test("the Business Directory and Members show their banners; Connect asks nothing more when photo and headline exist", async ({ page }) => {
    await page.goto("/businesses", { waitUntil: "domcontentloaded" });
    await expect(page.getByText("Your business isn’t in the Directory yet")).toBeVisible();
    await page.goto("/members", { waitUntil: "domcontentloaded" });
    await expect(page.getByText("Other members can’t find you yet")).toBeVisible();
    await expect(page.getByText("You’re 2 of 5.")).toBeVisible();
  });

  test("the Spotlight page lists what is missing", async ({ page }) => {
    await page.goto("/spotlight", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "Get featured in CanadianSME" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Finish your profile to apply" })).toBeVisible();
    await expect(page.getByText("You’re 2 of 5 ready.")).toBeVisible();
  });
});

test("a new member who has not set up sees the AI window on first Home visit, and Skip keeps it closed", async ({ context, baseURL, page }) => {
  await context.addCookies([memberCookie(baseURL!, false, undefined, { ready: 1 })]);
  await page.goto("/feed", { waitUntil: "domcontentloaded" });
  const dlg = page.getByRole("dialog");
  await expect(dlg.getByRole("heading", { name: "Let AI set up your profile" })).toBeVisible();
  await dlg.getByRole("button", { name: "Skip for now. I’ll do it later." }).click();
  await expect(dlg).toHaveCount(0);
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.locator("#pccard")).toBeVisible();
  await page.waitForTimeout(1200);
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test.describe("a member with no photo or headline", () => {
  test.beforeEach(async ({ context, baseURL, page }) => {
    await context.addCookies([memberCookie(baseURL!, false, undefined, { ready: 0 })]);
    await skipSetup(page);
  });

  test("Connect opens “Add a photo and headline first”", async ({ page }) => {
    await page.goto("/members", { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: "Connect" }).first().click();
    const dlg = page.getByRole("dialog");
    await expect(dlg.getByRole("heading", { name: "Add a photo and headline first" })).toBeVisible();
    await expect(dlg.getByText("Add photo")).toBeVisible();
    await expect(dlg.getByRole("button", { name: "Save and send request" })).toBeVisible();
    await dlg.getByRole("button", { name: "Save and send request" }).click();
    await expect(page.getByText("Add a photo first")).toBeVisible();
    await dlg.getByRole("button", { name: "Not now" }).click();
    await expect(dlg).toHaveCount(0);
  });
});

test.describe("a member with a ready profile", () => {
  test.beforeEach(async ({ context, baseURL }) => {
    await context.addCookies([memberCookie(baseURL!)]);
  });

  test("Home has no card and the Spotlight form needs the consent box", async ({ page }) => {
    await page.goto("/feed", { waitUntil: "domcontentloaded" });
    await expect(page.locator("#pccard")).toHaveCount(0);
    await page.goto("/spotlight", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "Tell the editors about your business" })).toBeVisible();
    await expect(page.getByText("A Spotlight badge on your profile for 30 days")).toBeVisible();
    await page.getByLabel("What does your business do, and who for?").fill("We bake bread for cafés.");
    await page.getByLabel("One win or lesson other owners could learn from").fill("Wholesale to 12 cafés in two years.");
    await page.getByRole("button", { name: "Apply for the Spotlight" }).click();
    await expect(page.getByText("Tick the box so CanadianSME can feature you")).toBeVisible();
  });
});

test.describe("the Hub team", () => {
  test("Profile follow-up shows the numbers, the list, the filters and the other tabs", async ({ context, baseURL, page }) => {
    await context.addCookies([memberCookie(baseURL!, true)]);
    await page.goto("/profilefollow", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "Profile follow-up" })).toBeVisible();
    await expect(page.getByText("Joined in the last 7 days")).toBeVisible();
    await expect(page.getByText("37%")).toBeVisible();
    await expect(page.getByText("17 of 46 · target 40%")).toBeVisible();
    await expect(page.locator("strong", { hasText: "Nadia Rahman" })).toBeVisible();
    await expect(page.getByText("Founding Member").first()).toBeVisible();
    await expect(page.getByText("No headline")).toBeVisible();
    await expect(page.getByRole("link", { name: /Export CSV/ })).toHaveAttribute("href", "/profilefollow/export?f=all");
    await expect(async () => {
      await page.getByRole("button", { name: "Reminder emails" }).click();
      await expect(page.getByRole("heading", { name: "Profile reminder emails" })).toBeVisible({ timeout: 2500 });
    }).toPass();
    await expect(page.getByText("Day 12")).toBeVisible();
    await expect(async () => {
      await page.getByRole("button", { name: /Spotlight applications/ }).click();
      await expect(page).toHaveURL(/tab=spot/, { timeout: 2500 });
    }).toPass();
  });

  test("a member sees the team-only page, not the list", async ({ context, baseURL, page }) => {
    await context.addCookies([memberCookie(baseURL!)]);
    await page.goto("/profilefollow", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "This page is for the Hub team" })).toBeVisible();
    await expect(page.getByText("Nadia Rahman")).toHaveCount(0);
  });
});
