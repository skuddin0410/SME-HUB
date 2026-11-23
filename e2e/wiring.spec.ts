import { expect, test } from "@playwright/test";
import { memberCookie } from "./personas";

const MEMBER = "/members/00000000-0000-4000-8000-000000000011";

test.describe("saved settings change the live pages", () => {
  test("feed: polls, cover and schedule off, title required", async ({ page, context, baseURL }) => {
    await context.addCookies([memberCookie(baseURL!, false, { feed: { polls: false, cover: false, schedule: false, title: "required" } })]);
    await page.goto("/feed", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("button", { name: "Poll" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Schedule" })).toHaveCount(0);
    await expect(page.getByLabel("Cover picture")).toHaveCount(0);
    await expect(page.getByPlaceholder("Title", { exact: true })).toBeVisible();
  });

  test("feed: no title field when titles are off", async ({ page, context, baseURL }) => {
    await context.addCookies([memberCookie(baseURL!, false, { feed: { title: "off" } })]);
    await page.goto("/feed", { waitUntil: "domcontentloaded" });
    await expect(page.getByLabel("Post title")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Poll" })).toBeVisible();
  });

  test("feed: the topic bar can be hidden", async ({ page, context, baseURL }) => {
    await context.addCookies([memberCookie(baseURL!, false, { feed: { topics: false } })]);
    await page.goto("/feed", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("navigation", { name: "Filter the feed" })).toHaveCount(0);
  });

  test("profile: a hidden tab disappears and the default tab changes", async ({ page, context, baseURL }) => {
    await context.addCookies([memberCookie(baseURL!, false, { profiles: { tabs: [["posts", "Posts", true], ["about", "About", true], ["conn", "Connections", true], ["groups", "Groups", true], ["blog", "Blog", false]], defTab: "posts" } })]);
    await page.goto(MEMBER, { waitUntil: "domcontentloaded" });
    const tabs = page.getByRole("navigation", { name: "Profile sections" });
    await expect(tabs.getByRole("link", { name: "Blog" })).toHaveCount(0);
    await expect(tabs.getByRole("link", { name: "Posts" })).toHaveAttribute("aria-current", "page");
  });

  test("profile: first name only across the page", async ({ page, context, baseURL }) => {
    await context.addCookies([memberCookie(baseURL!, false, { profiles: { dname: "first" } })]);
    await page.goto(MEMBER, { waitUntil: "domcontentloaded" });
    const h1 = (await page.getByRole("heading", { level: 1 }).first().innerText()).trim();
    expect(h1.split(/\s+/)).toHaveLength(1);
  });

  test("directory: list layout without the switch", async ({ page, context, baseURL }) => {
    await context.addCookies([memberCookie(baseURL!, false, { profiles: { dview: "list", dswitch: false } })]);
    await page.goto("/members", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("group", { name: "Layout" })).toHaveCount(0);
    await expect(page.locator(".dirlist")).toBeVisible();
  });

  test("account page: data download hidden when turned off", async ({ page, context, baseURL }) => {
    await context.addCookies([memberCookie(baseURL!, false, { profiles: { exportData: false, del: "team" } })]);
    await page.goto("/settings", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("link", { name: "Download my data" })).toHaveCount(0);
    await expect(page.getByText("ask the Hub team")).toBeVisible();
  });

  test("profile edit: a question the team added shows, a locked one does not", async ({ page, context, baseURL }) => {
    const fields = [
      { k: "xa", g: "About", l: "Favourite local supplier", t: "Text", vis: "members", lock: false },
      { k: "xb", g: "About", l: "Team secret", t: "Text", vis: "only", lock: true },
    ];
    await context.addCookies([memberCookie(baseURL!, false, { profiles: { fields } })]);
    await page.goto("/profile/edit", { waitUntil: "domcontentloaded" });
    await expect(page.getByLabel("Favourite local supplier")).toBeVisible();
    await expect(page.getByLabel("Team secret")).toHaveCount(0);
  });
});
