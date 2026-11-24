import { expect, test } from "@playwright/test";

test("the advisors page lists advisors with their field, rating and services", async ({ page }) => {
  await page.goto("/smb-advisor", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "SME Advisors", level: 1 })).toBeVisible();
  await expect(page.getByRole("link", { name: "Priya Raman" })).toBeVisible();
  await expect(page.getByText("64 members helped")).toBeVisible();
  await expect(page.getByText("Wholesale readiness check")).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Expertise" }).getByRole("link", { name: "Food and retail" })).toBeVisible();
  await expect(page.getByRole("link", { name: "See the Advisor plan" })).toBeVisible();
});
