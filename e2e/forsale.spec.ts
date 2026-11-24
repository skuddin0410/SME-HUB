import { expect, test } from "@playwright/test";
import { memberCookie } from "./personas";

// Update 5: Businesses for sale, with the hand-off's 8 sample listings (e2e/forsale-fixture.json) in the mock.
const MOCK = "http://127.0.0.1:54398";
const BAKERY = "/for-sale/bakery-cafe-toronto-west-end"; // confidential, Priya
const CATERING = "/for-sale/prairie-roots-catering-winnipeg"; // open, Nadia
test.beforeEach(async ({ request }) => { await request.get(`${MOCK}/__reset_forsale`); });

test.describe("visitors", () => {
  test("browse the listings, filter them, and see no numbers or sellers", async ({ page }) => {
    await page.goto("/for-sale");
    await expect(page.getByRole("heading", { name: /Buy a Canadian small business/ })).toBeVisible();
    await expect(page.getByRole("heading", { name: "8 businesses for sale" })).toBeVisible();
    await expect(page.getByText("Members").first()).toBeVisible(); // owner earnings are locked on cards
    await page.getByRole("button", { name: /^Food & Drink/ }).click();
    await expect(page.getByRole("heading", { name: "2 businesses for sale" })).toBeVisible();
    await page.getByRole("button", { name: "Clear all" }).click();
    await page.getByLabel("Search businesses for sale").fill("Halifax");
    await expect(page.getByRole("heading", { name: /1 business for sale/ })).toBeVisible();
    await page.getByLabel("Search businesses for sale").fill("");
    await page.getByLabel("Sort").selectOption("plo");
    await expect(page.locator(".fsgrid .fst").first()).toHaveText(/Bridal and tailoring/);
    // under offer always goes last on "newest first"
    await page.getByLabel("Sort").selectOption("new");
    await expect(page.locator(".fsgrid .fst").last()).toHaveText(/solar installer/);
    await expect(page.getByRole("link", { name: "Join free" }).last()).toHaveAttribute("href", "/auth/sign-up");
  });
  test("a listing hides sales, earnings, staff and the seller, in the page and its source", async ({ page }) => {
    await page.goto(CATERING);
    await expect(page.getByRole("heading", { name: /Prairie Roots Catering/, level: 1 })).toBeVisible();
    await expect(page.getByText("Members only")).toHaveCount(3);
    await expect(page.getByText("Join free to see the full listing")).toBeVisible();
    await expect(page.getByText("Members see who is selling.")).toBeVisible();
    const html = await page.content();
    expect(html).not.toContain("610,000");
    expect(html).not.toContain("Nadia");
    expect(html).not.toContain("The brand, recipes, booking system");
    await expect(page.getByRole("link", { name: "Join free to contact the seller" })).toBeVisible();
    await expect(page).toHaveTitle(/Prairie Roots Catering.*\| Businesses for sale \| SME Hub/);
  });
  test("sell your business asks a visitor to join", async ({ page }) => {
    await page.goto("/for-sale");
    await page.getByRole("button", { name: "Sell your business" }).click();
    await expect(page).toHaveURL(/\/auth\/sign-up/);
  });
});

test.describe("members", () => {
  test.beforeEach(async ({ context, baseURL }) => { await context.addCookies([memberCookie(baseURL!)]); });

  test("see the numbers, but a confidential seller stays hidden from the page source", async ({ page }) => {
    await page.goto(BAKERY);
    await expect(page.getByText("$920,000")).toBeVisible();
    await expect(page.getByText("Confidential seller")).toBeVisible();
    await expect(page.getByText("Owner earnings: what the business earns")).toBeVisible();
    expect(await page.content()).not.toContain("Priya");
    await page.goto(CATERING);
    await expect(page.getByRole("link", { name: /Nadia Rahman/ })).toBeVisible();
  });

  test("contact a seller once, with the privacy box required", async ({ page }) => {
    await page.goto(BAKERY);
    await page.getByRole("button", { name: "Contact the seller" }).click();
    const dlg = page.getByRole("dialog");
    await dlg.getByRole("button", { name: "Send to the seller" }).click();
    await expect(dlg.getByText("Write at least a sentence or two")).toBeVisible();
    await expect(dlg.getByText("Tick the box to agree")).toBeVisible();
    await dlg.getByLabel("Message to the seller").fill("Hi, I run a café in Etobicoke and want a second location.");
    await dlg.getByRole("checkbox").check();
    await dlg.getByLabel("How will you pay?").selectOption("I’ll need a business loan");
    await dlg.getByRole("button", { name: "Send to the seller" }).click();
    await expect(page.getByText("Sent. The seller will reply in your messages.")).toBeVisible();
    await expect(page.getByText(/Enquiry sent/)).toBeVisible();
    await expect(page.getByRole("link", { name: "Open messages" })).toHaveAttribute("href", "/messages");
    await expect(page.getByRole("button", { name: "Contact the seller" })).toHaveCount(0);
  });

  test("save a listing and find it under Saved; report a listing", async ({ page }) => {
    await page.goto(CATERING);
    await page.locator(".fsprice").getByRole("button", { name: "Save listing" }).click();
    await expect(page.getByText("Saved. We’ll email you if the price changes.")).toBeVisible();
    await page.goto("/for-sale/saved");
    await expect(page.getByRole("link", { name: /Prairie Roots Catering/ })).toBeVisible();
    await page.goto(CATERING);
    await page.getByRole("button", { name: "Report this listing" }).click();
    await page.getByRole("button", { name: "I think it’s a scam" }).click();
    await expect(page.getByText("Thanks. The Hub team will check this listing.")).toBeVisible();
  });

  test("an under-offer listing can't be contacted", async ({ page }) => {
    await page.goto("/for-sale/residential-solar-installer-calgary");
    await expect(page.getByRole("button", { name: "Under offer" })).toBeDisabled();
  });

  test("a Free member sees the lock, not the form", async ({ page }) => {
    await page.goto("/for-sale");
    await page.getByRole("button", { name: "Sell your business" }).click();
    await expect(page.getByRole("dialog").getByRole("heading", { name: "Selling a business is for Plus members and Advisors" })).toBeVisible();
    await page.getByRole("button", { name: "See membership plans" }).click();
    await expect(page).toHaveURL(/\/membership-plans/);
    await page.goto("/for-sale/new");
    await expect(page.getByText("Selling a business is for Plus members and Advisors")).toBeVisible();
    await expect(page.getByLabel("Headline")).toHaveCount(0);
  });

  test("email notifications have a Businesses for sale switch", async ({ page }) => {
    await page.goto("/settings");
    const box = page.getByRole("checkbox", { name: /Businesses for sale/ });
    await expect(box).toBeChecked();
    await box.uncheck();
    await expect(page.getByText("Turned off. You won’t get these emails.")).toBeVisible();
  });
});

test.describe("sellers", () => {
  test.beforeEach(async ({ context, baseURL }) => { await context.addCookies([memberCookie(baseURL!, false, undefined, { plan: "plus" })]); });

  test("list a business: errors first, then it goes live, and buyers' enquiries arrive", async ({ page, context, baseURL, browser }) => {
    await page.goto("/for-sale/new");
    await expect(page.getByRole("heading", { name: "List your business for sale" })).toBeVisible();
    await expect(page.getByLabel("Business name shown to buyers")).toHaveCount(0); // hidden while confidential
    await page.getByRole("button", { name: "Publish listing" }).click();
    await expect(page.locator(".fswarn")).toContainText("things to fix");
    await expect(page.getByLabel("Headline")).toBeFocused();
    await page.getByLabel("Headline").fill("Family hardware store in downtown Guelph");
    await expect(page.locator(".fsprev .fst")).toHaveText("Family hardware store in downtown Guelph");
    await page.getByLabel("Industry").selectOption("Retail & Shops");
    await page.getByLabel("City").fill("Guelph");
    await page.getByLabel("Asking price (CAD)").fill("350,000");
    await page.getByLabel("Yearly sales (CAD)").fill("900000");
    await page.getByLabel("Owner earnings a year (CAD)").fill("120000");
    await page.getByLabel("Description").fill("A family hardware store with loyal customers, contractor accounts and a busy key-cutting counter in the middle of downtown.");
    await page.getByLabel("Highlights").fill("Contractor accounts\nOwns the paint-mixing franchise");
    await page.getByRole("button", { name: "Publish listing" }).click();
    await expect(page).toHaveURL(/\/for-sale\/family-hardware-store-in-downtown-guelph-/);
    await expect(page.getByText("This is your listing.")).toBeVisible();
    await expect(page.getByRole("link", { name: "See enquiries (0)" })).toBeVisible();
    const url = page.url();

    // a buyer contacts the seller
    const buyer = await browser.newContext();
    await buyer.addCookies([{ ...memberCookie(baseURL!, true), url: baseURL! }]);
    const b = await buyer.newPage();
    await b.goto(url);
    await b.getByRole("button", { name: "Contact the seller" }).click();
    await b.getByLabel("Message to the seller").fill("I sold my software company and want a store to run day to day.");
    await b.getByRole("dialog").getByRole("checkbox").check();
    await b.getByRole("button", { name: "Send to the seller" }).click();
    await expect(b.getByText(/Enquiry sent/)).toBeVisible();
    await buyer.close();

    await page.goto("/for-sale/my-listings");
    await expect(page.locator(".crtabs .crbadge2")).toHaveText("1");
    await expect(page.getByText("I sold my software company")).toBeVisible();
    await expect(page.getByText("Agreed to keep details private")).toBeVisible();
    await page.getByRole("button", { name: "Share documents and my name" }).click();
    await expect(page.getByText(/Documents shared and name shown/)).toBeVisible();
    await page.getByRole("button", { name: "Mark as under offer" }).click();
    await expect(page.getByText("Marked as under offer. Buyers can still save it.")).toBeVisible();
    await expect(page.locator(".fsst").first()).toHaveText("Under offer");
    await page.getByRole("button", { name: "Reply" }).click();
    await expect(page).toHaveURL(/\/messages\?with=00000000-0000-4000-8000-000000000002/);
    void context;
  });
});

test.describe("the Hub team", () => {
  test("checks and hides listings; hidden listings leave browse at once", async ({ page, context, baseURL }) => {
    await context.addCookies([memberCookie(baseURL!, true)]);
    await page.goto("/team/for-sale");
    await expect(page.getByRole("heading", { name: "Businesses for sale", level: 1 })).toBeVisible();
    // not yet checked come first
    await expect(page.locator(".fstable tbody tr").first()).toContainText("Not yet");
    const row = page.locator("tr", { hasText: "Women’s clothing boutique" });
    await expect(row).toContainText("Amara Diallo"); // the team always sees the seller
    await row.getByRole("button", { name: "Mark as checked" }).click();
    await expect(page.getByText("Marked as checked. Buyers see the shield.")).toBeVisible();
    await row.getByRole("button", { name: "Hide" }).click();
    await expect(row).toContainText("Hidden by the Hub team");
    await page.goto("/for-sale");
    await expect(page.getByRole("heading", { name: "7 businesses for sale" })).toBeVisible();
  });
  test("members don't get the team page", async ({ page, context, baseURL }) => {
    await context.addCookies([memberCookie(baseURL!)]);
    await page.goto("/team/for-sale");
    await expect(page.getByText("This page is for the Hub team")).toBeVisible();
  });
});

test("the directory links to businesses for sale, and plans list it", async ({ page }) => {
  await page.goto("/businesses");
  await expect(page.getByRole("link", { name: /Businesses for sale.*looking for a new owner/ })).toHaveAttribute("href", "/for-sale");
  await page.goto("/membership-plans");
  await expect(page.getByText("List your business for sale, with your name hidden if you like")).toBeVisible();
  await expect(page.getByRole("row", { name: /List a business for sale/ })).toBeVisible();
});

test("phone layout fits", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const p of ["/for-sale", CATERING]) {
    await page.goto(p);
    const w = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(w, p).toBeLessThanOrEqual(390);
  }
});
