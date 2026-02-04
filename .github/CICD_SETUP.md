# CI/CD Pipeline Setup Guide

This document explains how to configure the CI/CD pipeline for Planloo.

## Overview

The pipeline consists of three workflows:

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| `ci.yml` | Push to main/dev, PRs | Run tests, lint, type-check |
| `deploy-backend.yml` | Push to main/dev (backend changes) | Deploy API to Cloudflare Workers |
| `deploy-frontend.yml` | Push to main/dev (frontend changes) | Deploy site to Cloudflare Pages |

## Branch Strategy

- `dev` branch → Staging environment
- `main` branch → Production environment

## Required GitHub Secrets

Configure these secrets in GitHub repository settings → Secrets and variables → Actions:

### Required for all deployments

| Secret | Description | How to get it |
|--------|-------------|---------------|
| `CLOUDFLARE_API_TOKEN` | Cloudflare API token with Workers/Pages/D1 permissions | Cloudflare Dashboard → My Profile → API Tokens → Create Token |
| `CLOUDFLARE_ACCOUNT_ID` | Your Cloudflare account ID | Cloudflare Dashboard → Workers & Pages → Overview (right sidebar) |

### Creating the Cloudflare API Token

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/profile/api-tokens)
2. Click "Create Token"
3. Use "Edit Cloudflare Workers" template or create custom with:
   - **Account** → Workers Scripts → Edit
   - **Account** → Workers KV Storage → Edit
   - **Account** → Workers R2 Storage → Edit
   - **Account** → D1 → Edit
   - **Account** → Cloudflare Pages → Edit
   - **Zone** → Zone Settings → Edit (if using custom domains)

## GitHub Environments Setup

Create these environments in GitHub repository settings → Environments:

### staging
- Protection rules: None (optional: require reviewers)
- Environment URL: `https://staging.planloo.com`
- Secrets: Can override account-level secrets if needed

### production
- Protection rules: Require reviewers (recommended)
- Environment URL: `https://planloo.com`
- Secrets: Can override account-level secrets if needed

## Cloudflare Setup

### 1. Create D1 Databases

```bash
# Staging database
npx wrangler d1 create planloo-db-staging

# Production database
npx wrangler d1 create planloo-db
```

Update `backend/wrangler.toml` with the returned database IDs.

### 2. Create Cloudflare Pages Projects

```bash
# Staging
npx wrangler pages project create planloo-staging

# Production
npx wrangler pages project create planloo
```

### 3. Set Worker Secrets

```bash
# Staging secrets
wrangler secret put BETTER_AUTH_SECRET --env staging
wrangler secret put GOOGLE_CLIENT_ID --env staging      # Optional
wrangler secret put GOOGLE_CLIENT_SECRET --env staging  # Optional

# Production secrets
wrangler secret put BETTER_AUTH_SECRET --env production
wrangler secret put GOOGLE_CLIENT_ID --env production      # Optional
wrangler secret put GOOGLE_CLIENT_SECRET --env production  # Optional
```

### 4. Create KV Namespaces (Optional - for rate limiting)

```bash
# Staging
wrangler kv:namespace create "RATE_LIMIT" --env staging

# Production
wrangler kv:namespace create "RATE_LIMIT" --env production
```

Update the KV namespace IDs in `backend/wrangler.toml`.

### 5. Create R2 Buckets (Optional - for file uploads)

```bash
# Staging
wrangler r2 bucket create planloo-uploads-staging

# Production
wrangler r2 bucket create planloo-uploads
```

## Manual Deployments

Both deployment workflows support manual triggers via `workflow_dispatch`:

1. Go to Actions tab in GitHub
2. Select the deployment workflow
3. Click "Run workflow"
4. Choose the environment (staging or production)

## Database Migrations

Migrations run automatically before each deployment. They can also be run manually:

```bash
# Local
npm run db:migrate:local

# Development (remote)
npm run db:migrate

# Staging
npm run db:migrate:staging

# Production
npm run db:migrate:production
```

## Troubleshooting

### Deployment fails with authentication error
- Verify `CLOUDFLARE_API_TOKEN` has correct permissions
- Verify `CLOUDFLARE_ACCOUNT_ID` is correct
- Regenerate the API token if needed

### Database migration fails
- Check that the D1 database exists and ID is correct in `wrangler.toml`
- Verify the API token has D1 edit permissions

### E2E tests fail
- E2E tests only run on pull requests
- Ensure Playwright is properly configured in frontend

### Build fails with missing environment variables
- Check that `PUBLIC_API_URL` is set in the workflow
- Verify the API URL matches the environment being deployed
