import { expect, test } from "@playwright/test";

// Phase 5: the groups list and a group page, against the mock database.

test("the groups list shows type, members and how to join", async ({ page }) => {
  await page.goto("/groups");
  await expect(page.getByRole("heading", { name: "Groups", exact: true })).toBeVisible();
  const card = page.locator("a.panel", { hasText: "Retail owners" });
  await expect(card).toContainText("Industry");
  await expect(card).toContainText("12 members");
  await expect(card).toContainText("Join group");
  await expect(page.locator("a.panel", { hasText: "Founders circle" })).toContainText("Request to join");
  await expect(page.getByRole("searchbox", { name: "Search groups" }).or(page.getByRole("textbox", { name: "Search groups" }))).toBeVisible();
});

test("a group page has posts, members and rules tabs", async ({ page }) => {
  await page.goto("/groups/retail-owners");
  await expect(page.getByRole("heading", { name: "Retail owners" })).toBeVisible();
  const tabs = page.getByRole("navigation", { name: "Group sections" });
  await expect(tabs.getByRole("link", { name: "Rules" })).toBeVisible();
  await expect(tabs.getByRole("link", { name: "Manage" })).toHaveCount(0);
  await page.goto("/groups/retail-owners?tab=rules");
  await expect(page.getByText("Be kind.")).toBeVisible();
});
