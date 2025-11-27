import { test, expect } from '@playwright/test';
import { DashboardPage } from '../pages/DashboardPage';
import { setupAuthenticatedSession } from '../fixtures/testHelpers';

test.describe('Dashboard - Wallets', () => {
  let dashboardPage: DashboardPage;

  test.beforeEach(async ({ page }) => {
    dashboardPage = new DashboardPage(page);
    
    // Setup authenticated session before each test
    await setupAuthenticatedSession(page);
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
    // Verify add wallet button is visible (use createWalletButton for header button)
    await expect(dashboardPage.createWalletButton).toBeVisible();
  });

  test('should navigate to wallet creation form on add wallet click', async ({ page }) => {
    // Click add wallet button
    await dashboardPage.clickAddWallet();
    
    // Verify navigation to wallet creation page
    await page.waitForURL('/wallets/new', { timeout: 3000 });
    expect(page.url()).toContain('/wallets/new');
  });

  test('should navigate to wallet detail on card click', async ({ page }) => {
    // Wait for wallets to load
    await dashboardPage.waitForWalletsToLoad();
    
    // Check if we have any wallets
    const walletCount = await dashboardPage.getWalletCount();
    
    if (walletCount > 0) {
      // Get the first wallet card
      const firstWallet = dashboardPage.getWalletCard(0);
      
      // Find and click the "View Details" link specifically (not the Edit link)
      // The View Details link contains text "View Details →"
      const viewDetailsLink = firstWallet.getByText('View Details →');
      await viewDetailsLink.click();
      
      // Verify navigation to wallet detail page
      await page.waitForURL(/.*wallets\/detail\/.+/, { timeout: 5000 });
      expect(page.url()).toMatch(/wallets\/detail\/.+/);
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
    
    // Wait a bit for animations to complete
    await page.waitForTimeout(1000);
    
    // Take screenshot for visual comparison
    // Note: This test is sensitive to data changes. To update the baseline snapshot, run:
    // npm run test:e2e -- --update-snapshots
    // 
    // For CI/CD, you might want to skip this test or use a more flexible approach
    await expect(page).toHaveScreenshot('dashboard-wallets.png', {
      fullPage: true,
      maxDiffPixels: 2000, // High tolerance for dynamic wallet content
      maxDiffPixelRatio: 0.05, // 5% difference allowed
      timeout: 10000,
    });
  });
});

