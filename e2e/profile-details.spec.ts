import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { memberCookie } from "./personas";

const PRIYA = "/members/00000000-0000-4000-8000-000000000011";

// The profile's Details section (the hand-off's profile page): the team's fields in groups, each shown to its audience.
test("a member sees another member's Details in groups, with what is not shown to them", async ({ page, context, baseURL }) => {
  await context.addCookies([memberCookie(baseURL!)]);
  await page.goto(PRIYA, { waitUntil: "networkidle" });
  const card = page.locator(".card.psec", { has: page.getByRole("heading", { name: "Details", level: 2 }) });
  await expect(card).toBeVisible();
  await expect(card.locator(".fgroup h3")).toHaveText(["About", "Business", "Contact", "Work history", "Profile link"]);
  const row = (label: string) => card.locator(".frow", { has: page.locator(".fl", { hasText: label }) });
  await expect(row("First name").locator(".fd")).toHaveText("Priya");
  await expect(row("Nickname").locator(".fd")).toHaveText("Pri");
  await expect(row("Business name").locator(".fd")).toHaveText("Maple Bakery");
  await expect(row("Industry").locator(".fd")).toHaveText("Food and hospitality");
  await expect(row("City and province").locator(".fd")).toHaveText("Toronto, ON");
  await expect(row("Year founded").locator(".fd")).toHaveText("2014");
  await expect(row("Team size").locator(".fd")).toHaveText("6 to 20 people");
  await expect(row("Website").getByRole("link", { name: "maplebakery.example" })).toHaveAttribute("href", "https://maplebakery.example");
  await expect(row("Social networks").getByRole("link", { name: "LinkedIn" })).toHaveText("in");
  await expect(row("Past businesses and roles")).toContainText("Pastry chef");
  await expect(row("Past businesses and roles")).toContainText("Hotel Le Germain · 2008 to 2014");
  await expect(card.locator(".frow .fv")).toHaveCount(0); // the audience labels are for the member themself
  await expect(card.getByText("Not shown to you: Email (my connections), Phone (my connections).")).toBeVisible();
  await expect(card.getByRole("button", { name: "smehub.ca/members/00000000-0000-4000-8000-000000000011" })).toBeVisible();
  await expect(card.getByRole("link", { name: "Who can see this" })).toHaveCount(0);
  // Details sits after Recommendations, and the old "Find me online" card is part of it now
  await expect(page.getByRole("heading", { name: "Find me online" })).toHaveCount(0);
});

test("visitors see only the public Details", async ({ page }) => {
  await page.goto(PRIYA, { waitUntil: "networkidle" });
  const card = page.locator(".card.psec", { has: page.getByRole("heading", { name: "Details", level: 2 }) });
  await expect(card).toBeVisible();
  await expect(card.locator(".fl", { hasText: "Nickname" })).toHaveCount(0);
  await expect(card.getByText(/Not shown to you: Nickname \(all members\), Team size \(all members\), Email \(my connections\), Phone \(my connections\), Past businesses and roles \(all members\)\./)).toBeVisible();
});

test("on your own profile every field shows, with who can see it and Not filled in yet", async ({ page, context, baseURL }) => {
  await context.addCookies([memberCookie(baseURL!)]);
  await page.goto("/members/00000000-0000-4000-8000-000000000001", { waitUntil: "networkidle" });
  const card = page.locator(".card.psec", { has: page.getByRole("heading", { name: "Details", level: 2 }) });
  await expect(card).toBeVisible();
  await expect(card.getByRole("link", { name: "Who can see this" })).toHaveAttribute("href", "/settings");
  const nick = card.locator(".frow", { has: page.locator(".fl", { hasText: "Nickname" }) });
  await expect(nick.locator(".fv")).toHaveText("All members");
  await expect(nick.locator(".fd")).toHaveText("Not filled in yet");
  await expect(card.locator(".frow", { has: page.locator(".fl", { hasText: "Email" }) }).locator(".fv")).toHaveText("My connections");
  const r = await new AxeBuilder({ page }).include(".fgrid").withTags(["wcag2a", "wcag2aa"]).analyze();
  expect(r.violations.filter((v) => v.impact === "serious" || v.impact === "critical").map((v) => `${v.id}: ${v.nodes[0]?.target?.join(" ")}`)).toEqual([]);
});

test("members fill in Details when editing their profile, and choose who sees each one", async ({ page, context, baseURL }) => {
  await context.addCookies([memberCookie(baseURL!)]);
  await page.goto("/profile/edit", { waitUntil: "networkidle" });
  await expect(page.getByRole("group", { name: "Details" })).toBeVisible();
  for (const l of ["Nickname", "Industry", "Year founded", "Team size", "Contact email", "Phone"]) await expect(page.getByLabel(new RegExp(`^${l}`)).first()).toBeVisible();
  await page.getByRole("button", { name: "+ Add a past role" }).click();
  await expect(page.getByLabel("Role", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Remove past role 1" }).click();
  await expect(page.getByLabel("Role", { exact: true })).toHaveCount(0);
  await page.goto("/settings", { waitUntil: "networkidle" });
  for (const l of ["Nickname", "Year founded", "Team size", "Email", "Phone", "Website", "Past businesses and roles"]) await expect(page.getByLabel(`Who can see ${l}`)).toBeVisible();
  await expect(page.getByLabel("Who can see Email")).toHaveValue("conn");
  await expect(page.getByLabel("Who can see Nickname")).toHaveValue("members");
  await expect(page.locator(".frow2", { hasText: "First name" })).toContainText("set by the Hub team");
});
