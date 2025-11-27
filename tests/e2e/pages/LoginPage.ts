import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Page Object Model for the Login page
 * Uses data-test-id attributes for stable element selection
 */
export class LoginPage extends BasePage {
  // Locators using data-test-id for resilient element selection
  readonly authForm: Locator;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly errorMessage: Locator;
  readonly signUpLink: Locator;
  readonly forgotPasswordLink: Locator;

  constructor(page: Page) {
    super(page);
    
    // Initialize locators using data-test-id attributes
    this.authForm = page.locator('[data-test-id="auth-form"]');
    this.emailInput = page.locator('[data-test-id="auth-email-input"]');
    this.passwordInput = page.locator('[data-test-id="auth-password-input"]');
    this.submitButton = page.locator('[data-test-id="auth-submit-button"]');
    
    // Fallback to role-based selectors for elements without data-test-id
    this.errorMessage = page.getByRole('alert');
    this.signUpLink = page.getByRole('link', { name: /sign up|register/i });
    this.forgotPasswordLink = page.getByRole('link', { name: /forgot password/i });
  }

  /**
   * Navigate to the login page
   */
  async navigate() {
    await this.goto('/auth/login');
    await this.waitForPageLoad();
  }

  /**
   * Fill in the email field
   */
  async fillEmail(email: string) {
    await this.emailInput.fill(email);
  }

  /**
   * Fill in the password field
   */
  async fillPassword(password: string) {
    await this.passwordInput.fill(password);
  }

  /**
   * Click the submit button
   */
  async clickSubmit() {
    await this.submitButton.click();
  }

  /**
   * Complete login flow with credentials
   */
  async login(email: string, password: string) {
    await this.fillEmail(email);
    await this.fillPassword(password);
    await this.clickSubmit();
  }

  /**
   * Check if error message is displayed
   */
  async hasErrorMessage(): Promise<boolean> {
    return await this.isVisible(this.errorMessage);
  }

  /**
   * Get the error message text
   */
  async getErrorMessageText(): Promise<string> {
    return await this.errorMessage.textContent() || '';
  }

  /**
   * Click the sign up link
   */
  async goToSignUp() {
    await this.signUpLink.click();
  }

  /**
   * Click the forgot password link
   */
  async goToForgotPassword() {
    await this.forgotPasswordLink.click();
  }

  /**
   * Check if the login page is loaded
   */
  async isLoaded(): Promise<boolean> {
    return await this.isVisible(this.submitButton);
  }
}

