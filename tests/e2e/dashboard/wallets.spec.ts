import { test, expect } from '@playwright/test';
import { DashboardPage } from '../pages/DashboardPage';

test.describe('Dashboard - Wallets', () => {
  let dashboardPage: DashboardPage;

  test.beforeEach(async ({ page }) => {
    dashboardPage = new DashboardPage(page);
    
    // Note: This assumes user is already authenticated
    // You might need to add authentication setup here
    await dashboardPage.navigate();
  });

  test('should display dashboard page', async () => {
    // Verify dashboard is loaded
    expect(await dashboardPage.isLoaded()).toBe(true);
    
    // Verify page title contains expected text
    const title = await dashboardPage.getTitle();
    expect(title.toLowerCase()).toContain('piggy');
  });

  test('should show loading state while fetching wallets', async ({ page }) => {
    // This test might be tricky as loading is often very fast
    // You might need to throttle network in real scenarios
    test.skip(true, 'Loading state is too fast to test reliably without network throttling');
    
    await dashboardPage.navigate();
    
    // Check if loading state appears briefly
    const isLoading = await dashboardPage.isLoading();
    expect(isLoading).toBe(true);
  });

  test('should display wallets or empty state', async () => {
    // Wait for wallets to load
    await dashboardPage.waitForWalletsToLoad();
    
    // Check if either wallets or empty state is shown
    const walletCount = await dashboardPage.getWalletCount();
    const isEmpty = await dashboardPage.isEmpty();
    
    // Either we have wallets or we see the empty state
    expect(walletCount > 0 || isEmpty).toBe(true);
  });

  test('should display add wallet button', async () => {
    // Verify add wallet button is visible
    await expect(dashboardPage.addWalletButton).toBeVisible();
  });

  test('should open wallet creation dialog on add wallet click', async ({ page }) => {
    // Click add wallet button
    await dashboardPage.clickAddWallet();
    
    // Verify dialog/modal appears
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 3000 });
  });

  test('should navigate to wallet detail on card click', async ({ page }) => {
    // Wait for wallets to load
    await dashboardPage.waitForWalletsToLoad();
    
    // Check if we have any wallets
    const walletCount = await dashboardPage.getWalletCount();
    
    if (walletCount > 0) {
      // Click on first wallet
      await dashboardPage.clickWalletCard(0);
      
      // Verify navigation to wallet detail page
      await page.waitForURL(/.*wallets\/.+/);
    } else {
      test.skip(true, 'No wallets available for testing');
    }
  });

  test('should handle error state gracefully', async ({ page }) => {
    // This test would require mocking API errors
    // Skip for now as it requires more complex setup
    test.skip(true, 'Requires API mocking setup');
    
    const hasError = await dashboardPage.hasError();
    expect(hasError).toBe(false);
  });

  test('should take visual snapshot of dashboard', async ({ page }) => {
    // Wait for wallets to load
    await dashboardPage.waitForWalletsToLoad();
    
    // Take screenshot for visual comparison
    await expect(page).toHaveScreenshot('dashboard-wallets.png', {
      fullPage: true,
      maxDiffPixels: 100,
    });
  });
});

