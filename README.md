
## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

## Stripe Payment Integration

This app uses Stripe for subscription payments with secure webhooks.

### Setup Instructions

1. **Create Stripe Account** at [stripe.com](https://stripe.com)

2. **Create Products and Prices** in [Stripe Dashboard](https://dashboard.stripe.com/products):
   - Create "Pro" product with monthly ($29) and annual ($24/mo) prices
   - Create "Team" product with monthly ($99) and annual ($79/mo) prices

3. **Set Up Webhook Endpoint** in [Stripe Dashboard > Webhooks](https://dashboard.stripe.com/webhooks):
   - Endpoint URL: `https://your-domain.com/api/webhook/stripe`
   - Events to listen for:
     - `checkout.session.completed`
     - `customer.subscription.created`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `invoice.payment_failed`

4. **Configure Environment Variables** (copy from `.env.example`):
   ```env
   STRIPE_SECRET_KEY=sk_test_...
   STRIPE_WEBHOOK_SECRET=whsec_...
   STRIPE_PRICE_ID_PRO_MONTHLY=price_...
   STRIPE_PRICE_ID_PRO_ANNUAL=price_...
   STRIPE_PRICE_ID_TEAM_MONTHLY=price_...
   STRIPE_PRICE_ID_TEAM_ANNUAL=price_...
   NEXT_PUBLIC_STRIPE_PRICE_ID_PRO_MONTHLY=price_...
   NEXT_PUBLIC_STRIPE_PRICE_ID_PRO_ANNUAL=price_...
   NEXT_PUBLIC_STRIPE_PRICE_ID_TEAM_MONTHLY=price_...
   NEXT_PUBLIC_STRIPE_PRICE_ID_TEAM_ANNUAL=price_...
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   ```

5. **Run Database Migration**:
   ```bash
   npx prisma migrate dev --name add_subscriptions
   ```

### Local Testing with Stripe CLI

1. Install [Stripe CLI](https://stripe.com/docs/stripe-cli)
2. Login: `stripe login`
3. Forward webhooks: `stripe listen --forward-to localhost:3000/api/webhook/stripe`
4. Copy the webhook signing secret and set as `STRIPE_WEBHOOK_SECRET`

### Manual Test Checklist

- [ ] Visit landing page → Pricing section
- [ ] Click "Start Free Trial" on Pro plan
- [ ] Verify redirect to Stripe Checkout (use test card: `4242 4242 4242 4242`)
- [ ] Complete payment → Should redirect to success URL
- [ ] Check console for webhook processing logs
- [ ] Query `subscriptions` table in database - should have new row with plan "pro"
- [ ] Test Customer Portal: Call `/api/billing/portal` and navigate to Stripe Portal
- [ ] Cancel subscription in portal → Database should update to "canceled"