import { expect, test } from "@playwright/test";
import { memberCookie } from "./personas";

// Phase 6: the plans page, and the webhook before Stripe is connected.

test("the plans page shows three plans, yearly by default, and what each allows", async ({ page }) => {
  await page.goto("/membership-plans");
  await expect(page.getByRole("heading", { name: "Membership plans" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Plus", exact: true })).toBeVisible();
  await expect(page.getByText("$190")).toBeVisible();
  await expect(page.getByText("$1,990")).toBeVisible();
  const table = page.getByRole("table");
  await expect(table.getByRole("row", { name: /Private groups/ })).toContainText("Not included");
  await expect(table.getByRole("row", { name: /Profile viewers/ })).toContainText("All");
  await page.getByRole("link", { name: "Monthly" }).click();
  await expect(page.getByText("$19", { exact: true })).toBeVisible();
  await expect(page.getByText("Advisor is billed yearly.")).toBeVisible();
});

test("the plans page explains what happens on a downgrade and the Founding badge", async ({ page }) => {
  await page.goto("/membership-plans");
  await expect(page.getByText("Nothing you made is deleted")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Founding Member" })).toBeVisible();
});

test("a visitor is sent to sign up to upgrade", async ({ page }) => {
  await page.goto("/membership-plans");
  await expect(page.getByRole("link", { name: "Sign up to upgrade" })).toHaveCount(2);
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
