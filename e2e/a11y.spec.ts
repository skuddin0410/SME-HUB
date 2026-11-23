import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { memberCookie, PUBLIC_PAGES } from "./personas";

// Accessibility: no serious or critical problems, in light and dark, as a visitor and as a member.
const PAGES = [...PUBLIC_PAGES, "/help/c/profile", "/help/a/first-week", "/help/search?q=spotlight", "/smb-advisor", "/blog", "/news", "/podcast", "/magazine", "/policies/privacy-policy", "/policies/terms", "/courses", "/guides", "/guides/alberta", "/resources", "/resources/indigenous-entrepreneurs", "/resources/lgbtq", "/feed", "/members", "/network", "/members/00000000-0000-4000-8000-000000000011", "/members/00000000-0000-4000-8000-000000000011?tab=connections", "/members/00000000-0000-4000-8000-000000000011?tab=groups", "/membership-plans?interval=month", "/groups", "/events", "/groups/retail-owners", "/groups/retail-owners?tab=rules", "/businesses", "/businesses?view=list", "/businesses?view=map", "/businesses/maple-demo", "/businesses/maple-demo?tab=services", "/businesses/maple-demo?tab=about", "/businesses/maple-demo?tab=reviews", "/businesses/maple-demo?tab=photos", "/businesses/maple-demo?tab=shop", "/businesses/maple-demo?tab=events", "/businesses/maple-demo?tab=jobs"];
// pages that only exist for a signed-in member
const MEMBER_PAGES = ["/settings", "/blocked", "/moderation", "/profile/views", "/profile/edit", "/businesses/mine", "/businesses/new", "/businesses/mine/maple-demo", "/businesses/mine/maple-demo?tab=services", "/businesses/mine/maple-demo?tab=team", "/businesses/mine/maple-demo?tab=publish", "/businesses/mine/maple-demo/inbox", "/businesses/messages", "/messages", "/notifications"];

async function scan(page: import("@playwright/test").Page) {
  const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
  return r.violations.filter((v) => v.impact === "serious" || v.impact === "critical").map((v) => `${v.id}: ${v.nodes.length} (${v.nodes[0]?.target?.join(" ")})`);
}

for (const dark of [false, true]) {
  for (const signedIn of [false, true]) {
    for (const path of signedIn ? [...PAGES, ...MEMBER_PAGES] : PAGES) {
      test(`${path} ${dark ? "dark" : "light"} ${signedIn ? "member" : "visitor"} has no serious accessibility problems`, async ({ page, context, baseURL }) => {
        if (signedIn) await context.addCookies([memberCookie(baseURL!)]);
        await page.addInitScript((d) => { try { localStorage.setItem("smbhub.theme", d ? "dark" : "light"); } catch {} }, dark);
        await page.goto(path, { waitUntil: "networkidle" });
        expect(await scan(page)).toEqual([]);
      });
    }
  }
}
