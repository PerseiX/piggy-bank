import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Page Object Model for the Login page
 */
export class LoginPage extends BasePage {
  // Locators
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly errorMessage: Locator;
  readonly signUpLink: Locator;
  readonly forgotPasswordLink: Locator;

  constructor(page: Page) {
    super(page);
    
    // Initialize locators using resilient selectors
    this.emailInput = page.getByRole('textbox', { name: /email/i });
    this.passwordInput = page.getByLabel(/password/i);
    this.submitButton = page.getByRole('button', { name: /sign in|log in/i });
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

