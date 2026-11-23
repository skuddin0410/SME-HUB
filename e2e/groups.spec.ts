import { expect, test } from "@playwright/test";

// Phase 5: the groups list and a group page, against the mock database.

test("the groups list shows type, members and how to join", async ({ page }) => {
  await page.goto("/groups");
  await expect(page.getByRole("heading", { name: "Find the owners who face what you face" })).toBeVisible();
  const card = page.locator(".grpcard", { hasText: "Retail owners" });
  await expect(card).toContainText("Industry");
  await expect(card).toContainText("12 members");
  await expect(card.getByRole("link", { name: "Open group" })).toBeVisible();
  const priv = page.locator(".grpcard", { hasText: "Founders circle" });
  await expect(priv).toContainText("Private");
  await expect(priv.getByRole("link", { name: "Request to join" })).toBeVisible();
  await expect(page.getByRole("searchbox", { name: "Search groups" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Start a group/ }).first()).toBeVisible();
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
