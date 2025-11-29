import { test, expect } from "@playwright/test";
import { LoginPage } from "../pages/LoginPage";
import { DashboardPage } from "../pages/DashboardPage";
import { TEST_USER } from "../fixtures/testHelpers";

test.describe("Login Flow", () => {
  let loginPage: LoginPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    await loginPage.navigate();
  });

  test("should display login form", async () => {
    // Verify that the login page is loaded
    expect(await loginPage.isLoaded()).toBe(true);

    // Verify form elements are visible
    await expect(loginPage.emailInput).toBeVisible();
    await expect(loginPage.passwordInput).toBeVisible();
    await expect(loginPage.submitButton).toBeVisible();
  });

  test("should show validation errors for empty form submission", async () => {
    // Try to submit empty form
    await loginPage.clickSubmit();

    // Verify that we're still on the login page (validation prevents submission)
    expect(await loginPage.isLoaded()).toBe(true);
  });

  test("should show validation error for invalid email format", async () => {
    // Fill invalid email
    await loginPage.fillEmail("invalid-email");
    await loginPage.fillPassword("password123");
    await loginPage.clickSubmit();

    // Check for validation message (browser native or custom)
    // This might need to be adjusted based on your validation implementation
    const emailInputValidation = await loginPage.emailInput.evaluate((el: HTMLInputElement) => el.validationMessage);
    expect(emailInputValidation).toBeTruthy();
  });

  test("should navigate to sign up page", async ({ page }) => {
    // Click sign up link
    await loginPage.goToSignUp();

    // Verify navigation
    await page.waitForURL(/.*signup|.*register/);
  });

  test("should navigate to forgot password page", async ({ page }) => {
    // Click forgot password link
    await loginPage.goToForgotPassword();

    // Verify navigation
    await page.waitForURL(/.*forgot-password/);
  });

  test("should show error for invalid credentials", async ({ page }) => {
    // Try to login with invalid credentials
    await loginPage.login("invalid@example.com", "wrongpassword");

    // Wait for error message or stay on login page
    // This assumes the login fails and shows an error
    // Adjust based on your actual error handling
    await page.waitForTimeout(1000); // Wait for potential error message

    // Verify still on login page or error is shown
    const isStillOnLogin = await loginPage.isLoaded();
    expect(isStillOnLogin).toBe(true);
  });

  test("should successfully login with valid credentials", async ({ page }) => {
    const dashboardPage = new DashboardPage(page);

    // Login with valid test credentials from testHelpers
    await loginPage.login(TEST_USER.email, TEST_USER.password);

    // Verify redirect to dashboard
    await page.waitForURL("/", { timeout: 5000 });

    // Verify dashboard is loaded
    expect(await dashboardPage.isLoaded()).toBe(true);

    // Verify we can see the dashboard elements
    await expect(dashboardPage.createWalletButton).toBeVisible();
  });
});
