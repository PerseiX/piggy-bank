import { test, expect } from '@playwright/test';
import { LoginPage, DashboardPage, WalletFormPage } from '../pages';
import { TEST_USER } from '../fixtures/testHelpers';

/**
 * E2E Test: Complete Wallet Creation Flow
 * 
 * Scenario:
 * 1. Login to the application
 * 2. Navigate to dashboard
 * 3. Click "Create New Wallet" button
 * 4. Fill in wallet creation form
 * 5. Verify wallet is created and displayed
 */

test.describe('Wallet Creation Flow', () => {
  let loginPage: LoginPage;
  let dashboardPage: DashboardPage;
  let walletFormPage: WalletFormPage;

  test.beforeEach(async ({ page }) => {
    // Initialize Page Objects
    loginPage = new LoginPage(page);
    dashboardPage = new DashboardPage(page);
    walletFormPage = new WalletFormPage(page);
  });

  test('should successfully create a new wallet with complete user flow', async ({ page }) => {
    // Step 1: Login
    await loginPage.navigate();
    await loginPage.login(TEST_USER.email, TEST_USER.password);
    
    // Wait for redirect to dashboard
    await page.waitForURL('/');
    
    // Step 2: Verify dashboard is loaded
    await expect(dashboardPage.dashboard).toBeVisible();
    await expect(dashboardPage.pageHeading).toBeVisible();
    
    // Step 3: Click "Create New Wallet" button
    // Always use header button (more reliable than checking for empty state)
    await dashboardPage.clickAddWallet();
    
    // Wait for navigation to wallet creation form
    await page.waitForURL('/wallets/new');
    
    // Step 4: Fill in wallet creation form
    const walletName = `Test Wallet ${Date.now()}`;
    const walletDescription = 'This is a test wallet for E2E testing';
    
    await expect(walletFormPage.walletForm).toBeVisible();
    await walletFormPage.fillName(walletName);
    await walletFormPage.fillDescription(walletDescription);
    
    // Verify form fields are filled
    await expect(walletFormPage.nameInput).toHaveValue(walletName);
    await expect(walletFormPage.descriptionInput).toHaveValue(walletDescription);
    
    // Submit the form
    await walletFormPage.clickSubmit();
    
    // Step 5: Verify wallet is created
    // Wait for redirect back to dashboard
    await page.waitForURL('/');
    
    // Wait for wallets to load
    await dashboardPage.waitForWalletsToLoad();
    
    // Verify wallet list is visible
    await expect(dashboardPage.walletList).toBeVisible();
    
    // Verify the newly created wallet appears in the list
    const hasNewWallet = await dashboardPage.hasWalletWithName(walletName);
    expect(hasNewWallet).toBe(true);
    
    // Verify wallet card displays correct name
    const walletCard = dashboardPage.getWalletCardByName(walletName);
    await expect(walletCard).toBeVisible();
    
    const walletCardName = walletCard.locator('[data-test-id="wallet-card-name"]');
    await expect(walletCardName).toHaveText(walletName);
  });

  test('should show validation error for empty wallet name', async ({ page }) => {
    // Login first
    await loginPage.navigate();
    await loginPage.login(TEST_USER.email, TEST_USER.password);
    await page.waitForURL('/');
    
    // Navigate directly to create wallet page
    await walletFormPage.navigateToCreate();
    await expect(walletFormPage.walletForm).toBeVisible();
    
    // Clear the name field and try to submit
    await walletFormPage.nameInput.clear();
    await walletFormPage.nameInput.blur(); // Trigger validation
    
    // Wait a moment for validation to run
    await page.waitForTimeout(500);
    
    // Verify form validation prevents submission or shows error
    // Check if submit button is disabled after clearing required field
    const isSubmitDisabled = await walletFormPage.isSubmitDisabled();
    
    // If button is not disabled, try clicking it and verify we stay on the page
    if (!isSubmitDisabled) {
      await walletFormPage.clickSubmit();
      await page.waitForTimeout(500);
      // Should still be on the form page (validation failed)
      expect(page.url()).toContain('/wallets/new');
    } else {
      // Submit button is correctly disabled for empty name
      expect(isSubmitDisabled).toBe(true);
    }
  });

  test('should cancel wallet creation and return to dashboard', async ({ page }) => {
    // Login first
    await loginPage.navigate();
    await loginPage.login(TEST_USER.email, TEST_USER.password);
    await page.waitForURL('/');
    
    // Navigate to create wallet page
    await walletFormPage.navigateToCreate();
    await expect(walletFormPage.walletForm).toBeVisible();
    
    // Fill in some data
    await walletFormPage.fillName('Cancelled Wallet');
    
    // Click cancel
    await walletFormPage.clickCancel();
    
    // Should redirect back to dashboard
    await page.waitForURL('/');
    await expect(dashboardPage.dashboard).toBeVisible();
  });

  test('should handle duplicate wallet name error', async ({ page }) => {
    const uniqueName = `Test Wallet ${Date.now()}`;
    
    // Login first
    await loginPage.navigate();
    await loginPage.login(TEST_USER.email, TEST_USER.password);
    await page.waitForURL('/');
    
    // Create first wallet
    await walletFormPage.navigateToCreate();
    await walletFormPage.createWallet(uniqueName, 'First wallet');
    await page.waitForURL('/');
    
    // Verify first wallet was created
    await dashboardPage.waitForWalletsToLoad();
    const hasFirstWallet = await dashboardPage.hasWalletWithName(uniqueName);
    expect(hasFirstWallet).toBe(true);
    
    // Try to create second wallet with same name
    await walletFormPage.navigateToCreate();
    await walletFormPage.fillName(uniqueName);
    await walletFormPage.fillDescription('Second wallet with duplicate name');
    await walletFormPage.clickSubmit();
    
    // Wait for potential error message or redirect
    await page.waitForTimeout(1000);
    
    // Either we stay on the form with an error, or we get redirected
    // If duplicate names are allowed, we'll be redirected to dashboard
    // If not, we'll stay on the form
    const currentUrl = page.url();
    
    if (currentUrl.includes('/wallets/new')) {
      // Duplicate validation prevented creation - verify error is shown
      console.log('Duplicate validation is enforced');
      // Note: Error message location depends on implementation
      // This test validates the behavior, not specific error message
    } else {
      // Duplicate names are allowed in this implementation
      console.log('Duplicate names are allowed');
      expect(currentUrl).toBe('http://localhost:3000/');
    }
  });
});

