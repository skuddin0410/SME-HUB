import { expect, test } from "@playwright/test";
import { memberCookie } from "./personas";

// Update 4: Courses, with the hand-off's sample courses (e2e/courses-fixture.json) in the mock.
const MOCK = "http://127.0.0.1:54398";
const MK = "/courses/local-marketing-on-a-200-budget";
const L = { mk1: "c9ea50aa-53ad-8358-952b-9ca993ab38a0", mk3: "b48fd907-e056-1aa3-d0f8-867bf533ff57", mk7: "7191adc7-53da-1012-606f-9b1c57aff46d", hire2: "cc50d8b4-2908-f76e-5865-605c60a2aeb4", cf5: "31ce3fad-7207-717d-3e6a-bad6de37009c" };
const CASHFLOW = "3e43f75e-d4c2-a57a-748d-590a2607d6b4";
test.beforeEach(async ({ request }) => { await request.get(`${MOCK}/__reset_courses`); });

test.describe("visitors", () => {
  test("see the catalogue, filters and quick look, and are asked to join to enrol", async ({ page }) => {
    await page.goto("/courses");
    await expect(page.getByRole("heading", { name: /Learn what your business needs/ })).toBeVisible();
    await expect(page.getByRole("heading", { name: "6 courses" })).toBeVisible();
    await expect(page.getByText("Build Your First Cash Flow Forecast")).toHaveCount(0); // drafts stay hidden
    await page.getByRole("button", { name: /^Exporting/ }).click();
    await expect(page.getByRole("heading", { name: "1 course" })).toBeVisible();
    await page.getByRole("button", { name: "Exporting ×" }).click();
    await page.getByLabel("Search courses").fill("pricing");
    await expect(page.getByRole("heading", { name: /0 courses|1 course/ })).toBeVisible();
    await page.goto(MK);
    await expect(page.getByRole("link", { name: "Enrol for free" }).first()).toHaveAttribute("href", "/auth/sign-up");
    await expect(page.getByText(/\d+ members are taking this course\. Join free to see who\./)).toBeVisible();
  });
  test("can watch only the free preview; locked lessons and their files are refused, even by address", async ({ page, request }) => {
    await page.goto(`${MK}/learn/${L.mk1}`);
    await expect(page.locator("video#crvid")).toBeVisible();
    await expect(page.getByText("Free preview").first()).toBeVisible();
    await page.goto(`/courses/hire-your-first-employee-in-ontario/learn/${L.hire2}`);
    await expect(page.getByText("This lesson is locked")).toBeVisible();
    expect((await request.get(`/api/course-media?l=${L.mk3}&k=video`)).status()).toBe(404);
    expect((await request.get(`/api/course-media?l=${L.mk1}&k=video`, { headers: { range: "bytes=0-99" } })).status()).toBe(206);
  });
  test("drafts are not available", async ({ page }) => {
    await page.goto("/courses/build-your-first-cash-flow-forecast");
    await expect(page.getByText("This course isn’t available")).toBeVisible();
  });
});

test.describe("members", () => {
  test.beforeEach(async ({ context, baseURL }) => { await context.addCookies([memberCookie(baseURL!)]); });
  test("continue learning, mark a reading complete and move on", async ({ page }) => {
    await page.goto("/courses");
    await expect(page.getByText("Next: Photos that sell · 2 of 7 done")).toBeVisible();
    await page.getByRole("button", { name: "Continue learning" }).click();
    await expect(page).toHaveURL(new RegExp(L.mk3));
    await page.getByRole("button", { name: "Mark complete and continue" }).click();
    await expect(page.getByText("3 of 7 complete")).toBeVisible();
  });
  test("enrol in a free course and land on the first lesson", async ({ page }) => {
    await page.goto("/courses/ai-tools-that-save-five-hours-a-week");
    await page.getByRole("button", { name: "Enrol for free" }).first().click();
    await expect(page).toHaveURL(/\/learn\//);
    await expect(page.getByRole("heading", { name: "Pick one task to hand to AI" })).toBeVisible();
  });
  test("submit an assignment and see it waiting for feedback", async ({ page }) => {
    await page.goto(`${MK}/learn/${L.mk7}`);
    await expect(page.getByText(/at 11:59 pm Eastern Time/)).toBeVisible();
    await page.getByRole("button", { name: "Submit assignment" }).click();
    await expect(page.getByText("Upload a file or paste your answer first")).toBeVisible();
    await page.getByLabel("Or paste your numbers and notes").fill("$0 Google profile, $120 boosted posts, $80 flyers. I will ask every customer.");
    await page.getByRole("button", { name: "Submit assignment" }).click();
    await expect(page.getByText("Waiting for feedback")).toBeVisible();
  });
  test("save a course, find it in Saved, and write a review after a finished lesson", async ({ page }) => {
    await page.goto("/courses/saved");
    await expect(page.getByRole("link", { name: "Export to the U.S.: Customs and Freight Basics" }).first()).toBeVisible();
    await page.goto(MK);
    await page.getByRole("button", { name: "Write a review" }).click();
    await page.getByRole("radio", { name: "5 stars" }).click();
    await page.getByLabel("What did you think?").fill("Clear plan that paid for itself in a week.");
    await page.getByRole("button", { name: "Post review" }).click();
    await expect(page.getByText("Clear plan that paid for itself in a week.")).toBeVisible();
  });
  test("paid courses open checkout with tax for the province", async ({ page }) => {
    await page.goto("/courses/hire-your-first-employee-in-ontario");
    await page.getByRole("button", { name: /Buy course · CAD \$49/ }).first().click();
    await expect(page.getByText("HST (13%, Ontario)")).toBeVisible();
    await expect(page.getByRole("button", { name: "Pay CAD $55.37" })).toBeVisible();
    await page.getByLabel("Your province or territory").selectOption("AB");
    await expect(page.getByText("GST (5%, Alberta)")).toBeVisible();
  });
  test("my learning has the classmates switch; teaching and team pages are closed", async ({ page }) => {
    await page.goto("/courses/my-learning");
    await expect(page.getByRole("switch", { name: "Show me as a classmate" })).toHaveAttribute("aria-checked", "true");
    await page.goto("/courses/manage");
    await expect(page.getByText("This page is for the Hub team")).toBeVisible();
    await page.goto(`/courses/edit/${CASHFLOW}`);
    await expect(page.getByText("This course isn’t available")).toBeVisible();
  });
});

test.describe("the Hub team", () => {
  test.beforeEach(async ({ context, baseURL }) => { await context.addCookies([memberCookie(baseURL!, true)]); });
  test("manages courses, edits a draft and previews it as a learner", async ({ page }) => {
    await page.goto("/courses/manage");
    await expect(page.getByRole("heading", { name: "Manage courses" })).toBeVisible();
    await expect(page.getByRole("row", { name: /Build Your First Cash Flow Forecast/ })).toContainText("Draft");
    await page.goto(`/courses/edit/${CASHFLOW}`);
    for (const t of ["Content", "Access and rules", "Instructors", "Publish"]) {
      await page.getByRole("tab", { name: t }).click();
      await expect(page.getByRole("tab", { name: t })).toHaveAttribute("aria-selected", "true");
    }
    await expect(page.getByText("Ready to publish?")).toBeVisible();
    await page.getByRole("button", { name: "Preview as a learner" }).first().click();
    await expect(page.getByText(/Learner preview\./)).toBeVisible();
    await page.goto(`/courses/build-your-first-cash-flow-forecast/learn/${L.cf5}`);
    await expect(page.getByText("This lesson is locked")).toBeVisible();
  });
  test("grades waiting work on Teaching", async ({ page }) => {
    await page.goto("/courses/teaching");
    await expect(page.getByRole("heading", { name: /To grade/ })).toContainText("2");
    await page.getByRole("button", { name: "Grade" }).first().click();
    await page.getByLabel("Marks out of 10").fill("8");
    await page.getByLabel(/Feedback for/).fill("Clear channels. Add dates to each step.");
    await page.getByRole("button", { name: "Send grade and feedback" }).click();
    await expect(page.getByRole("heading", { name: /To grade/ })).toContainText("1");
  });
});
