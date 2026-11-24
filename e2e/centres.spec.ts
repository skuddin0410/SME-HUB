import { expect, test } from "@playwright/test";

// Update 12: the guides use their own list (name and description), never the business province codes
const GPROVS: [string, string][] = [["Alberta", "A commercially active province with strong resources, market access and government support."], ["British Columbia", "A strong entrepreneurial ecosystem with good market access and support."], ["Manitoba", "A diverse central-province economy for establishing, operating and expanding a business."], ["New Brunswick", "Local economic conditions, market access and government support for every stage of a business."], ["Newfoundland and Labrador", "A resource-based coastal economy with a long fisheries history and varied sectors."], ["Northwest Territories", "Abundant resources, business opportunities and entrepreneurial incubators."], ["Nova Scotia", "Opportunities in technology, ocean industries, agriculture, fisheries, tourism and sustainable energy."], ["Nunavut", "Resources and insights for establishing, managing and growing an enterprise in the territory."], ["Ontario", "Tools and information for starting, running and growing an Ontario business, organised by stage."], ["Prince Edward Island", "Startup, management and scaling resources, including help with regulation and working capital."], ["Quebec", "The key steps for establishing, operating and expanding a small business in Quebec."], ["Saskatchewan", "Resources and advice for starting, operating and scaling a company in the province."], ["Yukon", "Tools and insights for setting up, running and expanding a small business in the territory."]];
const slug = (n: string) => n.toLowerCase().replace(/[^a-z0-9]+/g, "-");

test("guides index lists all 13 provinces and territories by name, with their descriptions", async ({ page }) => {
  await page.goto("/guides", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Business guides", level: 1 })).toBeVisible();
  const links = page.locator(".feat a");
  await expect(links).toHaveCount(13);
  for (const [i, [name, desc]] of GPROVS.entries()) {
    await expect(links.nth(i).locator("strong")).toHaveText(name);
    await expect(links.nth(i).locator(".muted")).toHaveText(desc);
    await expect(links.nth(i)).toHaveAttribute("href", `/guides/${slug(name)}`);
  }
  await expect(page.getByText(/^(AB|ON|YT)$/)).toHaveCount(0);
});

test("every guide page opens with its full name in the title and its description underneath", async ({ page }) => {
  for (const [name, desc] of GPROVS) {
    const res = await page.goto(`/guides/${slug(name)}`, { waitUntil: "domcontentloaded" });
    expect(res?.status()).toBe(200);
    await expect(page.getByRole("heading", { name: `The ${name} Small Business Guide`, level: 1 })).toBeVisible();
    await expect(page.locator(".doc .lead")).toHaveText(desc);
  }
});

test("the hand-off's guide addresses and the old site's open the right guide", async ({ page }) => {
  await page.goto("/guide-ontario", { waitUntil: "domcontentloaded" });
  await expect(page).toHaveURL(/\/guides\/ontario$/);
  await expect(page.getByRole("heading", { name: "The Ontario Small Business Guide", level: 1 })).toBeVisible();
  await page.goto("/business-guide-prince-edward-island", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "The Prince Edward Island Small Business Guide", level: 1 })).toBeVisible();
});

test("Businesses for Sale still lists provinces by name, kept apart from the guides", async ({ page }) => {
  await page.goto("/for-sale", { waitUntil: "domcontentloaded" });
  const prov = page.locator("select").filter({ has: page.locator('option[value="AB"]') }).first();
  await expect(prov.locator('option[value="AB"]')).toHaveText("Alberta");
  await expect(prov.locator('option[value="YT"]')).toHaveText("Yukon");
});

test("a province guide has the checklist, key points and organisations", async ({ page }) => {
  await page.goto("/guides/alberta", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "The Alberta Small Business Guide", level: 1 })).toBeVisible();
  await expect(page.getByText("1. Choose your business structure")).toBeVisible();
  await expect(page.getByRole("link", { name: "Find owners in Alberta" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Visit website" }).first()).toBeVisible();
});

test("a resource centre has the guide's sections and start-here links", async ({ page }) => {
  await page.goto("/resources/indigenous-entrepreneurs", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Indigenous Entrepreneurs Resource Centre", level: 1 })).toBeVisible();
  await expect(page.getByText("Holistic support").first()).toBeVisible();
  await expect(page.getByRole("link", { name: "Find an advisor" })).toBeVisible();
  await page.goto("/resources", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("link", { name: /Women Entrepreneurs Resource Centre/ })).toBeVisible();
});
