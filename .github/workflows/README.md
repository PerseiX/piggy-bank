# GitHub Actions Workflows

This directory contains CI/CD workflows for the Piggy Bank project.

## Workflows

### 1. pull-request.yml

Runs on every pull request to the `master` branch. This workflow ensures code quality and functionality before merging.

#### Workflow Structure

```
lint (sequential)
  ↓
┌─────────────────┐
│   unit-test     │  (parallel)
└─────────────────┘
┌─────────────────┐
│   e2e-test      │  (parallel)
└─────────────────┘
  ↓
status-comment (only if all pass)
```

#### Jobs

1. **lint** - Code quality checks
   - Prettier formatting check
   - ESLint code linting
   
2. **unit-test** - Unit and integration tests (runs in parallel after lint)
   - Runs Vitest test suite with coverage
   - Uploads coverage to Codecov with `unit` flag
   
3. **e2e-test** - End-to-end tests (runs in parallel after lint)
   - Uses `integration` environment for secrets
   - Installs Playwright Chromium browser only
   - Creates `.env.test` file from secrets
   - Runs Playwright E2E tests
   - Uploads test artifacts on failure
   - Uploads test results for debugging
   
4. **status-comment** - PR status notification (only runs if all previous jobs succeed)
   - Posts a success comment to the PR
   - Includes links to workflow run and commit

#### Required Secrets

You need to configure the following secrets in your GitHub repository:

##### Repository Secrets

- `CODECOV_TOKEN` - Token for uploading coverage to Codecov

##### Integration Environment Secrets

Create an environment named `integration` with the following secrets:

- `SUPABASE_URL` - Supabase test instance URL (for admin/background operations)
- `SUPABASE_KEY` - Supabase service role or anon key (for admin operations)
- `PUBLIC_SUPABASE_URL` - Public Supabase URL (used in client-side code)
- `PUBLIC_SUPABASE_KEY` - Public Supabase anon key (used in client-side code)
- `BASE_URL` - Base URL for E2E tests (default: `http://localhost:3000`)
- `E2E_USERNAME` - Test user email for authentication tests
- `E2E_PASSWORD` - Test user password for authentication tests

#### Setup Instructions

1. **Create Integration Environment:**
   ```
   GitHub Repository → Settings → Environments → New environment → "integration"
   ```

2. **Add Secrets to Integration Environment:**
   - Go to the `integration` environment
   - Add all the secrets listed above

3. **Add Repository Secrets:**
   - Go to Settings → Secrets and variables → Actions
   - Add `CODECOV_TOKEN`

4. **Codecov Setup:**
   - Sign up at [Codecov](https://codecov.io)
   - Add your repository
   - Copy the token to `CODECOV_TOKEN` secret

#### Action Versions

All actions use the latest major versions:

- `actions/checkout@v6`
- `actions/setup-node@v6`
- `actions/upload-artifact@v5`
- `codecov/codecov-action@v5`
- `actions/github-script@v8`

#### Features

✅ Uses Node version from `.nvmrc` file  
✅ npm caching for faster builds  
✅ Non-interactive mode (uses `npm ci`)  
✅ Parallel test execution (unit + e2e)  
✅ Code coverage collection and upload  
✅ Automatic PR commenting on success  
✅ Test artifact preservation on failure  
✅ Environment-based secret management  
✅ Chromium-only E2E testing per project guidelines  

### 2. master.yml

Runs on push to `master` branch. Executes tests and builds the production bundle.

## Best Practices

- All workflows use `npm ci` instead of `npm install` for reproducible builds
- Node.js version is read from `.nvmrc` file
- Secrets are never logged or exposed in workflow outputs
- Environment variables are properly scoped to jobs
- Test artifacts are preserved for debugging
- Coverage is uploaded with separate flags for better tracking

## Troubleshooting

### E2E Tests Failing

1. Check that all environment secrets are set correctly in the `integration` environment
2. Verify the Supabase test instance is accessible
3. Ensure `.env.test` file is created correctly before running tests
4. Review test artifacts in the Actions tab
5. Check Playwright reports for detailed failure information

**Note**: The Playwright config uses `dev:e2e` script which runs Astro in test mode and passes the required environment variables to the dev server.

### Coverage Not Uploading

1. Verify `CODECOV_TOKEN` is set correctly
2. Check that tests are generating `coverage/lcov.info`
3. Review Codecov action logs for errors
4. Note: `fail_ci_if_error: false` means upload failures won't break the build

### Status Comment Not Posted

1. Ensure all three jobs (lint, unit-test, e2e-test) passed
2. Check that the PR is not from a fork (GITHUB_TOKEN has limited permissions for forks)
3. Verify the workflow has `pull-requests: write` permission

## Local Testing

To replicate the CI environment locally:

```bash
# Lint
npx prettier --check .
npm run lint

# Unit tests with coverage
npm run test:coverage

# E2E tests (requires .env.test file)
npm run playwright:install
npm run test:e2e
```

## Notes

- E2E tests do not currently generate code coverage (requires instrumentation)
- Playwright webServer starts the dev server automatically for E2E tests
- Global teardown cleans up test database after E2E tests complete
- The workflow uses the `integration` environment to separate test secrets from production

