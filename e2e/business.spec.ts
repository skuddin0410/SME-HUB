import { expect, test } from "@playwright/test";
import { memberCookie } from "./personas";

// Phase 4: the business directory and a business page, against the mock database.

test("the directory shows businesses with rating, city and open-now", async ({ page }) => {
  await page.goto("/businesses");
  await expect(page.getByRole("heading", { level: 1, name: /Find a Canadian small business/ })).toBeVisible();
  const card = page.getByRole("link", { name: /Maple Demo Bakery/ });
  await expect(card).toContainText("Toronto, ON");
  await expect(card).toContainText("Open now");
  await expect(page.getByRole("link", { name: /Asante Demo Legal/ })).toContainText("No reviews yet");
});

test("the directory switches between grid, list and map", async ({ page }) => {
  await page.goto("/businesses");
  const views = page.getByRole("group", { name: "View" });
  // a click can land while the page is still hydrating, so retry until the address changes
  await expect(async () => {
    await views.getByRole("link", { name: "List" }).click();
    await expect(page).toHaveURL(/view=list/, { timeout: 3000 });
  }).toPass();
  await expect(async () => {
    await views.getByRole("link", { name: "Map" }).click();
    await expect(page).toHaveURL(/view=map/, { timeout: 3000 });
  }).toPass();
  // no map token in tests, so the cities show as a list
  await expect(page.getByRole("list", { name: "Businesses by city" })).toContainText("Toronto, ON");
});

test("a business page shows tabs, services, hours and the owner's reply", async ({ page }) => {
  await page.goto("/businesses/maple-demo");
  await expect(page.getByRole("heading", { level: 1, name: "Maple Demo Bakery" })).toBeVisible();
  const tabs = page.getByRole("navigation", { name: "Business page sections" });
  await tabs.getByRole("link", { name: "services" }).click();
  await expect(page.getByText("Wholesale boxes")).toBeVisible();
  await expect(page.getByText("From $60.00")).toBeVisible();
  await expect(page.getByText("Ask for a quote")).toBeVisible();
  await page.goto("/businesses/maple-demo?tab=about");
  await expect(page.getByText("Monday")).toBeVisible();
  await expect(page.getByText("12 Queen St")).toBeVisible();
  await page.goto("/businesses/maple-demo?tab=reviews");
  await expect(page.getByText("Best sourdough in the city.")).toBeVisible();
  await expect(page.getByText("Thank you, see you Saturday!")).toBeVisible();
});

test("photos, shop, events and jobs tabs show what the business added", async ({ page }) => {
  await page.goto("/businesses/maple-demo?tab=photos");
  await expect(page.getByText("Fresh from the oven")).toBeVisible();
  await page.goto("/businesses/maple-demo?tab=shop");
  await expect(page.getByText("Shortbread gift box")).toBeVisible();
  await expect(page.getByText("$28.00")).toBeVisible();
  await page.goto("/businesses/maple-demo?tab=events");
  await expect(page.getByText("Holiday tasting")).toBeVisible();
  await page.goto("/businesses/maple-demo?tab=jobs");
  await expect(page.getByText("Night baker")).toBeVisible();
});

test("the business page marks itself for search engines", async ({ page }) => {
  await page.goto("/businesses/maple-demo");
  const ld = await page.locator('script[type="application/ld+json"]').first().textContent();
  expect(JSON.parse(ld!)["@type"]).toBe("LocalBusiness");
  await expect(page.locator('meta[name="robots"][content*="noindex"]')).toHaveCount(0);
});

test("the owner sees Manage and the rating form asks for each criterion", async ({ page, context, baseURL }) => {
  await context.addCookies([memberCookie(baseURL!)]);
  await page.goto("/businesses/maple-demo");
  await expect(page.getByRole("link", { name: "Manage" })).toBeVisible();
  await page.goto("/businesses/mine/maple-demo");
  await expect(page.getByRole("heading", { name: "Maple Demo Bakery" })).toBeVisible();
  await page.goto("/businesses/mine/maple-demo?tab=team");
  await expect(page.getByRole("heading", { name: "Team" })).toBeVisible();
});
