import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Page Object Model for the Dashboard page
 */
export class DashboardPage extends BasePage {
  // Locators
  readonly pageHeading: Locator;
  readonly addWalletButton: Locator;
  readonly walletCards: Locator;
  readonly loadingState: Locator;
  readonly errorState: Locator;
  readonly emptyState: Locator;

  constructor(page: Page) {
    super(page);
    
    // Initialize locators
    this.pageHeading = page.getByRole('heading', { name: /dashboard|wallets/i, level: 1 });
    this.addWalletButton = page.getByRole('button', { name: /add wallet|create wallet|new wallet/i });
    this.walletCards = page.locator('[data-testid="wallet-card"]');
    this.loadingState = page.getByTestId('loading-state');
    this.errorState = page.getByTestId('error-state');
    this.emptyState = page.getByTestId('empty-state');
  }

  /**
   * Navigate to the dashboard page
   */
  async navigate() {
    await this.goto('/');
    await this.waitForPageLoad();
  }

  /**
   * Check if the dashboard is loaded
   */
  async isLoaded(): Promise<boolean> {
    return await this.isVisible(this.pageHeading);
  }

  /**
   * Click the add wallet button
   */
  async clickAddWallet() {
    await this.addWalletButton.click();
  }

  /**
   * Get the number of wallet cards displayed
   */
  async getWalletCount(): Promise<number> {
    return await this.walletCards.count();
  }

  /**
   * Get wallet card by index
   */
  getWalletCard(index: number): Locator {
    return this.walletCards.nth(index);
  }

  /**
   * Click on a wallet card by index
   */
  async clickWalletCard(index: number) {
    await this.getWalletCard(index).click();
  }

  /**
   * Check if loading state is visible
   */
  async isLoading(): Promise<boolean> {
    return await this.isVisible(this.loadingState);
  }

  /**
   * Check if error state is visible
   */
  async hasError(): Promise<boolean> {
    return await this.isVisible(this.errorState);
  }

  /**
   * Check if empty state is visible
   */
  async isEmpty(): Promise<boolean> {
    return await this.isVisible(this.emptyState);
  }

  /**
   * Wait for wallets to load
   */
  async waitForWalletsToLoad() {
    // Wait for either wallets to appear, empty state, or error state
    await Promise.race([
      this.walletCards.first().waitFor({ state: 'visible' }).catch(() => {}),
      this.emptyState.waitFor({ state: 'visible' }).catch(() => {}),
      this.errorState.waitFor({ state: 'visible' }).catch(() => {}),
    ]);
  }
}

