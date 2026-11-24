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

test("settings shows privacy choices, data download and a guarded close-account", async ({ page }) => {
  await page.goto("/settings", { waitUntil: "networkidle" });
  await expect(page.getByRole("heading", { name: "Privacy and account", level: 1 })).toBeVisible();
  await expect(page.getByLabel("Who can see Helps with")).toHaveValue("public");
  await expect(page.getByLabel("Who can see Helps with").locator("option")).toHaveText(["Public", "All members", "My connections", "Only me"]);
  await expect(page.getByText("set by the Hub team").first()).toBeVisible();
  await expect(page.getByRole("link", { name: "Download my data" })).toHaveAttribute("href", "/settings/export");
  await expect(page.getByRole("button", { name: "Close my account" })).toBeDisabled();
  await page.getByRole("switch", { name: "I understand the consequences" }).click();
  await expect(page.getByRole("button", { name: "Close my account" })).toBeEnabled();
  await page.getByRole("button", { name: "Close my account" }).click();
  await expect(page.getByText("Type DELETE to confirm.", { exact: true })).toBeVisible();
});

test("blocked members page explains how to block and lists nobody when empty", async ({ page }) => {
  await page.goto("/blocked", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Blocked members", level: 1 })).toBeVisible();
  await expect(page.getByText("You have not blocked anyone.")).toBeVisible();
});

test("courses page is the catalogue from the guide", async ({ page }) => {
  await page.goto("/courses", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: /Learn what your business needs/, level: 1 })).toBeVisible();
  await expect(page.getByRole("link", { name: "My learning" }).first()).toBeVisible();
});

test("who viewed your profile shows the 30-day chart and the upgrade note for hidden viewers", async ({ page }) => {
  await page.goto("/profile/views", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("img", { name: /Profile views per day/ })).toBeVisible();
  await expect(page.getByText("2 more members viewed your profile")).toBeVisible();
  await expect(page.getByRole("link", { name: "See membership plans" })).toBeVisible();
});

test("the member directory filters by place and shows the chosen member beside the map", async ({ page }) => {
  await page.goto("/members", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Member directory" })).toBeVisible();
  await expect(page.getByText("Members · 8")).toBeVisible();
  await expect(page.getByRole("button", { name: /Priya Raman/ }).first()).toBeVisible();
  // choosing a member shows their details under the map
  await page.getByRole("button", { name: /Luc Bouchard/ }).first().click();
  await expect(page.getByRole("link", { name: "Send message" })).toBeVisible();
  await expect(page.getByRole("link", { name: "View profile" })).toHaveAttribute("href", /\/members\/00000000/);
  // the place filter goes into the address
  await page.getByLabel("Location").selectOption("ON");
  await expect(page).toHaveURL(/province=ON/);
  // the extra filters open from Profile search
  await page.getByRole("button", { name: /Profile search/ }).click();
  await expect(page).toHaveURL(/more=1/);
  await expect(page.getByLabel("Can help with")).toBeVisible();
  await expect(page.getByLabel("Availability")).toBeVisible();
});

test("the member directory switches between cards and a list", async ({ page }) => {
  await page.goto("/network", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "List" }).click();
  await expect(page.locator(".dirlist")).toBeVisible();
  await page.getByRole("button", { name: "Grid" }).click();
  await expect(page.locator(".dirgrid")).toBeVisible();
});

test("a member profile shows the guide's header, tabs and recommendations", async ({ page }) => {
  await page.goto("/members/00000000-0000-4000-8000-000000000011", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Priya Raman" })).toBeVisible();
  await expect(page.getByText("Founding Member")).toBeVisible();
  await expect(page.getByText("Recommended by 2").first()).toBeVisible();
  await expect(page.getByText("10 connections")).toBeVisible();
  await expect(page.getByRole("button", { name: "Connect" }).first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Follow" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Recommendations" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "More profiles for you" })).toBeVisible();
  // the tabs are links, so each one has its own address
  const tabs = page.getByRole("navigation", { name: "Profile sections" });
  // retry the click: a link pressed before the page has hydrated can be swallowed on a slow runner
  await expect(async () => {
    await tabs.getByRole("link", { name: "Connections" }).click();
    await expect(page).toHaveURL(/tab=connections/, { timeout: 3000 });
  }).toPass({ timeout: 20000 });
  await expect(tabs.getByRole("link", { name: "Connections" })).toHaveAttribute("aria-current", "page");
  await expect(async () => {
    await tabs.getByRole("link", { name: "Groups" }).click();
    await expect(page.getByText("has not joined a public group yet")).toBeVisible({ timeout: 3000 });
  }).toPass({ timeout: 20000 });
  await expect(async () => {
    await tabs.getByRole("link", { name: "Blog" }).click();
    await expect(page.getByText("has not published a blog post yet")).toBeVisible({ timeout: 3000 });
  }).toPass({ timeout: 20000 });
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
  for (const path of ["/settings", "/profile/views", "/profile/edit", "/members", "/network"]) {
    test(`${path} fits a ${width}px screen`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(path, { waitUntil: "domcontentloaded" });
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow, "no sideways scroll").toBeLessThanOrEqual(1);
    });
  }
}
