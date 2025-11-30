# Environment Setup for GitHub Actions

## Integration Environment Secrets

The `pull-request.yml` workflow uses an **integration** environment to manage secrets for E2E tests.

### Setup Steps

1. **Go to your GitHub repository**
2. Navigate to: **Settings → Environments**
3. Click **New environment** (if not exists)
4. Name it: `integration`
5. Click **Add environment**

### Required Secrets

Add these secrets to the `integration` environment:

| Secret Name                  | Description                                      | Example                                     |
| ---------------------------- | ------------------------------------------------ | ------------------------------------------- |
| `SUPABASE_URL`               | Supabase instance URL for tests                 | `https://xxxxx.supabase.co`                 |
| `SUPABASE_KEY`               | Supabase anon key for test instance             | `eyJhbGc...`                                |
| `PUBLIC_SUPABASE_URL`        | Public Supabase URL (same as above usually)     | `https://xxxxx.supabase.co`                 |
| `PUBLIC_SUPABASE_ANON_KEY`   | Public Supabase anon key (same as above usually | `eyJhbGc...`                                |
| `E2E_USERNAME`               | Test user email for authentication              | `test@example.com`                          |
| `E2E_PASSWORD`               | Test user password                              | `SecurePassword123!`                        |
| `BASE_URL`                   | Base URL for tests (optional)                   | `http://localhost:3000` (default if not st) |
| `CODECOV_TOKEN` (repository) | Codecov upload token (repository-level secret)  | Get from codecov.io                         |

### Important Notes

#### Supabase Test Instance

⚠️ **Use a separate Supabase instance for testing!**

- Do NOT use your production Supabase instance
- E2E tests will create and delete data
- Global teardown script deletes all test data after tests run

#### Test User Setup

The test user must exist in your Supabase test instance:

1. Create a user with the email/password specified in `E2E_USERNAME` and `E2E_PASSWORD`
2. Or use Supabase Auth Admin API to create the user
3. Make sure the user has necessary permissions

#### Codecov Token

The `CODECOV_TOKEN` should be added as a **repository secret**, not an environment secret:

1. Go to [Codecov.io](https://codecov.io)
2. Add your repository
3. Copy the upload token
4. Add it to: **Settings → Secrets and variables → Actions → New repository secret**
5. Name: `CODECOV_TOKEN`

### Debugging

The workflow includes a debug step that checks if secrets are loaded correctly without exposing their values. Check the workflow logs for output like:

```
✓ SUPABASE_URL is set
✓ SUPABASE_KEY is set
✓ PUBLIC_SUPABASE_URL is set
✓ PUBLIC_SUPABASE_ANON_KEY is set
✓ E2E_USERNAME is set
✓ E2E_PASSWORD is set
```

If any show as `✗ ... is missing`, that secret is not configured correctly in the integration environment.

### Common Issues

#### Secrets Not Found

**Symptom**: Variables show as empty or missing in the debug step

**Solution**:

- Verify secrets are added to the **integration environment**, not repository secrets
- Check spelling of secret names (they are case-sensitive)
- Ensure the environment is named exactly `integration`

#### Supabase Client Error

**Symptom**: Error: "Your project's URL and Key are required to create a Supabase client!"

**Solution**:

- Verify `PUBLIC_SUPABASE_URL` and `PUBLIC_SUPABASE_ANON_KEY` are set
- These variables must be accessible to the dev server
- The Playwright config now passes these to the webServer automatically

#### Authentication Failures

**Symptom**: E2E tests fail with authentication errors

**Solution**:

- Verify the test user exists in your Supabase test instance
- Check `E2E_USERNAME` and `E2E_PASSWORD` match an existing user
- Ensure Auth is enabled in your Supabase project

### Removing Debug Step

Once you've verified all secrets are loading correctly, you can remove the "Verify environment variables (debug)" step from the workflow to reduce log clutter.

## Local Testing

To test E2E locally with the same environment:

1. Copy `.env.test.example` to `.env.test` (if it exists) or create `.env.test`:

```bash
cat > .env.test << EOF
CI=false
SUPABASE_URL=https://your-test-project.supabase.co
SUPABASE_KEY=your_anon_key
BASE_URL=http://localhost:3000
E2E_USERNAME=test@example.com
E2E_PASSWORD=YourTestPassword123!
PUBLIC_SUPABASE_URL=https://your-test-project.supabase.co
PUBLIC_SUPABASE_ANON_KEY=your_anon_key
EOF
```

2. Run tests:

```bash
npm run playwright:install
npm run test:e2e
```

## Security Notes

- Never commit `.env.test` to version control (it's in `.gitignore`)
- Use a separate Supabase instance for testing
- Rotate credentials regularly
- Test user should have minimal permissions needed for tests

