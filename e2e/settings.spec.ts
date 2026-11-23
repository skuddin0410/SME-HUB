import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { memberCookie } from "./personas";

const PAGES: [string, string][] = [["/profilesettings", "Profile and directory settings"], ["/feedsettings", "Feed settings"], ["/groupsettings", "Group settings"], ["/blogsettings", "Member blog settings"], ["/hashtagsettings", "Hashtag settings"]];

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
