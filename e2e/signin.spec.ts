import { expect, test } from "@playwright/test";
import { memberCookie } from "./personas";

// Update 1: the sign-in and password pages. Only what the page itself does is checked here;
// the server steps (lockout, codes, resets) are covered by the database and unit tests.

test("log in checks the form before asking the server", async ({ page }) => {
  await page.goto("/auth/login");
  await expect(page.getByRole("heading", { name: "Welcome back", level: 1 })).toBeVisible();
  await expect(page.getByLabel("Keep me logged in on this device")).toBeChecked();
  await page.getByRole("button", { name: "Log in", exact: true }).click();
  await expect(page.getByText("Enter your email address.")).toBeVisible();
  await page.getByLabel("Email").fill("alex@morganreno.ca");
  await page.getByRole("button", { name: "Log in", exact: true }).click();
  await expect(page.getByText("Enter your password.")).toBeVisible();
  await page.locator("#pw").fill("secret");
  await page.getByRole("button", { name: "Show password" }).click();
  await expect(page.locator("#pw")).toHaveAttribute("type", "text");
});

test("sign up lists what is missing, and the password meter follows the rules", async ({ page }) => {
  await page.goto("/auth/sign-up");
  await expect(page.getByRole("heading", { name: "Join SME Hub free", level: 1 })).toBeVisible();
  await expect(page.getByLabel(/Send me the free weekly CanadianSME newsletter/)).not.toBeChecked();
  await page.getByRole("button", { name: "Create my free account" }).click();
  for (const t of ["Enter your first name.", "Enter your last name.", "Enter your business name.", "Enter your email address.", "Create a password.", "Choose your province or territory.", "Please agree to the terms to continue."]) {
    await expect(page.getByText(t)).toBeVisible();
  }
  await page.locator("#pw").fill("password1");
  await expect(page.getByText("Not a common password")).not.toHaveClass(/ok/);
  await page.locator("#pw").fill("Maple-Leaf-2026");
  await expect(page.locator(".meter")).toHaveAttribute("data-s", "4");
  await expect(page.getByText("Strong")).toBeVisible();
  await expect(page.locator(".rules li.ok")).toHaveCount(4);
});

test("the code screen takes a pasted code and asks for all six digits", async ({ page }) => {
  await page.goto("/auth/verify?email=alex@morganreno.ca");
  await expect(page.getByRole("heading", { name: "Check your email", level: 1 })).toBeVisible();
  await expect(page.getByText("alex@morganreno.ca")).toBeVisible();
  await page.getByRole("button", { name: "Confirm my email" }).click();
  await expect(page.getByText("Enter all 6 digits.")).toBeVisible();
  await page.getByLabel("Digit 1").focus();
  await page.evaluate(() => {
    const el = document.querySelector<HTMLInputElement>('input[aria-label="Digit 1"]')!;
    const data = new DataTransfer();
    data.setData("text", "123456");
    el.dispatchEvent(new ClipboardEvent("paste", { clipboardData: data, bubbles: true, cancelable: true }));
  });
  await expect(page.getByLabel("Digit 6")).toHaveValue("6");
  await expect(page.getByLabel("Digit 4")).toHaveValue("4");
});

test("forgot password and an expired reset link", async ({ page }) => {
  await page.goto("/auth/forgot-password");
  await page.getByRole("button", { name: "Send reset link" }).click();
  await expect(page.getByText("Enter your email address.")).toBeVisible();
  await page.getByLabel("Email").fill("nope");
  await page.getByRole("button", { name: "Send reset link" }).click();
  await expect(page.getByText("Check your email address.")).toBeVisible();

  await page.goto("/auth/error?reason=expired&type=recovery");
  await expect(page.getByRole("heading", { name: "This link has expired" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Send me a new link" })).toHaveAttribute("href", "/auth/forgot-password");
});

test("the old sign-up success page now leads to the code screen", async ({ page }) => {
  await page.goto("/auth/sign-up-success");
  await expect(page).toHaveURL(/\/auth\/verify/);
});

test("security settings: change password form and where you are logged in", async ({ page, context, baseURL }) => {
  await context.addCookies([memberCookie(baseURL!)]);
  await page.goto("/settings/security");
  await expect(page.getByRole("heading", { name: "Change your password" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Security and sign-in" })).toHaveAttribute("aria-current", "page");
  await expect(page.getByRole("heading", { name: "Where you’re logged in" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Sign-in methods" })).toBeVisible();
  await page.getByRole("button", { name: "Update password" }).click();
  await page.waitForTimeout(300);
  await expect(page.getByText("Enter your current password.")).toBeVisible();
});
