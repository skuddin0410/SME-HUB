import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { memberCookie } from "./personas";

// Update 11: "Member of the Week" becomes "Member of the Day", in the left panel under the menu and above Recent articles.
test("members see Member of the Day in the left panel, under the menu and above Recent articles", async ({ page, context, baseURL }) => {
  await context.addCookies([memberCookie(baseURL!)]);
  await page.goto("/feed", { waitUntil: "networkidle" });
  await expect(page.getByText("Member of the Week")).toHaveCount(0);
  const left = page.locator(".rail").first();
  const card = left.locator(".card.motd");
  await expect(card).toBeVisible();
  const order = await left.evaluate((rail) => [...rail.querySelectorAll(".mcard, .card.motd, .card")].map((c) => (c.classList.contains("mcard") ? "menu" : c.classList.contains("motd") ? "motd" : c.textContent?.includes("Recent articles") ? "articles" : "other")).filter((x, i, a) => a.indexOf(x) === i));
  expect(order.slice(0, 3)).toEqual(["menu", "motd", "articles"]);
  await expect(card.locator(".motd-badge")).toHaveText("Member of the Day");
  await expect(card.getByRole("heading", { name: "Priya Raman" }).getByRole("link")).toHaveAttribute("href", "/members/00000000-0000-4000-8000-000000000011");
  await expect(card).toContainText("Founder, Maple Bakery");
  await expect(card.locator(".motd-city")).toHaveText("Toronto, ON");
  await expect(card.locator(".motd-q")).toHaveText("“We bake small-batch bread and supply cafes across the west end.”");
  await expect(card.getByRole("link", { name: "View profile" })).toHaveAttribute("href", "/members/00000000-0000-4000-8000-000000000011");
  const today = new Date().toLocaleDateString("en-CA", { weekday: "long", month: "long", day: "numeric", timeZone: "America/Toronto" });
  await expect(card.locator(".motd-foot")).toHaveText(`${today} · Want to be featured?`);
  await expect(card.getByRole("link", { name: "Want to be featured?" })).toHaveAttribute("href", "/spotlight");
  // everything in this card is left-aligned
  // everything starts at the same left edge: photo, name, role, quote, buttons and footer
  const lefts = await card.locator(".motd-av, .motd-n, .motd-q, .motd-acts, .motd-foot").evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().left)));
  expect(new Set(lefts).size).toBe(1);
  expect(await card.locator(".motd-b").evaluate((el) => getComputedStyle(el).textAlign)).toBe("left");
  await card.getByRole("button", { name: "+ Connect" }).click();
  await expect(card.getByRole("button", { name: "Request sent" })).toBeVisible();
  // the weekly rhythm wording
  await expect(page.getByText("Member wins (Member of the Day every day)")).toBeVisible();
});

test("visitors see the card on Home, with + Connect asking them to join; no Member of the Week on the right", async ({ page }) => {
  await page.goto("/", { waitUntil: "networkidle" });
  await expect(page.getByText("Member of the Week")).toHaveCount(0);
  const card = page.locator(".card.motd");
  await expect(card).toBeVisible();
  const left = page.locator(".rail").first();
  await expect(left.locator(".card.motd")).toBeVisible();
  await expect(card.getByRole("link", { name: "+ Connect" })).toHaveAttribute("href", "/auth/sign-up");
  await expect(page.getByText("Member wins (Member of the Day every day)")).toBeVisible();
});

test("on phones the card is in the left-panel stack and fits the screen", async ({ page, context, baseURL }) => {
  await context.addCookies([memberCookie(baseURL!)]);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/feed", { waitUntil: "networkidle" });
  await expect(page.locator(".card.motd")).toBeAttached();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

for (const dark of [false, true]) {
  test(`the card has no serious accessibility problems (${dark ? "dark" : "light"})`, async ({ page, context, baseURL }) => {
    await context.addCookies([memberCookie(baseURL!)]);
    await page.addInitScript((d) => { try { localStorage.setItem("smbhub.theme", d ? "dark" : "light"); } catch {} }, dark);
    await page.goto("/feed", { waitUntil: "networkidle" });
    const r = await new AxeBuilder({ page }).include(".card.motd").withTags(["wcag2a", "wcag2aa"]).analyze();
    expect(r.violations.filter((v) => v.impact === "serious" || v.impact === "critical").map((v) => `${v.id}: ${v.nodes[0]?.target?.join(" ")}`)).toEqual([]);
  });
}

test("the Hub team picks each day's member; members see the team gate", async ({ page, context, baseURL }) => {
  await context.addCookies([memberCookie(baseURL!)]);
  await page.goto("/team/member-of-the-day", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "This page is for the Hub team" })).toBeVisible();
  await context.clearCookies();
  await context.addCookies([memberCookie(baseURL!, true)]);
  await page.goto("/team/member-of-the-day", { waitUntil: "networkidle" });
  await expect(page.getByRole("heading", { name: "Member of the Day", level: 1 })).toBeVisible();
  const save = page.getByRole("button", { name: "Save pick" });
  await expect(save).toBeDisabled();
  await page.getByLabel("Find a member").fill("kwame");
  await page.getByRole("radio", { name: /Kwame Asante/ }).check();
  await save.click();
  await expect(page.getByRole("status")).toContainText("Saved. Kwame Asante is the Member of the Day on");
  await expect(page.getByText("picked by the team")).toBeVisible({ timeout: 10000 });
  await page.getByRole("button", { name: /Remove the pick for/ }).click();
  await expect(page.getByRole("status")).toContainText("will get an automatic member");
  // the refresh after saving re-sends the page head; check once the title is back
  await expect(page).toHaveTitle(/Member of the Day/);
  const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
  expect(r.violations.filter((v) => v.impact === "serious" || v.impact === "critical").map((v) => `${v.id}: ${v.nodes[0]?.target?.join(" ")}`)).toEqual([]);
});
