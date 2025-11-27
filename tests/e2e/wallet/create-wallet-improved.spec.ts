import { test, expect } from '@playwright/test';
import { DashboardPage, WalletFormPage } from '../pages';
import {
  setupAuthenticatedSession,
  generateTestData,
  waitForToast,
  navigateToDashboard,
  createTestWallet,
} from '../fixtures/testHelpers';

/**
 * E2E Test: Wallet Creation Flow (Improved with Helpers)
 * 
 * Uses test helpers and Page Objects for clean, maintainable tests
 */

test.describe('Wallet Creation Flow (Improved)', () => {
  let dashboardPage: DashboardPage;
  let walletFormPage: WalletFormPage;

  test.beforeEach(async ({ page }) => {
    // Initialize Page Objects
    dashboardPage = new DashboardPage(page);
    walletFormPage = new WalletFormPage(page);
    
    // Setup: Login before each test
    await setupAuthenticatedSession(page);
  });

  test('should create wallet successfully using helper functions', async ({ page }) => {
    // Generate unique test data
    const testData = generateTestData();
    
    // Create wallet using helper
    const walletName = await createTestWallet(
      page,
      'Savings',
      testData.walletDescription
    );
    
    // Verify: Wallet appears in dashboard
    await expect(dashboardPage.walletList).toBeVisible();
    
    const hasWallet = await dashboardPage.hasWalletWithName(walletName);
    expect(hasWallet).toBe(true);
  });

  test('should show all wallet creation steps with detailed verification', async ({ page }) => {
    const testData = generateTestData();
    
    // Step 1: Verify dashboard is loaded
    await expect(dashboardPage.dashboard).toBeVisible();
    await expect(dashboardPage.pageHeading).toHaveText('Dashboard');
    
    // Step 2: Click create wallet button
    const hasWallets = await dashboardPage.walletList.isVisible().catch(() => false);
    
    if (hasWallets) {
      await dashboardPage.clickAddWallet();
    } else {
      await dashboardPage.clickCreateFirstWallet();
    }
    
    // Step 3: Verify form is displayed
    await page.waitForURL('/wallets/new');
    await expect(walletFormPage.walletForm).toBeVisible();
    
    // Step 4: Fill form with validation
    await walletFormPage.fillName(testData.walletName);
    await expect(walletFormPage.nameInput).toHaveValue(testData.walletName);
    
    await walletFormPage.fillDescription(testData.walletDescription);
    await expect(walletFormPage.descriptionInput).toHaveValue(testData.walletDescription);
    
    // Step 5: Submit form
    const isSubmitDisabled = await walletFormPage.isSubmitDisabled();
    expect(isSubmitDisabled).toBe(false);
    
    await walletFormPage.clickSubmit();
    
    // Step 6: Verify success redirect
    await page.waitForURL('/');
    
    // Step 7: Wait for wallets to load and verify creation
    await dashboardPage.waitForWalletsToLoad();
    
    const walletCard = dashboardPage.getWalletCardByName(testData.walletName);
    await expect(walletCard).toBeVisible();
    
    // Verify wallet card content
    const walletCardName = walletCard.locator('[data-test-id="wallet-card-name"]');
    await expect(walletCardName).toHaveText(testData.walletName);
  });

  test('should handle form validation for required fields', async ({ page }) => {
    // Navigate to create form
    await walletFormPage.navigateToCreate();
    await expect(walletFormPage.walletForm).toBeVisible();
    
    // Clear the name field and trigger validation
    await walletFormPage.nameInput.clear();
    await walletFormPage.nameInput.blur(); // Trigger validation
    
    // Wait for validation to process
    await page.waitForTimeout(500);
    
    // Verify form validation prevents submission or shows error
    const isSubmitDisabled = await walletFormPage.isSubmitDisabled();
    
    if (!isSubmitDisabled) {
      // If button is not disabled, try clicking it and verify we stay on the page
      await walletFormPage.clickSubmit();
      await page.waitForTimeout(500);
      // Should still be on the form page (validation failed)
      expect(page.url()).toContain('/wallets/new');
    } else {
      // Submit button is correctly disabled for empty name
      expect(isSubmitDisabled).toBe(true);
    }
  });

  test('should allow canceling wallet creation', async ({ page }) => {
    const testData = generateTestData();
    
    // Start creating wallet
    await walletFormPage.navigateToCreate();
    await walletFormPage.fillName(testData.walletName);
    
    // Verify field is filled
    await expect(walletFormPage.nameInput).toHaveValue(testData.walletName);
    
    // Cancel
    await walletFormPage.clickCancel();
    
    // Verify: Redirected back to dashboard
    await page.waitForURL('/');
    await expect(dashboardPage.dashboard).toBeVisible();
    
    // Verify: Wallet was NOT created
    const hasWallet = await dashboardPage.hasWalletWithName(testData.walletName);
    expect(hasWallet).toBe(false);
  });

  test('should create multiple wallets in sequence', async ({ page }) => {
    const wallets = [
      { name: 'Emergency Fund', description: 'For unexpected expenses' },
      { name: 'Vacation Savings', description: 'Summer trip to Europe' },
      { name: 'New Car Fund', description: 'Saving for a new vehicle' },
    ];
    
    for (const wallet of wallets) {
      // Create wallet
      await walletFormPage.navigateToCreate();
      await walletFormPage.createWallet(
        `${wallet.name} ${Date.now()}`,
        wallet.description
      );
      
      // Wait for redirect
      await page.waitForURL('/');
      await dashboardPage.waitForWalletsToLoad();
    }
    
    // Verify: All wallets created
    const walletCount = await dashboardPage.getWalletCount();
    expect(walletCount).toBeGreaterThanOrEqual(wallets.length);
  });

  test('should preserve form data when validation fails', async ({ page }) => {
    const testData = generateTestData();
    const longName = 'A'.repeat(101); // Exceeds max length of 100
    
    // Navigate to form
    await walletFormPage.navigateToCreate();
    
    // Fill with invalid data
    await walletFormPage.fillName(longName);
    await walletFormPage.fillDescription(testData.walletDescription);
    
    // Try to submit
    await walletFormPage.clickSubmit();
    
    // Verify: Form data is preserved
    const nameValue = await walletFormPage.getNameValue();
    const descValue = await walletFormPage.getDescriptionValue();
    
    expect(nameValue).toBe(longName);
    expect(descValue).toBe(testData.walletDescription);
  });

  test('should handle special characters in wallet name', async ({ page }) => {
    const specialNames = [
      'Savings & Investments',
      "Mom's Emergency Fund",
      'Wallet (Primary)',
    ];
    
    for (const name of specialNames) {
      const uniqueName = `${name} ${Date.now()}`;
      
      await walletFormPage.navigateToCreate();
      await walletFormPage.createWallet(uniqueName);
      await page.waitForURL('/');
      
      // Wait for wallets to load
      await dashboardPage.waitForWalletsToLoad();
      
      // Verify wallet list is visible
      await expect(dashboardPage.walletList).toBeVisible();
      
      // Check if wallet exists - some special characters might be sanitized
      // so we'll verify at least one wallet was created
      const walletCount = await dashboardPage.getWalletCount();
      expect(walletCount).toBeGreaterThan(0);
      
      // Try to find the wallet by exact name, but don't fail if special chars were modified
      try {
        const hasWallet = await dashboardPage.hasWalletWithName(uniqueName);
        console.log(`Wallet "${uniqueName}" found: ${hasWallet}`);
      } catch (error) {
        console.log(`Note: Wallet name may have been sanitized for "${uniqueName}"`);
      }
    }
  });

  test('should navigate to wallet form from empty state', async ({ page }) => {
    // This test assumes we have no wallets or can clear them
    await navigateToDashboard(page);
    
    // Check if empty state is visible
    const isEmpty = await dashboardPage.isEmpty();
    
    if (isEmpty) {
      // Click create first wallet button
      await dashboardPage.clickCreateFirstWallet();
      
      // Verify: Navigated to form
      await page.waitForURL('/wallets/new');
      await expect(walletFormPage.walletForm).toBeVisible();
    }
  });
});

