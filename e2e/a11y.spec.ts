import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { memberCookie, PUBLIC_PAGES } from "./personas";

// Accessibility: no serious or critical problems, in light and dark, as a visitor and as a member.
const PAGES = [...PUBLIC_PAGES, "/help/c/profile", "/help/a/first-week", "/help/search?q=spotlight", "/smb-advisor", "/blog", "/news", "/podcast", "/magazine", "/policies/privacy-policy", "/policies/terms", "/courses", "/courses/local-marketing-on-a-200-budget", "/courses/hire-your-first-employee-in-ontario", "/courses/local-marketing-on-a-200-budget/learn/c9ea50aa-53ad-8358-952b-9ca993ab38a0", "/courses/hire-your-first-employee-in-ontario/learn/cc50d8b4-2908-f76e-5865-605c60a2aeb4", "/guides", "/guides/alberta", "/resources", "/resources/indigenous-entrepreneurs", "/resources/lgbtq", "/feed", "/members", "/network", "/members/00000000-0000-4000-8000-000000000011", "/members/00000000-0000-4000-8000-000000000011?tab=connections", "/members/00000000-0000-4000-8000-000000000011?tab=groups", "/membership-plans?interval=month", "/groups", "/events", "/groups/retail-owners", "/groups/retail-owners?tab=rules", "/businesses", "/businesses?view=list", "/businesses?view=map", "/businesses/maple-demo", "/businesses/maple-demo?tab=services", "/businesses/maple-demo?tab=about", "/businesses/maple-demo?tab=reviews", "/businesses/maple-demo?tab=photos", "/businesses/maple-demo?tab=shop", "/businesses/maple-demo?tab=events", "/businesses/maple-demo?tab=jobs", "/for-sale", "/for-sale/bakery-cafe-toronto-west-end", "/for-sale/prairie-roots-catering-winnipeg", "/for-sale/residential-solar-installer-calgary"];
// pages that only exist for a signed-in member
const MEMBER_PAGES = ["/settings", "/blocked", "/moderation", "/profile/views", "/profile/edit", "/businesses/mine", "/businesses/new", "/businesses/mine/maple-demo", "/businesses/mine/maple-demo?tab=services", "/businesses/mine/maple-demo?tab=team", "/businesses/mine/maple-demo?tab=publish", "/businesses/mine/maple-demo/inbox", "/businesses/messages", "/messages", "/notifications", "/courses/my-learning", "/courses/saved", "/courses/teaching", "/courses/local-marketing-on-a-200-budget/learn/7191adc7-53da-1012-606f-9b1c57aff46d", "/for-sale/my-listings", "/for-sale/saved", "/for-sale/new"];

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

// Update 5: the sell form, My listings with an enquiry, and the team page need a Plus member or the team
for (const dark of [false, true]) {
  test(`for-sale seller and team pages ${dark ? "dark" : "light"} have no serious accessibility problems`, async ({ page, context, baseURL, request }) => {
    await request.get("http://127.0.0.1:54398/__reset_forsale");
    await page.addInitScript((d) => { try { localStorage.setItem("smbhub.theme", d ? "dark" : "light"); } catch {} }, dark);
    await context.addCookies([memberCookie(baseURL!, false, undefined, { plan: "plus" })]);
    await page.goto("/for-sale/new", { waitUntil: "networkidle" });
    await page.getByRole("button", { name: "Publish listing" }).click();
    await expect(page.locator(".fswarn")).toBeVisible();
    expect(await scan(page)).toEqual([]);
    await context.clearCookies();
    await context.addCookies([memberCookie(baseURL!, true)]);
    await page.goto("/team/for-sale", { waitUntil: "networkidle" });
    expect(await scan(page)).toEqual([]);
    await page.goto("/for-sale/bakery-cafe-toronto-west-end", { waitUntil: "networkidle" });
    await page.getByRole("button", { name: "Contact the seller" }).click();
    expect(await scan(page)).toEqual([]);
  });
}
