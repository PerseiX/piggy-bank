# GitHub Secrets Update Required

## Issue Fixed

The E2E tests in the CI pipeline were failing with the error:
```
Your project's URL and Key are required to create a Supabase client!
```

This was because the workflow was using an incorrect environment variable name (`PUBLIC_SUPABASE_ANON_KEY`) instead of the correct one used in the codebase (`PUBLIC_SUPABASE_KEY`).

## Changes Made

### 1. GitHub Actions Workflow (`.github/workflows/pull-request.yml`)
- ✅ Changed `PUBLIC_SUPABASE_ANON_KEY` to `PUBLIC_SUPABASE_KEY` in `.env.test` file creation
- ✅ Updated environment variable verification step
- ✅ Updated E2E test run step
- ✅ Updated unit test run step for consistency

### 2. Playwright Configuration (`playwright.config.ts`)
- ✅ Changed `PUBLIC_SUPABASE_ANON_KEY` to `PUBLIC_SUPABASE_KEY` in webServer env config

### 3. Documentation Updates
- ✅ Updated main `README.md` with correct variable names
- ✅ Updated `tests/README.md` with all required environment variables
- ✅ Updated `.github/workflows/README.md` with correct secret names

## Required Action: Update GitHub Secrets

You need to add/rename a secret in your GitHub repository's `integration` environment:

### Steps:

1. Go to: **GitHub Repository → Settings → Environments → integration**

2. **Add or Update** this secret:
   - Name: `PUBLIC_SUPABASE_KEY`
   - Value: Your Supabase anonymous (anon) key

3. **Optional**: If you had an old secret named `PUBLIC_SUPABASE_ANON_KEY`, you can delete it (it's no longer used)

### Complete List of Required Secrets for Integration Environment:

| Secret Name | Description |
|-------------|-------------|
| `SUPABASE_URL` | Supabase test instance URL (for admin/server operations) |
| `SUPABASE_KEY` | Supabase service role or anon key (for admin operations) |
| `PUBLIC_SUPABASE_URL` | Public Supabase URL (for client-side code) |
| `PUBLIC_SUPABASE_KEY` | Public Supabase anon key (for client-side code) ⚠️ **NEW/UPDATED** |
| `BASE_URL` | Base URL for E2E tests (optional, defaults to `http://localhost:3000`) |
| `E2E_USERNAME` | Test user email for authentication tests |
| `E2E_PASSWORD` | Test user password for authentication tests |

## Why This Change?

The codebase uses `PUBLIC_SUPABASE_KEY` consistently across:
- `src/lib/supabase-server.ts` (line 31)
- `src/lib/supabase-browser.ts` (line 20)

The workflow was incorrectly using `PUBLIC_SUPABASE_ANON_KEY`, which doesn't match the actual variable name used in the code.

## Verification

After updating the secret, the next CI run should:
1. ✅ Successfully create the `.env.test` file with correct variables
2. ✅ Start the Astro dev server without Supabase configuration errors
3. ✅ Run E2E tests successfully

---

**Note**: This file can be deleted after you've updated the secrets. It's here for reference only.

