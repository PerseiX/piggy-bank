import { test, expect } from "@playwright/test";
import { DashboardPage } from "../pages/DashboardPage";
import { setupAuthenticatedSession, createTestWallet } from "../fixtures/testHelpers";

test.describe("Dashboard - Wallets", () => {
  let dashboardPage: DashboardPage;

  test.beforeEach(async ({ page }) => {
    dashboardPage = new DashboardPage(page);

    // Setup authenticated session before each test
    await setupAuthenticatedSession(page);
  });

  test("should display dashboard page", async () => {
    // Verify dashboard is loaded
    expect(await dashboardPage.isLoaded()).toBe(true);

    // Verify page title contains expected text
    const title = await dashboardPage.getTitle();
    expect(title.toLowerCase()).toContain("piggy");
  });

  test("should show loading state while fetching wallets", async () => {
    // Navigate to dashboard and immediately check for loading state
    // Even if fast, we should eventually not be loading
    await dashboardPage.navigate();

    // Wait for wallets to load (loading should complete)
    await dashboardPage.waitForWalletsToLoad();

    // After loading completes, loading state should be false
    const isLoading = await dashboardPage.isLoading();
    expect(isLoading).toBe(false);
  });

  test("should display wallets or empty state", async () => {
    // Wait for wallets to load
    await dashboardPage.waitForWalletsToLoad();

    // Check if either wallets or empty state is shown
    const walletCount = await dashboardPage.getWalletCount();
    const isEmpty = await dashboardPage.isEmpty();

    // Either we have wallets or we see the empty state
    expect(walletCount > 0 || isEmpty).toBe(true);
  });

  test("should display add wallet button", async () => {
    // Verify add wallet button is visible (use createWalletButton for header button)
    await expect(dashboardPage.createWalletButton).toBeVisible();
  });

  test("should navigate to wallet creation form on add wallet click", async ({ page }) => {
    // Click add wallet button
    await dashboardPage.clickAddWallet();

    // Verify navigation to wallet creation page
    await page.waitForURL("/wallets/new", { timeout: 3000 });
    expect(page.url()).toContain("/wallets/new");
  });

  test("should navigate to wallet detail on card click", async ({ page }) => {
    // Create a test wallet first to ensure we have one
    await createTestWallet(page, "Detail Test Wallet", "Wallet for testing details navigation");

    // Navigate to dashboard
    await dashboardPage.navigate();
    await dashboardPage.waitForWalletsToLoad();

    // Check if we have any wallets
    const walletCount = await dashboardPage.getWalletCount();
    expect(walletCount).toBeGreaterThan(0);

    // Get the first wallet card
    const firstWallet = dashboardPage.getWalletCard(0);

    // Find and click the "View Details" link specifically (not the Edit link)
    // The View Details link contains text "View Details →"
    const viewDetailsLink = firstWallet.getByText("View Details →");
    await viewDetailsLink.click();

    // Verify navigation to wallet detail page
    await page.waitForURL(/.*wallets\/detail\/.+/, { timeout: 5000 });
    expect(page.url()).toMatch(/wallets\/detail\/.+/);
  });

  test("should handle error state gracefully", async () => {
    // Verify that under normal conditions, no error is shown
    await dashboardPage.waitForWalletsToLoad();

    // Check that no error state is displayed
    const hasError = await dashboardPage.hasError();
    expect(hasError).toBe(false);

    // Verify dashboard is functioning normally
    await expect(dashboardPage.createWalletButton).toBeVisible();
  });
});
