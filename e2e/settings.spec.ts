import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { memberCookie } from "./personas";

const PAGES: [string, string][] = [["/profilesettings", "Profile and directory settings"], ["/feedsettings", "Feed settings"], ["/groupsettings", "Group settings"], ["/blogsettings", "Member blog settings"], ["/hashtagsettings", "Hashtag settings"], ["/storysettings", "Stories settings"]];

for (const [path, title] of PAGES) {
  test(`a member sees the team gate on ${path}`, async ({ page, context, baseURL }) => {
    await context.addCookies([memberCookie(baseURL!)]);
    await page.goto(path, { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "This page is for the Hub team" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Save changes" })).toHaveCount(0);
  });
  test(`the team sees ${title} and can change a choice`, async ({ page, context, baseURL }) => {
    await context.addCookies([memberCookie(baseURL!, true)]);
    await page.goto(path, { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: title, level: 1 })).toBeVisible();
    const save = page.getByRole("button", { name: "Save changes" });
    await expect(save).toBeDisabled();
    await page.getByRole("switch").first().click();
    await expect(save).toBeEnabled();
    await expect(page.getByText("You have changes that are not saved yet.")).toBeVisible();
  });
  for (const dark of [false, true]) {
    test(`${path} ${dark ? "dark" : "light"} has no serious accessibility problems`, async ({ page, context, baseURL }) => {
      await context.addCookies([memberCookie(baseURL!, true)]);
      await page.addInitScript((d) => { try { localStorage.setItem("smbhub.theme", d ? "dark" : "light"); } catch {} }, dark);
      await page.goto(path, { waitUntil: "networkidle" });
      const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
      expect(r.violations.filter((v) => v.impact === "serious" || v.impact === "critical").map((v) => `${v.id}: ${v.nodes.length} (${v.nodes[0]?.target?.join(" ")})`)).toEqual([]);
    });
  }
}

test("profile settings: reorder a tab, add a field and a type", async ({ page, context, baseURL }) => {
  await context.addCookies([memberCookie(baseURL!, true)]);
  await page.goto("/profilesettings", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Move Posts up" }).click();
  await expect(page.getByRole("button", { name: "Move Posts up" })).toBeDisabled();
  await page.getByLabel("New field name").fill("Languages spoken");
  await page.getByRole("button", { name: "Add field" }).click();
  await expect(page.getByText("Languages spoken", { exact: true })).toBeVisible();
  await page.getByLabel("New profile type").fill("Investor");
  await page.getByRole("button", { name: "Add type" }).click();
  await expect(page.getByText("Investor").first()).toBeVisible();
});

test("hashtag settings: block a word, then unblock it", async ({ page, context, baseURL }) => {
  await context.addCookies([memberCookie(baseURL!, true)]);
  await page.goto("/hashtagsettings", { waitUntil: "domcontentloaded" });
  await page.getByLabel("Word to block").fill("crypto");
  await page.getByRole("button", { name: "Add", exact: true }).click();
  await expect(page.getByRole("button", { name: "Unblock crypto" })).toBeVisible();
  await page.getByRole("button", { name: "Unblock crypto" }).click();
  await expect(page.getByRole("button", { name: "Unblock crypto" })).toHaveCount(0);
});

test("automations: use a prebuilt workflow, queue a post", async ({ page, context, baseURL }) => {
  await context.addCookies([memberCookie(baseURL!, true)]);
  await page.goto("/automations", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Automations", level: 1 })).toBeVisible();
  await expect(page.getByRole("button", { name: /Welcome new members/ })).toBeVisible();
  await page.getByRole("tab", { name: "Prebuilt workflows" }).click();
  await page.getByRole("button", { name: "Use this workflow" }).first().click();
  await expect(page.getByRole("tab", { name: /Workflow builder \(4\)/ })).toBeVisible();
  await page.getByRole("tab", { name: /Scheduled posts/ }).click();
  await page.getByLabel("Post text").fill("Friday wins: share one good thing.");
  await page.getByRole("button", { name: "Schedule post" }).click();
  await expect(page.getByText("Friday wins: share one good thing.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Save changes" })).toBeEnabled();
});

test("business profiles: gate, queues, settings", async ({ page, context, baseURL }) => {
  await context.addCookies([memberCookie(baseURL!)]);
  await page.goto("/bizadmin", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "This page is for the Hub team" })).toBeVisible();
  await context.clearCookies();
  await context.addCookies([memberCookie(baseURL!, true)]);
  await page.goto("/bizadmin", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Business Profiles", level: 1 })).toBeVisible();
  await expect(page.getByRole("heading", { name: "New listings" })).toBeVisible();
  await page.goto("/bizadmin?tab=settings", { waitUntil: "domcontentloaded" });
  await page.getByRole("switch").first().click();
  await expect(page.getByRole("button", { name: "Save changes" })).toBeEnabled();
  await page.goto("/bizadmin?tab=cats", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Categories" })).toBeVisible();
});

for (const p of ["/automations", "/bizadmin", "/bizadmin?tab=all", "/bizadmin?tab=cats", "/bizadmin?tab=settings"]) {
  for (const dark of [false, true]) {
    test(`${p} ${dark ? "dark" : "light"} has no serious accessibility problems`, async ({ page, context, baseURL }) => {
      await context.addCookies([memberCookie(baseURL!, true)]);
      await page.addInitScript((d) => { try { localStorage.setItem("smbhub.theme", d ? "dark" : "light"); } catch {} }, dark);
      await page.goto(p, { waitUntil: "networkidle" });
      const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
      expect(r.violations.filter((v) => v.impact === "serious" || v.impact === "critical").map((v) => `${v.id}: ${v.nodes.length} (${v.nodes[0]?.target?.join(" ")})`)).toEqual([]);
    });
  }
}

// Update 8: the team picks the Help home's popular searches and most asked questions.
test("Help Centre settings: members see the gate, the team edits searches and questions", async ({ page, context, baseURL }) => {
  await context.addCookies([memberCookie(baseURL!)]);
  await page.goto("/helpsettings", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "This page is for the Hub team" })).toBeVisible();
  await context.clearCookies();
  await context.addCookies([memberCookie(baseURL!, true)]);
  await page.goto("/helpsettings", { waitUntil: "networkidle" });
  await expect(page.getByRole("heading", { name: "Help Centre settings", level: 1 })).toBeVisible();
  const save = page.getByRole("button", { name: "Save changes" });
  await expect(save).toBeDisabled();
  await page.getByRole("button", { name: "Remove report" }).click();
  await page.getByLabel("Add a popular search").fill("invoices");
  await page.getByRole("button", { name: "Add", exact: true }).click();
  await expect(page.locator(".tag", { hasText: "invoices" })).toBeVisible();
  await expect(page.getByText("Until you choose, Help home shows the articles marked popular.")).toBeVisible();
  await expect(page.getByText("8 chosen. Remove one to add another.")).toBeVisible();
  await page.getByRole("button", { name: "Create your account", exact: true }).click(); // take one off
  await page.getByRole("button", { name: "Move Edit your profile up" }).click();
  await expect(page.locator(".setgrid ol li").first()).toContainText("What is SME Hub?");
  await expect(page.locator(".setgrid ol li").nth(1)).toContainText("Edit your profile");
  await expect(save).toBeEnabled();
});

test("Help Centre settings has no serious accessibility problems", async ({ page, context, baseURL }) => {
  await context.addCookies([memberCookie(baseURL!, true)]);
  await page.goto("/helpsettings", { waitUntil: "networkidle" });
  const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
  expect(r.violations.filter((v) => v.impact === "serious" || v.impact === "critical").map((v) => `${v.id}: ${v.nodes.length} (${v.nodes[0]?.target?.join(" ")})`)).toEqual([]);
});
