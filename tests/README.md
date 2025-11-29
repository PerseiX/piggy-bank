# Test Suite

This directory contains the test suite for the Piggy Bank application.

## Structure

```
tests/
├── e2e/                    # End-to-end tests using Playwright
│   ├── auth/              # Authentication tests
│   ├── dashboard/         # Dashboard tests
│   ├── wallet/            # Wallet-related tests
│   ├── pages/             # Page Object Models
│   └── fixtures/          # Test helpers and utilities
├── unit/                   # Unit tests
├── global-teardown.ts     # Global teardown script
└── setup.ts               # Test setup configuration
```

## Global Teardown

The test suite includes a global teardown script that automatically cleans up the Supabase database after all Playwright tests complete.

### What It Does

The teardown script (`global-teardown.ts`) performs the following cleanup operations in order:

1. **Deletes all instrument_value_changes** - Historical value changes for instruments
2. **Deletes all instruments** - Financial instruments within wallets
3. **Deletes all wallets** - User wallets

This order is important due to foreign key constraints with `ON DELETE RESTRICT` in the database schema.

### Configuration

The teardown script uses environment variables from `.env.test`:

- `SUPABASE_URL` - URL of your Supabase instance
- `SUPABASE_KEY` - Supabase anonymous key

Make sure your `.env.test` file includes these variables:

```env
# Supabase configuration for tests
SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_KEY=your_supabase_anon_key_here

# Other test configuration...
BASE_URL=http://localhost:3000
E2E_USERNAME=test@example.com
E2E_PASSWORD=TestPassword123!
```

### How It Works

The global teardown is automatically executed by Playwright after all tests complete, as configured in `playwright.config.ts`:

```typescript
export default defineConfig({
  // ... other config
  globalTeardown: './tests/global-teardown.ts',
});
```

### Error Handling

The teardown script includes comprehensive error handling:

- ✅ Validates environment variables before attempting cleanup
- ✅ Reports the number of rows deleted from each table
- ✅ Logs errors but doesn't fail the test suite (best-effort cleanup)
- ✅ Provides clear console output for debugging

### Running Tests

To run tests with automatic cleanup:

```bash
# Run all e2e tests (cleanup runs after)
npm run test:e2e

# Run specific test file (cleanup still runs after all tests)
npx playwright test tests/e2e/wallet/create-wallet.spec.ts

# Run tests in UI mode (for development)
npx playwright test --ui
```

### Manual Cleanup

If you need to manually clean up the database (without running tests):

```bash
# Create a script that imports and runs the teardown function
node -e "import('./tests/global-teardown.ts').then(m => m.default())"
```

### Important Notes

⚠️ **WARNING**: The teardown script deletes ALL data from the wallets, instruments, and instrument_value_changes tables. Make sure you're using a test database instance, not production!

- Always use a separate Supabase instance or local Supabase for testing
- The teardown only runs after ALL tests complete
- Data created during tests will remain until teardown runs
- If tests are interrupted (Ctrl+C), teardown may not run

### Troubleshooting

**Teardown not running:**
- Make sure all tests complete (don't interrupt with Ctrl+C)
- Check that `globalTeardown` is configured in `playwright.config.ts`
- Verify the teardown file path is correct

**Database connection errors:**
- Verify `SUPABASE_URL` and `SUPABASE_KEY` in `.env.test`
- Ensure your Supabase instance is running (for local: `npx supabase start`)
- Check network connectivity to your Supabase instance

**Permission errors:**
- Ensure the Supabase key has sufficient permissions to delete rows
- Check Row Level Security (RLS) policies on the tables
- The anon key might not have delete permissions if RLS is strict

## Related Files

- `playwright.config.ts` - Main Playwright configuration
- `.env.test` - Test environment variables (gitignored)
- `tests/e2e/fixtures/testHelpers.ts` - Reusable test utilities
