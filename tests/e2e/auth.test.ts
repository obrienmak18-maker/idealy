import { expect, test } from "@playwright/test";

test.describe("Authentication Pages", () => {
  async function setLocale(page: import("@playwright/test").Page, locale: "en" | "fr") {
    await page.context().addCookies([
      { name: "NEXT_LOCALE", value: locale, url: "http://localhost:3000" },
    ]);
  }

  test("login page renders correctly", async ({ page }) => {
    await setLocale(page, "en");
    await page.goto("/login");
    await expect(
      page.getByRole("heading", { name: "Welcome back" })
    ).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Password")).toBeVisible();
    await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Sign up" })).toBeVisible();
  });

  test("register page renders correctly", async ({ page }) => {
    await setLocale(page, "en");
    await page.goto("/register");
    await expect(
      page.getByRole("heading", { name: "Create account" })
    ).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Password")).toBeVisible();
    await expect(page.getByRole("button", { name: "Sign up" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Sign in" })).toBeVisible();
  });

  test("can navigate from login to register", async ({ page }) => {
    await setLocale(page, "en");
    await page.goto("/login");
    await page.getByRole("link", { name: "Sign up" }).click();
    await expect(page).toHaveURL("/register");
  });

  test("can navigate from register to login", async ({ page }) => {
    await setLocale(page, "en");
    await page.goto("/register");
    await page.getByRole("link", { name: "Sign in" }).click();
    await expect(page).toHaveURL("/login");
  });

  test("shows a visible error when Google redirects back without a credential", async ({ page }) => {
    await page.addInitScript(() => {
      try {
        window.sessionStorage.setItem("idealy:google-redirect-pending", "1");
      } catch {
        // The test still exercises the page even if browser storage is blocked.
      }
    });

    await setLocale(page, "fr");
    await page.goto("/login");

    await expect(page.getByRole("alert")).toContainText(
      "Google n’a pas terminé la connexion.",
      { timeout: 10_000 }
    );
  });
});
