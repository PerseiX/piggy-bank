import { Page, Locator } from "@playwright/test";
import { BasePage } from "./BasePage";

/**
 * Page Object Model for the Dashboard page
 * Uses data-test-id attributes for stable element selection
 */
export class DashboardPage extends BasePage {
  // Locators using data-test-id for resilient element selection
  readonly dashboard: Locator;
  readonly pageHeading: Locator;
  readonly createWalletButton: Locator;
  readonly createFirstWalletButton: Locator;
  readonly walletList: Locator;
  readonly walletCards: Locator;
  readonly loadingState: Locator;
  readonly errorState: Locator;
  readonly emptyState: Locator;

  constructor(page: Page) {
    super(page);

    // Initialize locators using data-test-id attributes
    this.dashboard = page.locator('[data-test-id="dashboard"]');
    this.createWalletButton = page.locator('[data-test-id="create-wallet-button"]');
    this.createFirstWalletButton = page.locator('[data-test-id="create-first-wallet-button"]');
    this.walletList = page.locator('[data-test-id="wallet-list"]');
    this.walletCards = page.locator('[data-test-id="wallet-card"]');

    // Fallback to role-based selectors for elements without data-test-id
    this.pageHeading = page.getByRole("heading", { name: /dashboard/i, level: 1 });
    this.loadingState = page.getByRole("status").filter({ hasText: /loading/i });
    this.errorState = page.getByText(/failed to load/i);
    this.emptyState = page.getByText(/no wallets yet/i);
  }

  /**
   * Navigate to the dashboard page
   */
  async navigate() {
    await this.goto("/");
    await this.waitForPageLoad();
  }

  /**
   * Check if the dashboard is loaded
   */
  async isLoaded(): Promise<boolean> {
    return await this.isVisible(this.pageHeading);
  }

  /**
   * Click the add wallet button (header button)
   */
  async clickAddWallet() {
    await this.createWalletButton.click();
  }

  /**
   * Click the create first wallet button (empty state)
   */
  async clickCreateFirstWallet() {
    await this.createFirstWalletButton.click();
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
   * Get wallet card by wallet ID
   */
  getWalletCardById(walletId: string): Locator {
    return this.page.locator(`[data-test-id="wallet-card"][data-wallet-id="${walletId}"]`);
  }

  /**
   * Get wallet card by name
   */
  getWalletCardByName(name: string): Locator {
    return this.walletCards.filter({ has: this.page.locator(`[data-test-id="wallet-card-name"]:text("${name}")`) });
  }

  /**
   * Check if wallet with name exists
   */
  async hasWalletWithName(name: string): Promise<boolean> {
    const wallet = this.getWalletCardByName(name);
    return (await wallet.count()) > 0;
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
      this.walletCards
        .first()
        .waitFor({ state: "visible" })
        .catch(() => {}),
      this.emptyState.waitFor({ state: "visible" }).catch(() => {}),
      this.errorState.waitFor({ state: "visible" }).catch(() => {}),
    ]);
  }
}
