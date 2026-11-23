import AxeBuilder from "@axe-core/playwright";
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

  const BLOG = "/member-blogs/00000000-0000-4000-8000-0000000b0001";
  test("member blogs: directory lists posts and follows the layout setting", async ({ page, context, baseURL }) => {
    await context.addCookies([memberCookie(baseURL!)]);
    await page.goto("/member-blogs", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "Member blogs", level: 1 })).toBeVisible();
    await expect(page.getByRole("link", { name: "Wholesale lessons 1" }).first()).toBeVisible();
    await expect(page.locator(".artgrid")).toBeVisible();
    await page.context().clearCookies();
    await context.addCookies([memberCookie(baseURL!, false, { blogs: { layout: "compact", cats: ["Money", "Legal"] } })]);
    await page.goto("/member-blogs", { waitUntil: "domcontentloaded" });
    await expect(page.locator(".mbcompact").first()).toBeVisible();
    await expect(page.getByRole("link", { name: "Legal", exact: true })).toBeVisible();
  });

  test("member blogs: a post shows its text, share buttons and author box as set", async ({ page, context, baseURL }) => {
    await context.addCookies([memberCookie(baseURL!, false, { blogs: { share: { linkedin: false, facebook: false, x: false, email: false, copy: true }, authorBox: false } })]);
    await page.goto(BLOG, { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "Wholesale lessons 1", level: 1 })).toBeVisible();
    await expect(page.getByText("What buyers asked for")).toBeVisible();
    await expect(page.getByRole("button", { name: "Copy link" })).toBeVisible();
    await expect(page.getByRole("button", { name: "LinkedIn" })).toHaveCount(0);
    await expect(page.getByText("Written by", { exact: true })).toHaveCount(0);
  });

  test("write: the editor loads with the team's categories; plan limits show a message", async ({ page, context, baseURL }) => {
    await context.addCookies([memberCookie(baseURL!, false, { blogs: { cats: ["Money", "Legal"], reqImg: true } })]);
    await page.goto("/write", { waitUntil: "domcontentloaded" });
    await expect(page.getByLabel("Post title")).toBeVisible();
    await expect(page.getByLabel("Category").getByRole("option", { name: "Legal" })).toHaveCount(1);
    await expect(page.getByText("A featured image is required.")).toBeVisible();
    await page.getByRole("button", { name: "+ Quote" }).click();
    await expect(page.getByLabel("Quote")).toBeVisible();
  });

  for (const path of ["/member-blogs", BLOG, "/write"]) {
    for (const dark of [false, true]) {
      test(`${path.replace(/[0-9a-f-]{36}/, "id")} ${dark ? "dark" : "light"} has no serious accessibility problems`, async ({ page, context, baseURL }) => {
        await context.addCookies([memberCookie(baseURL!)]);
        await page.addInitScript((d) => { try { localStorage.setItem("smbhub.theme", d ? "dark" : "light"); } catch {} }, dark);
        await page.goto(path, { waitUntil: "networkidle" });
        const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
        expect(r.violations.filter((v) => v.impact === "serious" || v.impact === "critical").map((v) => `${v.id}: ${v.nodes.length} (${v.nodes[0]?.target?.join(" ")})`)).toEqual([]);
      });
    }
  }

  test.describe("hashtags", () => {
    const HT = { hashtags: { merge: { taxes: "grants" }, blocked: ["free"], removed: {}, per: "5", min: "3", max: "24" } };

    test("the directory lists tags, applies merges and hides blocked words", async ({ page, context, baseURL }) => {
      await context.addCookies([memberCookie(baseURL!, false, HT)]);
      await page.goto("/hashtags");
      await expect(page.getByRole("heading", { name: "Hashtags", exact: true })).toBeVisible();
      await expect(page.getByRole("link", { name: "#wholesale", exact: true })).toBeVisible();
      await expect(page.getByRole("link", { name: "#grants", exact: true })).toBeVisible();
      await expect(page.getByText("5 uses").or(page.getByText("5 posts"))).toBeVisible(); // taxes (2) folded into grants (3)
      await expect(page.getByRole("link", { name: "#taxes", exact: true })).toHaveCount(0);
      await expect(page.getByRole("link", { name: "#free", exact: true })).toHaveCount(0);
      await page.getByLabel("Search hashtags").fill("whole");
      await page.keyboard.press("Enter");
      await expect(page.getByRole("link", { name: "#grants", exact: true })).toHaveCount(0);
    });

    test("a tag page shows its posts and the follow button", async ({ page, context, baseURL }) => {
      await context.addCookies([memberCookie(baseURL!, false, HT)]);
      await page.goto("/hashtags/grants");
      await expect(page.getByRole("heading", { name: "#grants" })).toBeVisible();
      await expect(page.getByRole("button", { name: /Following/ })).toBeVisible(); // the mock says this member follows grants
      await expect(page.getByRole("link", { name: "#wholesale" }).first()).toBeVisible(); // tags inside posts are links
    });

    test("blocked and removed tags have no page", async ({ page, context, baseURL }) => {
      await context.addCookies([memberCookie(baseURL!, false, { hashtags: { blocked: ["free"], removed: { old: true } } })]);
      for (const t of ["free", "old"]) {
        await page.goto(`/hashtags/${t}`);
        await expect(page.getByText("This page could not be found")).toBeVisible();
        await expect(page.getByRole("heading", { name: `#${t}` })).toHaveCount(0);
      }
    });

    test("turning hashtags off turns the pages off", async ({ page, context, baseURL }) => {
      await context.addCookies([memberCookie(baseURL!, false, { hashtags: { posts: false } })]);
      await page.goto("/hashtags");
      await expect(page.getByText("Hashtags are turned off")).toBeVisible();
    });

    test("the team sees real counts and can merge and remove tags", async ({ page, context, baseURL }) => {
      await context.addCookies([memberCookie(baseURL!, true, HT)]);
      await page.goto("/hashtagsettings");
      await expect(page.getByText("hashtags in use")).toBeVisible();
      await page.getByRole("button", { name: /^Merge #wholesale/ }).click();
      await expect(page.getByText("should become")).toBeVisible();
      await page.getByRole("button", { name: "Merge into this" }).first().click();
      await expect(page.getByRole("link", { name: "#wholesale", exact: true })).toHaveCount(0);
      await page.getByRole("button", { name: /^Remove #grants/ }).click();
      await expect(page.getByText(/Removed: #grants/)).toBeVisible();
      await page.getByRole("button", { name: "Bring them back" }).click();
      await expect(page.getByRole("link", { name: "#grants", exact: true })).toBeVisible();
    });

    for (const path of ["/hashtags", "/hashtags/grants", "/hashtagsettings"]) {
      for (const dark of [false, true]) {
        test(`${path} ${dark ? "dark" : "light"} has no serious accessibility problems`, async ({ page, context, baseURL }) => {
          await context.addCookies([memberCookie(baseURL!, path === "/hashtagsettings", HT)]);
          await page.addInitScript((d) => { try { localStorage.setItem("smbhub.theme", d ? "dark" : "light"); } catch {} }, dark);
          await page.goto(path, { waitUntil: "networkidle" });
          const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
          expect(r.violations.filter((v) => v.impact === "serious" || v.impact === "critical").map((v) => `${v.id}: ${v.nodes.length} (${v.nodes[0]?.target?.join(" ")})`)).toEqual([]);
        });
      }
    }
  });

  test.describe("motion", () => {
    test("pages ease in, and stay still for people who ask for less motion", async ({ page, context, baseURL }) => {
      await context.addCookies([memberCookie(baseURL!)]);
      for (const [motion, expectNone] of [["no-preference", false], ["reduce", true]] as const) {
        await page.emulateMedia({ reducedMotion: motion });
        await page.goto("/hashtags", { waitUntil: "domcontentloaded" });
        await page.getByRole("heading", { name: "Hashtags", exact: true }).waitFor();
        const name = await page.locator(".zip > .wrap").first().evaluate((el) => getComputedStyle(el).animationName);
        expect(name === "none").toBe(expectNone);
      }
    });
  });
});
