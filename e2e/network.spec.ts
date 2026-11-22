import { expect, test } from "@playwright/test";
import { memberCookie, SCREEN_WIDTHS } from "./personas";

// Phase 2: profile details, settings, who-viewed and the member directory, as a signed-in member.
const ME = "00000000-0000-4000-8000-000000000001";

test.beforeEach(async ({ context, baseURL }) => {
  await context.addCookies([memberCookie(baseURL!)]);
});

test("edit profile has the help, availability and social link fields", async ({ page }) => {
  await page.goto("/profile/edit", { waitUntil: "domcontentloaded" });
  await expect(page.getByLabel("I can help with")).toBeVisible();
  await expect(page.getByLabel("I am looking for")).toBeVisible();
  await expect(page.getByRole("checkbox", { name: "Evenings" })).toBeVisible();
  await expect(page.getByLabel("LinkedIn")).toBeVisible();
  await expect(page.getByLabel("I am a")).toBeVisible();
});

test("settings shows privacy choices, blocked members, data download and a guarded delete", async ({ page }) => {
  await page.goto("/settings", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Privacy" })).toBeVisible();
  await expect(page.getByLabel("Helps with")).toHaveValue("public");
  await expect(page.getByLabel("Helps with").locator("option")).toHaveText(["Public", "All members", "My connections", "Only me"]);
  await expect(page.getByText("You have not blocked anyone.")).toBeVisible();
  await expect(page.getByRole("link", { name: "Download my data" })).toHaveAttribute("href", "/settings/export");
  await page.getByRole("button", { name: "Delete my account" }).click();
  await expect(page.getByText("Type DELETE to confirm.", { exact: true }).last()).toBeVisible();
});

test("who viewed your profile shows the 30-day chart and the upgrade note for hidden viewers", async ({ page }) => {
  await page.goto("/profile/views", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("img", { name: /Profile views per day/ })).toBeVisible();
  await expect(page.getByText("2 more members viewed your profile")).toBeVisible();
  await expect(page.getByRole("link", { name: "See membership plans" })).toBeVisible();
});

test("directory filters go into the address and the results show", async ({ page }) => {
  await page.goto("/members", { waitUntil: "domcontentloaded" });
  await expect(page.getByText("Priya Raman")).toBeVisible();
  await page.getByLabel("Province").selectOption("ON");
  await page.getByLabel("Can help with").fill("Wholesale");
  await page.getByLabel("Availability").selectOption("Evenings");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await expect(page).toHaveURL(/province=ON/);
  await expect(page).toHaveURL(/help=Wholesale/);
  await expect(page).toHaveURL(/avail=Evenings/);
});

test("your own profile has Edit and no Follow button", async ({ page }) => {
  await page.goto(`/members/${ME}`, { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("link", { name: "Edit profile" }).first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Follow" })).toHaveCount(0);
});

test("the account menu links to settings and who viewed", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/feed", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: /\bMe$/ }).click();
  await expect(page.getByRole("link", { name: "Settings & privacy" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Who viewed your profile", exact: true })).toBeVisible();
});

for (const width of SCREEN_WIDTHS) {
  for (const path of ["/settings", "/profile/views", "/profile/edit", "/members"]) {
    test(`${path} fits a ${width}px screen`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(path, { waitUntil: "domcontentloaded" });
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow, "no sideways scroll").toBeLessThanOrEqual(1);
    });
  }
}
