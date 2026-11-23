import { expect, test } from "@playwright/test";

test("the events page lists the sessions and lets you save a seat", async ({ page }) => {
  await page.goto("/events");
  await expect(page.getByRole("heading", { name: "Events", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Founding members welcome call" })).toBeVisible();
  await expect(page.getByText("Date to be announced")).toBeVisible();
  await expect(page.getByRole("button", { name: "Save my seat" }).first()).toBeVisible();
});
