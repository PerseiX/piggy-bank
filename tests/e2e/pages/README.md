# Page Object Model (POM) - Dokumentacja

## 📁 Struktura

```
tests/e2e/pages/
├── BasePage.ts          # Bazowa klasa z wspólną funkcjonalnością
├── LoginPage.ts         # Strona logowania
├── DashboardPage.ts     # Strona dashboardu z listą portfeli
├── WalletFormPage.ts    # Formularz tworzenia/edycji portfela
├── index.ts             # Centralized exports
└── README.md            # Ta dokumentacja
```

## 🎯 Wzorzec Page Object Model

Page Object Model (POM) to wzorzec projektowy który:
- **Zwiększa czytelność** - testy są bardziej zrozumiałe
- **Ułatwia utrzymanie** - zmiany w UI wymagają edycji tylko w jednym miejscu
- **Promuje reużywalność** - metody mogą być używane w wielu testach
- **Separuje logikę** - testy od implementacji UI

## 📚 Klasy Page Objects

### BasePage

Bazowa klasa zapewniająca wspólną funkcjonalność dla wszystkich Page Objects.

**Główne metody:**
- `goto(path: string)` - nawigacja do URL
- `waitForPageLoad()` - oczekiwanie na załadowanie strony
- `isVisible(locator: Locator)` - sprawdzenie widoczności elementu
- `waitForElement(locator: Locator)` - oczekiwanie na element

**Przykład:**
```typescript
class MyPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }
}
```

---

### LoginPage

Page Object dla strony logowania (`/auth/login`).

**Locatory (data-test-id):**
- `authForm` - formularz autoryzacji
- `emailInput` - pole email (`auth-email-input`)
- `passwordInput` - pole hasła (`auth-password-input`)
- `submitButton` - przycisk logowania (`auth-submit-button`)

**Główne metody:**
```typescript
// Nawigacja
await loginPage.navigate();

// Wypełnienie pól
await loginPage.fillEmail('user@example.com');
await loginPage.fillPassword('password123');

// Kliknięcie przycisku
await loginPage.clickSubmit();

// Kompletny flow logowania
await loginPage.login('user@example.com', 'password123');

// Sprawdzenie błędów
const hasError = await loginPage.hasErrorMessage();
const errorText = await loginPage.getErrorMessageText();
```

**Przykład użycia:**
```typescript
test('user login', async ({ page }) => {
  const loginPage = new LoginPage(page);
  
  await loginPage.navigate();
  await loginPage.login('user@example.com', 'SecurePass123!');
  
  // Weryfikacja przekierowania
  await page.waitForURL('/');
});
```

---

### DashboardPage

Page Object dla strony dashboardu (`/`).

**Locatory (data-test-id):**
- `dashboard` - główny kontener dashboardu
- `createWalletButton` - przycisk "Add Wallet" w nagłówku
- `createFirstWalletButton` - przycisk "Create First Wallet" (empty state)
- `walletList` - lista portfeli
- `walletCards` - karty pojedynczych portfeli
- `wallet-card-name` - nazwa portfela w karcie

**Główne metody:**
```typescript
// Nawigacja
await dashboardPage.navigate();

// Sprawdzenie załadowania
const isLoaded = await dashboardPage.isLoaded();

// Tworzenie portfela
await dashboardPage.clickAddWallet(); // z nagłówka
await dashboardPage.clickCreateFirstWallet(); // z empty state

// Pobieranie portfeli
const count = await dashboardPage.getWalletCount();
const wallet = dashboardPage.getWalletCard(0); // po indeksie
const wallet = dashboardPage.getWalletCardById('uuid'); // po ID
const wallet = dashboardPage.getWalletCardByName('Savings'); // po nazwie

// Sprawdzenie istnienia portfela
const exists = await dashboardPage.hasWalletWithName('My Wallet');

// Sprawdzenie stanów
const isEmpty = await dashboardPage.isEmpty();
const isLoading = await dashboardPage.isLoading();
const hasError = await dashboardPage.hasError();

// Oczekiwanie na załadowanie
await dashboardPage.waitForWalletsToLoad();
```

**Przykład użycia:**
```typescript
test('view wallets', async ({ page }) => {
  const dashboardPage = new DashboardPage(page);
  
  await dashboardPage.navigate();
  await dashboardPage.waitForWalletsToLoad();
  
  const walletCount = await dashboardPage.getWalletCount();
  expect(walletCount).toBeGreaterThan(0);
  
  const hasMyWallet = await dashboardPage.hasWalletWithName('Savings');
  expect(hasMyWallet).toBe(true);
});
```

---

### WalletFormPage

Page Object dla formularza portfela (tworzenie: `/wallets/new`, edycja: `/wallets/detail/:id/edit`).

**Locatory (data-test-id):**
- `walletForm` - formularz portfela
- `nameInput` - pole nazwy (`wallet-name-input`)
- `descriptionInput` - pole opisu (`wallet-description-input`)
- `submitButton` - przycisk zapisu (`wallet-submit-button`)
- `cancelButton` - przycisk anulowania (`wallet-cancel-button`)

**Główne metody:**
```typescript
// Nawigacja
await walletFormPage.navigateToCreate();
await walletFormPage.navigateToEdit('wallet-uuid');

// Wypełnienie pól
await walletFormPage.fillName('My Savings');
await walletFormPage.fillDescription('Emergency fund');

// Akcje
await walletFormPage.clickSubmit();
await walletFormPage.clickCancel();

// Kompletne flow
await walletFormPage.createWallet('Name', 'Description');
await walletFormPage.editWallet('New Name', 'New Description');

// Walidacja
const hasError = await walletFormPage.hasNameError();
const errorText = await walletFormPage.getNameErrorText();
const isDisabled = await walletFormPage.isSubmitDisabled();

// Pobieranie wartości
const name = await walletFormPage.getNameValue();
const desc = await walletFormPage.getDescriptionValue();
```

**Przykład użycia:**
```typescript
test('create wallet', async ({ page }) => {
  const walletFormPage = new WalletFormPage(page);
  
  await walletFormPage.navigateToCreate();
  await walletFormPage.createWallet('Vacation Fund', 'Saving for summer trip');
  
  // Oczekiwanie na przekierowanie
  await page.waitForURL('/');
});
```

---

## 🔧 Best Practices

### 1. Używaj data-test-id

```typescript
// ✅ DOBRZE - stabilny selektor
this.submitButton = page.locator('[data-test-id="auth-submit-button"]');

// ❌ ŹLE - wrażliwy na zmiany CSS
this.submitButton = page.locator('.btn-primary.submit');
```

### 2. Enkapsulacja logiki

```typescript
// ✅ DOBRZE - enkapsulowana logika w Page Object
await loginPage.login(email, password);

// ❌ ŹLE - bezpośrednia manipulacja w teście
await page.locator('[data-test-id="email"]').fill(email);
await page.locator('[data-test-id="password"]').fill(password);
await page.locator('[data-test-id="submit"]').click();
```

### 3. Metody zwracają wartości lub Locatory

```typescript
// Zwracanie boolean
async isVisible(): Promise<boolean> {
  return await this.element.isVisible();
}

// Zwracanie Locator do dalszych operacji
getWalletCard(index: number): Locator {
  return this.walletCards.nth(index);
}
```

### 4. Używaj async/await konsekwentnie

```typescript
// ✅ DOBRZE
async fillEmail(email: string) {
  await this.emailInput.fill(email);
}

// ❌ ŹLE
fillEmail(email: string) {
  this.emailInput.fill(email); // Brak async/await
}
```

### 5. Walidacja w testach, nie w Page Objects

```typescript
// ✅ DOBRZE - walidacja w teście
test('login', async ({ page }) => {
  await loginPage.login(email, password);
  await expect(page).toHaveURL('/dashboard'); // asercja w teście
});

// ❌ ŹLE - walidacja w Page Object
async login(email: string, password: string) {
  await this.fillEmail(email);
  await this.fillPassword(password);
  await this.clickSubmit();
  await expect(this.page).toHaveURL('/dashboard'); // NIE TAK!
}
```

## 📝 Przykładowy kompletny test

```typescript
import { test, expect } from '@playwright/test';
import { LoginPage, DashboardPage, WalletFormPage } from '../pages';

test('complete wallet creation flow', async ({ page }) => {
  // Initialize Page Objects
  const loginPage = new LoginPage(page);
  const dashboardPage = new DashboardPage(page);
  const walletFormPage = new WalletFormPage(page);

  // 1. Login
  await loginPage.navigate();
  await loginPage.login('user@example.com', 'password');
  await page.waitForURL('/');

  // 2. Verify dashboard
  await expect(dashboardPage.dashboard).toBeVisible();

  // 3. Create new wallet
  await dashboardPage.clickAddWallet();
  await page.waitForURL('/wallets/new');

  // 4. Fill form
  const walletName = `Test Wallet ${Date.now()}`;
  await walletFormPage.createWallet(walletName, 'Test description');
  await page.waitForURL('/');

  // 5. Verify wallet created
  const hasWallet = await dashboardPage.hasWalletWithName(walletName);
  expect(hasWallet).toBe(true);
});
```

## 🚀 Uruchamianie testów

```bash
# Wszystkie testy E2E
npm run test:e2e

# Konkretny plik
npx playwright test tests/e2e/wallet/create-wallet.spec.ts

# Z UI
npx playwright test --ui

# Debug mode
npx playwright test --debug

# Konkretny test
npx playwright test -g "should successfully create a new wallet"
```

## 📊 Struktura atrybutów data-test-id

| Komponent | data-test-id | Przeznaczenie |
|-----------|--------------|---------------|
| **AuthForm** | `auth-form` | Formularz logowania/rejestracji |
| | `auth-email-input` | Pole email |
| | `auth-password-input` | Pole hasła |
| | `auth-submit-button` | Przycisk submit |
| **Dashboard** | `dashboard` | Główny kontener |
| | `create-wallet-button` | Przycisk tworzenia (nagłówek) |
| | `create-first-wallet-button` | Przycisk tworzenia (empty state) |
| | `wallet-list` | Lista portfeli |
| | `wallet-card` | Karta portfela |
| | `wallet-card-name` | Nazwa w karcie |
| **WalletForm** | `wallet-form` | Formularz portfela |
| | `wallet-name-input` | Pole nazwy |
| | `wallet-description-input` | Pole opisu |
| | `wallet-submit-button` | Przycisk zapisu |
| | `wallet-cancel-button` | Przycisk anulowania |

## 🔗 Dodatkowe zasoby

- [Playwright Documentation](https://playwright.dev/)
- [Page Object Model Pattern](https://playwright.dev/docs/pom)
- [Best Practices](https://playwright.dev/docs/best-practices)

