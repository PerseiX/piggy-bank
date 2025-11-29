import type { Page } from "@playwright/test";
import { LoginPage, DashboardPage, WalletFormPage } from "../pages";

/**
 * Test Helpers - Reusable utilities for E2E tests
 */

/**
 * Test user credentials for E2E tests
 * Uses E2E_USERNAME and E2E_PASSWORD from .env.test
 */
export const TEST_USER = {
  email: process.env.E2E_USERNAME || "test@example.com",
  password: process.env.E2E_PASSWORD || "TestPassword123!",
};

/**
 * Helper to perform complete login flow
 */
export async function loginAsTestUser(page: Page) {
  const loginPage = new LoginPage(page);
  await loginPage.navigate();
  await loginPage.login(TEST_USER.email, TEST_USER.password);
  await page.waitForURL("/", { timeout: 10000 });
}

/**
 * Helper to ensure user is logged in before test
 */
export async function setupAuthenticatedSession(page: Page) {
  await loginAsTestUser(page);

  // Verify we're on the dashboard
  const dashboardPage = new DashboardPage(page);
  await dashboardPage.waitForPageLoad();
}

/**
 * Helper to create a wallet with random name
 */
export async function createTestWallet(page: Page, namePrefix = "Test Wallet", description?: string): Promise<string> {
  const walletFormPage = new WalletFormPage(page);
  const walletName = `${namePrefix} ${Date.now()}`;

  await walletFormPage.navigateToCreate();
  await walletFormPage.createWallet(walletName, description);
  await page.waitForURL("/");

  return walletName;
}

/**
 * Helper to navigate to dashboard and wait for wallets to load
 */
export async function navigateToDashboard(page: Page) {
  const dashboardPage = new DashboardPage(page);
  await dashboardPage.navigate();
  await dashboardPage.waitForWalletsToLoad();
}

/**
 * Generate unique test data
 */
export function generateTestData() {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(7);

  return {
    walletName: `Test Wallet ${timestamp}`,
    walletDescription: `Test description ${random}`,
    email: `test+${timestamp}@example.com`,
    timestamp,
    random,
  };
}

/**
 * Wait for toast notification (if using toast library)
 */
export async function waitForToast(page: Page, text?: string, timeout = 5000) {
  const toastSelector = text ? `[role="status"]:has-text("${text}")` : '[role="status"]';

  await page.waitForSelector(toastSelector, { timeout });
}

/**
 * Helper to verify user is redirected to login page
 */
export async function expectRedirectToLogin(page: Page) {
  await page.waitForURL(/\/auth\/login/, { timeout: 5000 });
}

/**
 * Helper to check if element is in viewport
 */
export async function isInViewport(page: Page, selector: string): Promise<boolean> {
  return await page.evaluate((sel) => {
    const element = document.querySelector(sel);
    if (!element) return false;

    const rect = element.getBoundingClientRect();
    return (
      rect.top >= 0 &&
      rect.left >= 0 &&
      rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
      rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    );
  }, selector);
}

/**
 * Helper to scroll element into view
 */
export async function scrollIntoView(page: Page, selector: string) {
  await page.evaluate((sel) => {
    const element = document.querySelector(sel);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, selector);
}

/**
 * Helper to wait for API response
 */
export async function waitForApiResponse(page: Page, urlPattern: string | RegExp, timeout = 10000) {
  return await page.waitForResponse(
    (response) => {
      const url = response.url();
      const matches = typeof urlPattern === "string" ? url.includes(urlPattern) : urlPattern.test(url);
      return matches && response.status() === 200;
    },
    { timeout }
  );
}

/**
 * Helper to intercept and mock API calls
 */
export async function mockApiResponse(page: Page, urlPattern: string | RegExp, responseData: any, status = 200) {
  await page.route(urlPattern, (route) => {
    route.fulfill({
      status,
      contentType: "application/json",
      body: JSON.stringify(responseData),
    });
  });
}

/**
 * Helper to take screenshot with timestamp
 */
export async function takeTimestampedScreenshot(page: Page, name: string, options?: { fullPage?: boolean }) {
  const timestamp = Date.now();
  const filename = `screenshots/${name}-${timestamp}.png`;

  await page.screenshot({
    path: filename,
    fullPage: options?.fullPage ?? false,
  });

  return filename;
}

/**
 * Helper to check console errors
 */
export async function captureConsoleErrors(page: Page): Promise<string[]> {
  const errors: string[] = [];

  page.on("console", (msg) => {
    if (msg.type() === "error") {
      errors.push(msg.text());
    }
  });

  return errors;
}

/**
 * Helper to wait for network idle
 */
export async function waitForNetworkIdle(page: Page, timeout = 5000) {
  await page.waitForLoadState("networkidle", { timeout });
}

/**
 * Helper to clear all cookies and storage
 */
export async function clearBrowserState(page: Page) {
  await page.context().clearCookies();
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
}
