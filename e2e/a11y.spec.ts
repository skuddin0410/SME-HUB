import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { memberCookie, PUBLIC_PAGES } from "./personas";

// Accessibility: no serious or critical problems, in light and dark, as a visitor and as a member.
const PAGES = [...PUBLIC_PAGES, "/feed", "/members", "/members?view=map", "/groups", "/businesses", "/businesses?view=list", "/businesses?view=map", "/businesses/maple-demo", "/businesses/maple-demo?tab=services", "/businesses/maple-demo?tab=about", "/businesses/maple-demo?tab=reviews", "/businesses/maple-demo?tab=photos", "/businesses/maple-demo?tab=shop", "/businesses/maple-demo?tab=events", "/businesses/maple-demo?tab=jobs"];
// pages that only exist for a signed-in member
const MEMBER_PAGES = ["/settings", "/profile/views", "/profile/edit", "/businesses/mine", "/businesses/mine/maple-demo", "/businesses/mine/maple-demo/inbox", "/businesses/messages"];

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
