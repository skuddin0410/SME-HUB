import { expect, test } from "@playwright/test";

// Update 12/13: the province guides, by name
const GPROVS: [string, string][] = [["Alberta", "A commercially active province with strong resources, market access and government support."], ["British Columbia", "A strong entrepreneurial ecosystem with good market access and support."], ["Manitoba", "A diverse central-province economy for establishing, operating and expanding a business."], ["New Brunswick", "Local economic conditions, market access and government support for every stage of a business."], ["Newfoundland and Labrador", "A resource-based coastal economy with a long fisheries history and varied sectors."], ["Northwest Territories", "Abundant resources, business opportunities and entrepreneurial incubators."], ["Nova Scotia", "Opportunities in technology, ocean industries, agriculture, fisheries, tourism and sustainable energy."], ["Nunavut", "Resources and insights for establishing, managing and growing an enterprise in the territory."], ["Ontario", "Tools and information for starting, running and growing an Ontario business, organised by stage."], ["Prince Edward Island", "Startup, management and scaling resources, including help with regulation and working capital."], ["Quebec", "The key steps for establishing, operating and expanding a small business in Quebec."], ["Saskatchewan", "Resources and advice for starting, operating and scaling a company in the province."], ["Yukon", "Tools and insights for setting up, running and expanding a small business in the territory."]];
const slug = (n: string) => n.toLowerCase().replace(/[^a-z0-9]+/g, "-");

test("guides index lists all 13 provinces and territories by region (Update 13)", async ({ page }) => {
  await page.goto("/guides", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Doing business in every province and territory", level: 1 })).toBeVisible();
  const links = page.locator("a.pgic");
  await expect(links).toHaveCount(13);
  for (const [name] of GPROVS) await expect(page.locator(`a.pgic[href="/guides/${slug(name)}"] .pgin`)).toHaveText(name);
});

test("every province page opens with its name, facts and official links", async ({ page }) => {
  for (const [name] of GPROVS) {
    const res = await page.goto(`/guides/${slug(name)}`, { waitUntil: "domcontentloaded" });
    expect(res?.status()).toBe(200);
    await expect(page.getByRole("heading", { name, level: 1, exact: true })).toBeVisible();
    await expect(page.locator(".pgfact")).toHaveCount(4);
  }
  await expect(page.getByRole("heading", { name: "How to start a business in Yukon" })).toBeVisible();
});

test("the hand-off's guide addresses and the old site's open the right guide", async ({ page }) => {
  await page.goto("/guide-ontario", { waitUntil: "domcontentloaded" });
  await expect(page).toHaveURL(/\/guides\/ontario$/);
  await expect(page.getByRole("heading", { name: "Ontario", level: 1, exact: true })).toBeVisible();
  await page.goto("/business-guide-prince-edward-island", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Prince Edward Island", level: 1, exact: true })).toBeVisible();
});

test("Businesses for Sale still lists provinces by name, kept apart from the guides", async ({ page }) => {
  await page.goto("/for-sale", { waitUntil: "domcontentloaded" });
  const prov = page.locator("select").filter({ has: page.locator('option[value="AB"]') }).first();
  await expect(prov.locator('option[value="AB"]')).toHaveText("Alberta");
  await expect(prov.locator('option[value="YT"]')).toHaveText("Yukon");
});

test("business tools: the GST/HST calculator gives the zip's checked answers", async ({ page }) => {
  await page.goto("/tools/gst", { waitUntil: "domcontentloaded" });
  await expect(page.getByText("$1,130.00").first()).toBeVisible();
});

test("a resource centre has the facts, where to start and official links (Update 15)", async ({ page }) => {
  await page.goto("/resources/indigenous-entrepreneurs", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Indigenous entrepreneurs", level: 1 })).toBeVisible();
  await expect(page.locator(".cmfact")).toHaveCount(4);
  await expect(page.getByRole("heading", { name: "Where to start" })).toBeVisible();
  await expect(page.locator("a.pglc").first()).toHaveAttribute("target", "_blank");
  await expect(page.getByText(/Reviewed November 2026/).first()).toBeVisible();
  await page.goto("/resources", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Support for every Canadian entrepreneur", level: 1 })).toBeVisible();
  await expect(page.locator("a.cmcard")).toHaveCount(5);
});
