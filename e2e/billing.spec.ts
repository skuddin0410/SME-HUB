import { expect, test } from "@playwright/test";
import { memberCookie } from "./personas";

// Phase 6: the plans page, and the webhook before Stripe is connected.

test("the plans page matches the design: monthly first, three plans, Founding offer", async ({ page }) => {
  await page.goto("/membership-plans");
  await expect(page.getByRole("heading", { name: "Join free. Upgrade when it pays for itself." })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Plus", exact: true })).toBeVisible();
  await expect(page.getByText("Or $190 a year, 2 months free")).toBeVisible();
  await expect(page.getByText("$1,990")).toBeVisible();
  await expect(page.getByText("Founding Member offer: Plus for $99 in year one")).toBeVisible();
  // retry the click: a link pressed before the page has hydrated can be swallowed on a slow runner
  await expect(async () => {
    await page.getByRole("link", { name: /Pay yearly/ }).click();
    await expect(page.getByText("Works out to under $16 a month")).toBeVisible({ timeout: 3000 });
  }).toPass({ timeout: 20000 });
});

test("the plans page has the comparison table, the fit guide and the questions", async ({ page }) => {
  await page.goto("/membership-plans");
  const table = page.getByRole("table");
  await expect(table.getByRole("row", { name: /Host a private group/ })).toContainText("3 groups");
  await expect(table.getByRole("row", { name: /Post offers to members/ })).toContainText("None");
  await expect(page.getByText("Stay on Free if…")).toBeVisible();
  await expect(page.getByText("Is the free plan really free?")).toBeVisible();
  await expect(page.getByText("Partner plans start at $5,000 a year")).toBeVisible();
});

test("a visitor is sent to sign up to upgrade", async ({ page }) => {
  await page.goto("/membership-plans");
  await expect(page.getByRole("link", { name: "Upgrade to Plus" })).toHaveAttribute("href", "/auth/sign-up");
  await expect(page.getByRole("link", { name: "Apply as an Advisor" })).toBeVisible();
});

test("the Stripe webhook refuses to work until Stripe is connected", async ({ request }) => {
  const res = await request.post("/api/stripe/webhook", { data: "{}" });
  expect(res.status()).toBe(503);
});

test("the checkout notice shows when Stripe is not set up", async ({ page }) => {
  await page.goto("/membership-plans?billing=unavailable");
  await expect(page.getByRole("status")).toContainText("Online checkout is being set up");
});

test("a member sees their plan, limits and the downgrade rules on the billing page", async ({ page, context, baseURL }) => {
  await context.addCookies([memberCookie(baseURL!)]);
  await page.goto("/billing");
  await expect(page.getByRole("heading", { name: "Plan and billing" })).toBeVisible();
  await expect(page.getByText("Current plan")).toBeVisible();
  await expect(page.getByText("What your plan allows")).toBeVisible();
  await expect(page.getByText("Nothing you made is deleted")).toBeVisible();
});
