import { expect, test } from "@playwright/test";

test("guides index lists every province with its code", async ({ page }) => {
  await page.goto("/guides", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Business guides", level: 1 })).toBeVisible();
  await expect(page.getByRole("link", { name: /^AB\s*Alberta/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /^YT\s*Yukon/ })).toBeVisible();
});

test("a province guide has the checklist, key points and organisations", async ({ page }) => {
  await page.goto("/guides/alberta", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "The Alberta Small Business Guide", level: 1 })).toBeVisible();
  await expect(page.getByText("1. Choose your business structure")).toBeVisible();
  await expect(page.getByRole("link", { name: "Find owners in Alberta" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Visit website" }).first()).toBeVisible();
});

test("a resource centre has the guide's sections and start-here links", async ({ page }) => {
  await page.goto("/resources/indigenous-entrepreneurs", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Indigenous Entrepreneurs Resource Centre", level: 1 })).toBeVisible();
  await expect(page.getByText("Holistic support").first()).toBeVisible();
  await expect(page.getByRole("link", { name: "Find an advisor" })).toBeVisible();
  await page.goto("/resources", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("link", { name: /Women Entrepreneurs Resource Centre/ })).toBeVisible();
});
