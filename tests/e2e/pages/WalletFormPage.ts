import { Page, Locator } from "@playwright/test";
import { BasePage } from "./BasePage";

/**
 * Page Object Model for the Wallet Form page (Create/Edit)
 * Uses data-test-id attributes for stable element selection
 */
export class WalletFormPage extends BasePage {
  // Locators using data-test-id for resilient element selection
  readonly walletForm: Locator;
  readonly nameInput: Locator;
  readonly descriptionInput: Locator;
  readonly submitButton: Locator;
  readonly cancelButton: Locator;
  readonly nameErrorMessage: Locator;
  readonly descriptionErrorMessage: Locator;

  constructor(page: Page) {
    super(page);

    // Initialize locators using data-test-id attributes
    this.walletForm = page.locator('[data-test-id="wallet-form"]');
    this.nameInput = page.locator('[data-test-id="wallet-name-input"]');
    this.descriptionInput = page.locator('[data-test-id="wallet-description-input"]');
    this.submitButton = page.locator('[data-test-id="wallet-submit-button"]');
    this.cancelButton = page.locator('[data-test-id="wallet-cancel-button"]');

    // Error messages are typically displayed near their respective fields
    this.nameErrorMessage = page.locator('[data-test-id="wallet-name-input"]').locator("..").locator('[role="alert"]');
    this.descriptionErrorMessage = page
      .locator('[data-test-id="wallet-description-input"]')
      .locator("..")
      .locator('[role="alert"]');
  }

  /**
   * Navigate to the create wallet page
   */
  async navigateToCreate() {
    await this.goto("/wallets/new");
    await this.waitForPageLoad();
  }

  /**
   * Navigate to the edit wallet page
   */
  async navigateToEdit(walletId: string) {
    await this.goto(`/wallets/detail/${walletId}/edit`);
    await this.waitForPageLoad();
  }

  /**
   * Check if the wallet form is loaded
   */
  async isLoaded(): Promise<boolean> {
    return await this.isVisible(this.walletForm);
  }

  /**
   * Fill in the wallet name field
   */
  async fillName(name: string) {
    await this.nameInput.clear();
    await this.nameInput.fill(name);
  }

  /**
   * Fill in the wallet description field
   */
  async fillDescription(description: string) {
    await this.descriptionInput.clear();
    await this.descriptionInput.fill(description);
  }

  /**
   * Click the submit button
   */
  async clickSubmit() {
    await this.submitButton.click();
  }

  /**
   * Click the cancel button
   */
  async clickCancel() {
    await this.cancelButton.click();
  }

  /**
   * Complete the create wallet flow
   */
  async createWallet(name: string, description?: string) {
    await this.fillName(name);
    if (description) {
      await this.fillDescription(description);
    }
    await this.clickSubmit();
  }

  /**
   * Complete the edit wallet flow
   */
  async editWallet(name?: string, description?: string) {
    if (name !== undefined) {
      await this.fillName(name);
    }
    if (description !== undefined) {
      await this.fillDescription(description);
    }
    await this.clickSubmit();
  }

  /**
   * Check if name error message is visible
   */
  async hasNameError(): Promise<boolean> {
    return await this.isVisible(this.nameErrorMessage);
  }

  /**
   * Get the name error message text
   */
  async getNameErrorText(): Promise<string> {
    return (await this.nameErrorMessage.textContent()) || "";
  }

  /**
   * Check if description error message is visible
   */
  async hasDescriptionError(): Promise<boolean> {
    return await this.isVisible(this.descriptionErrorMessage);
  }

  /**
   * Get the description error message text
   */
  async getDescriptionErrorText(): Promise<string> {
    return (await this.descriptionErrorMessage.textContent()) || "";
  }

  /**
   * Check if submit button is disabled
   */
  async isSubmitDisabled(): Promise<boolean> {
    return await this.submitButton.isDisabled();
  }

  /**
   * Check if cancel button is disabled
   */
  async isCancelDisabled(): Promise<boolean> {
    return await this.cancelButton.isDisabled();
  }

  /**
   * Get the current value of the name input
   */
  async getNameValue(): Promise<string> {
    return await this.nameInput.inputValue();
  }

  /**
   * Get the current value of the description input
   */
  async getDescriptionValue(): Promise<string> {
    return await this.descriptionInput.inputValue();
  }

  /**
   * Wait for form submission to complete
   * (waits for navigation away from the form)
   */
  async waitForSubmission() {
    await this.page.waitForURL("/", { timeout: 5000 });
  }
}
