import { expect, test } from "@playwright/test";
import { memberCookie } from "./personas";

test("a member sees the team gate, not the moderation tools", async ({ page, context, baseURL }) => {
  await context.addCookies([memberCookie(baseURL!)]);
  await page.goto("/moderation", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "This page is for the Hub team" })).toBeVisible();
  await expect(page.getByText("Reported content")).toHaveCount(0);
});

test("the team sees reported content, flagged members and settings", async ({ page, context, baseURL }) => {
  await context.addCookies([memberCookie(baseURL!, true)]);
  await page.goto("/moderation", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Moderation", level: 1 })).toBeVisible();
  await expect(page.getByRole("link", { name: "Reported content (1)" })).toBeVisible();
  await expect(page.getByText("GROW YOUR BUSINESS FAST")).toBeVisible();
  await expect(page.getByRole("button", { name: "Hide" })).toBeVisible();
  await page.goto("/moderation?tab=members", { waitUntil: "domcontentloaded" });
  await expect(page.getByText("Marcus Webb")).toBeVisible();
  await expect(page.getByRole("button", { name: "Suspend" }).first()).toBeVisible();
  await page.goto("/moderation?tab=settings", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Auto suspend" })).toBeVisible();
  await expect(page.getByLabel("Blocks before suspension")).toHaveValue("5");
  await expect(page.getByRole("heading", { name: "Report categories" })).toBeVisible();
});

import AxeBuilder from "@axe-core/playwright";
for (const tab of ["content", "stories", "members", "log", "settings"]) {
  for (const dark of [false, true]) {
    test(`moderation ${tab} ${dark ? "dark" : "light"} has no serious accessibility problems`, async ({ page, context, baseURL }) => {
      await context.addCookies([memberCookie(baseURL!, true)]);
      await page.addInitScript((d) => { try { localStorage.setItem("smbhub.theme", d ? "dark" : "light"); } catch {} }, dark);
      await page.goto(`/moderation?tab=${tab}`, { waitUntil: "networkidle" });
      const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
      expect(r.violations.filter((v) => v.impact === "serious" || v.impact === "critical").map((v) => `${v.id}: ${v.nodes.length} (${v.nodes[0]?.target?.join(" ")})`)).toEqual([]);
    });
  }
}
