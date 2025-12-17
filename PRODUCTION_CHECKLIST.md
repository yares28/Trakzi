# Production Deployment Checklist

This checklist covers all steps required to deploy Trakzi to production with Clerk authentication, Neon Postgres, and Vercel hosting.

---

## Prerequisites

- [ ] Custom domain purchased (e.g., `trakzi.com`)
- [ ] Stripe account activated for live payments
- [ ] Access to Clerk Dashboard
- [ ] Access to Neon Console
- [ ] Access to Vercel Dashboard

---

## 1. Clerk Production Setup

### Create Production Instance

- [ ] Go to [Clerk Dashboard](https://dashboard.clerk.com)
- [ ] Create a **new production instance** (or switch existing to production mode)
- [ ] Note: Production instances have stricter security and don't allow `localhost` origins

### Configure DNS for Clerk

- [ ] In Clerk Dashboard → **Domains** → Add your custom domain
- [ ] Add the required CNAME records to your DNS provider:
  ```
  CNAME clerk → frontend-api.clerk.dev
  ```
- [ ] Wait for DNS propagation (can take up to 48 hours)

### Get Live API Keys

- [ ] Go to Clerk Dashboard → **API Keys**
- [ ] Copy the **Publishable Key** (starts with `pk_live_...`)
- [ ] Copy the **Secret Key** (starts with `sk_live_...`)

### Update OAuth Credentials (if using social login)

- [ ] Google OAuth: Update authorized redirect URIs to production domain
- [ ] GitHub OAuth: Update callback URL to production domain
- [ ] Apple OAuth: Update return URLs to production domain

### Configure Webhooks (if used)

- [ ] Clerk Dashboard → **Webhooks** → Add endpoint
- [ ] Endpoint URL: `https://trakzi.com/api/webhooks/clerk`
- [ ] Select relevant events (user.created, user.updated, etc.)
- [ ] Note the webhook signing secret

---

## 2. Neon Production Setup

### Create Production Database

**Option A: Production Branch (Recommended)**
- [ ] Go to [Neon Console](https://console.neon.tech)
- [ ] Navigate to your project → **Branches**
- [ ] Create a new branch called `production`
- [ ] This gives you an isolated production database

**Option B: Separate Project**
- [ ] Create a new Neon project for production
- [ ] Copy the schema from development

### Get Production Connection String

- [ ] In Neon Console → **Dashboard** or **Connection Details**
- [ ] Copy the **pooled connection string** (includes `-pooler` in hostname)
  ```
  postgresql://user:pass@ep-xxx-pooler.region.aws.neon.tech/neondb?sslmode=require
  ```
- [ ] Copy the **direct connection string** for migrations
  ```
  postgresql://user:pass@ep-xxx.region.aws.neon.tech/neondb?sslmode=require
  ```

### Run Migrations Safely

⚠️ **IMPORTANT: Never run `prisma migrate reset` on production!**

1. **Preview changes first:**
   ```bash
   npx prisma migrate diff --from-url $PRODUCTION_DATABASE_URL --to-schema-datamodel prisma/schema.prisma
   ```

2. **Apply migrations:**
   ```bash
   DATABASE_URL=$PRODUCTION_DIRECT_URL npx prisma migrate deploy
   ```

3. **Verify schema:**
   ```bash
   DATABASE_URL=$PRODUCTION_DIRECT_URL npx prisma db pull --print
   ```

### Verify Schema Compatibility

- [ ] Ensure `users.id` column is `TEXT` type (for Clerk user IDs)
- [ ] Ensure all `user_id` foreign keys are `TEXT` type
- [ ] Check that all required tables exist

---

## 3. Stripe Production Setup

### Switch to Live Mode

- [ ] Go to [Stripe Dashboard](https://dashboard.stripe.com)
- [ ] Toggle from **Test mode** to **Live mode** (top-right)
- [ ] Complete account verification if required

### Get Live Keys

- [ ] Go to **Developers** → **API keys**
- [ ] Copy the **Publishable key** (starts with `pk_live_...`)
- [ ] Copy the **Secret key** (starts with `sk_live_...`)

### Create Live Products/Prices

- [ ] Navigate to **Products** in live mode
- [ ] Create the same products as in test mode:
  - Pro Monthly ($29/month)
  - Pro Annual ($24/month billed annually)
  - Max Monthly ($99/month)
  - Max Annual ($79/month billed annually)
- [ ] Copy all price IDs (`price_...`)

### Configure Production Webhook

- [ ] Go to **Developers** → **Webhooks**
- [ ] Add endpoint: `https://trakzi.com/api/webhook/stripe`
- [ ] Select events:
  - `checkout.session.completed`
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.payment_failed`
- [ ] Copy the webhook signing secret (`whsec_...`)

---

## 4. Vercel Deployment

### Add Custom Domain

- [ ] Go to [Vercel Dashboard](https://vercel.com) → Your Project
- [ ] Navigate to **Settings** → **Domains**
- [ ] Add your custom domain
- [ ] Configure DNS records as instructed:
  ```
  A    @     76.76.21.21
  CNAME www  cname.vercel-dns.com
  ```
- [ ] Wait for SSL certificate provisioning

### Set Production Environment Variables

Navigate to **Settings** → **Environment Variables** and add:

```env
# App Configuration
NEXT_PUBLIC_APP_URL=https://trakzi.com
SITE_URL=https://trakzi.com
SITE_NAME=Trakzi

# Clerk Production Keys
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
CLERK_SECRET_KEY=sk_live_...
CLERK_AUTHORIZED_PARTIES=https://trakzi.com,https://www.trakzi.com

# Clerk URLs (keep as path-only)
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/
NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/home
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/home

# Neon Production Database
DATABASE_URL=postgresql://user:pass@ep-xxx-pooler.region.aws.neon.tech/neondb?sslmode=require
DIRECT_URL=postgresql://user:pass@ep-xxx.region.aws.neon.tech/neondb?sslmode=require

# Stripe Live Keys
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_ID_PRO_MONTHLY=price_...
STRIPE_PRICE_ID_PRO_ANNUAL=price_...
STRIPE_PRICE_ID_MAX_MONTHLY=price_...
STRIPE_PRICE_ID_MAX_ANNUAL=price_...

# Stripe Client-Side Keys
NEXT_PUBLIC_STRIPE_PRICE_ID_PRO_MONTHLY=price_...
NEXT_PUBLIC_STRIPE_PRICE_ID_PRO_ANNUAL=price_...
NEXT_PUBLIC_STRIPE_PRICE_ID_MAX_MONTHLY=price_...
NEXT_PUBLIC_STRIPE_PRICE_ID_MAX_ANNUAL=price_...

# AI Services
OPENROUTER_API_KEY=sk-or-...
```

**Important:**
- Set these for the **Production** environment only
- Keep test keys in Preview/Development environments
- Never expose secret keys in client-side code

### Redeploy

- [ ] Trigger a new deployment after setting environment variables
- [ ] Monitor build logs for any errors

---

## 5. Post-Deployment Verification

### Authentication Flow

- [ ] Visit `https://trakzi.com/sign-up` - should show Clerk sign-up form
- [ ] Create a test account with a real email
- [ ] Verify email confirmation works
- [ ] Sign in and confirm redirect to `/home`
- [ ] Sign out and verify redirect to landing page
- [ ] Test social login (Google, GitHub) if configured

### Database Connection

- [ ] Sign in and navigate to a page that loads data
- [ ] Verify no database connection errors in logs
- [ ] Check that new user was created in `users` table

### Stripe Integration

- [ ] Navigate to pricing section
- [ ] Click "Start Free Trial" on a plan
- [ ] Verify redirect to Stripe Checkout (live mode)
- [ ] Complete a test purchase with a real card
- [ ] Verify webhook received (check Stripe Dashboard → Webhooks → Recent Events)
- [ ] Verify subscription created in database

### AI Features

- [ ] Open the chat feature
- [ ] Send a test message
- [ ] Verify AI response works
- [ ] Check analytics insights generate properly

---

## 6. Monitoring & Alerts

### Set Up Monitoring

- [ ] Enable Vercel Analytics for performance monitoring
- [ ] Set up error tracking (Sentry, LogRocket, etc.)
- [ ] Configure uptime monitoring (BetterUptime, Pingdom, etc.)

### Configure Alerts

- [ ] Vercel deployment failure notifications
- [ ] Stripe payment failure alerts
- [ ] Database connection error alerts

---

## Rollback Plan

If issues occur in production:

1. **Immediate:** Revert to previous deployment in Vercel Dashboard
2. **Database:** Neon supports point-in-time recovery for branch restoration
3. **Auth:** Clerk maintains user sessions; switching back to test mode will break auth

---

## Security Checklist

- [ ] All secret keys are only in Vercel environment variables
- [ ] No secrets committed to git (check with `git log -p | grep -i secret`)
- [ ] `.env` and `.env.local` are in `.gitignore`
- [ ] HTTPS enforced on all endpoints
- [ ] Clerk `authorizedParties` configured for domain allowlist
- [ ] Stripe webhooks verify signatures
- [ ] Database connections use SSL (`sslmode=require`)

---

## Quick Reference: Production vs Development

| Service | Development | Production |
|---------|-------------|------------|
| Clerk Keys | `pk_test_...` / `sk_test_...` | `pk_live_...` / `sk_live_...` |
| Stripe Keys | `pk_test_...` / `sk_test_...` | `pk_live_...` / `sk_live_...` |
| Database | Dev branch / local | Production branch |
| Domain | `localhost:3000` | `trakzi.com` |
| Webhooks | Stripe CLI / ngrok | Production URL |
