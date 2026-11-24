import { expect, test } from "@playwright/test";

test("about page has the hero, the magazine, the six ways to grow and the briefing sign-up (Update 15)", async ({ page }) => {
  await page.goto("/about", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: /Where Canada’s small business owners meet, learn and grow/, level: 1 })).toBeVisible();
  await expect(page.getByRole("heading", { name: "The magazine" })).toBeVisible();
  await expect(page.locator(".xmagpast li")).toHaveCount(5);
  await expect(page.locator(".xabcard")).toHaveCount(6);
  await expect(page.locator(".xfamcard")).toHaveCount(4);
  await expect(page.getByRole("heading", { name: "Get the weekly Hub briefing" })).toBeVisible();
});

test("help centre shows the contact details", async ({ page }) => {
  await page.goto("/help/contact-support", { waitUntil: "domcontentloaded" });
  await expect(page.getByText("support@smehub.ca").first()).toBeVisible();
});

test("contact form asks for a message and sends it", async ({ page }) => {
  await page.goto("/contact", { waitUntil: "networkidle" });
  await page.getByLabel("Your name").fill("Pat Lee");
  await page.getByLabel("Your email").fill("pat@example.com");
  await page.getByLabel("Your message").fill("Can I list two locations?");
  await page.getByRole("button", { name: "Send message" }).click();
  await expect(page.getByRole("status")).toContainText("Thanks");
});

test("privacy policy and terms render in the policy frame", async ({ page }) => {
  await page.goto("/policies/privacy-policy", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Privacy policy", level: 1 })).toBeVisible();
  await expect(page.getByText("What we collect")).toBeVisible();
  await page.goto("/policies/terms", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Terms and conditions", level: 1 })).toBeVisible();
});

test("magazine page shows the latest issue reader", async ({ page }) => {
  await page.goto("/magazine", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "CanadianSME Small Business Magazine", level: 1 })).toBeVisible();
  await expect(page.getByRole("link", { name: "Small Business Podcast" }).first()).toBeVisible();
});
