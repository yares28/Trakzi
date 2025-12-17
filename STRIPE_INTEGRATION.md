# Stripe Integration Documentation

This document contains all the information about the Stripe payment integration for Trakzi.

## Overview

Trakzi uses Stripe for subscription-based payments with:
- **PRO Plan** - Premium features for individuals
- **MAX Plan** - All features including team collaboration

## Architecture

### Files Created

| File | Purpose |
|------|---------|
| `lib/stripe.ts` | Stripe SDK initialization with lazy loading |
| `lib/subscriptions.ts` | Subscription entitlement service (CRUD for subscriptions) |
| `app/api/checkout/route.ts` | Checkout session creation + subscription status check |
| `app/api/webhook/stripe/route.ts` | Webhook handler with signature verification |
| `app/api/billing/portal/route.ts` | Customer portal session creation |
| `components/pricing-section.tsx` | Pricing UI with checkout integration |

### Database Schema

The `subscriptions` table in Neon (PostgreSQL):

```prisma
model Subscription {
  id                    String    @id @default(cuid())
  userId                String    @unique
  plan                  String    @default("free")  // free, pro, max
  status                String    @default("active") // active, canceled, past_due, trialing
  stripeCustomerId      String?   @unique
  stripeSubscriptionId  String?   @unique
  stripePriceId         String?
  currentPeriodEnd      DateTime?
  cancelAtPeriodEnd     Boolean   @default(false)
  createdAt             DateTime  @default(now())
  updatedAt             DateTime  @updatedAt
  
  user                  User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@map("subscriptions")
}
```

---

## Stripe Dashboard Configuration

### Products & Prices

Create these products in [Stripe Dashboard > Products](https://dashboard.stripe.com/products):

| Product | Price Type | Monthly | Annual |
|---------|------------|---------|--------|
| PRO | Recurring | $X/month | $X/year |
| MAX | Recurring | $X/month | $X/year |

**Note:** Update the actual prices in the `pricing-section.tsx` file to match what you set in Stripe.

### Webhook Endpoint

**URL:** `https://trakzi.com/api/webhook/stripe`

**Events to listen for:**
1. `checkout.session.completed` — Customer completes checkout
2. `customer.subscription.created` — New subscription created
3. `customer.subscription.updated` — Subscription changes (upgrade/downgrade/renewal)
4. `customer.subscription.deleted` — Subscription canceled
5. `invoice.payment_failed` — Payment failed

**Signing Secret:** Copy from Stripe Dashboard after creating the endpoint and add to `.env`:
```
STRIPE_WEBHOOK_SECRET=whsec_your_secret_here
```

---

## Environment Variables

### Required Variables

```env
# Stripe API Keys
STRIPE_SECRET_KEY=sk_live_... (or sk_test_... for testing)
STRIPE_WEBHOOK_SECRET=whsec_...

# Price IDs (from Stripe Dashboard > Products > Price ID)
STRIPE_PRICE_ID_PRO_MONTHLY=price_...
STRIPE_PRICE_ID_PRO_ANNUAL=price_...
STRIPE_PRICE_ID_MAX_MONTHLY=price_...
STRIPE_PRICE_ID_MAX_ANNUAL=price_...

# Client-side Price IDs (same values, but exposed to frontend)
NEXT_PUBLIC_STRIPE_PRICE_ID_PRO_MONTHLY=price_...
NEXT_PUBLIC_STRIPE_PRICE_ID_PRO_ANNUAL=price_...
NEXT_PUBLIC_STRIPE_PRICE_ID_MAX_MONTHLY=price_...
NEXT_PUBLIC_STRIPE_PRICE_ID_MAX_ANNUAL=price_...

# App URL for redirects
NEXT_PUBLIC_APP_URL=https://trakzi.com
```

### Vercel Environment Variables

All the above variables must be set in Vercel Project Settings > Environment Variables.

**⚠️ CRITICAL:** After adding or updating any `NEXT_PUBLIC_*` environment variables, you **MUST redeploy** your application. These variables are baked into the build at build time, not read at runtime.

---

## API Endpoints

### POST /api/checkout

Creates a Stripe Checkout Session.

**Request:**
```json
{
  "priceId": "price_xxx"
}
```

**Response:**
```json
{
  "url": "https://checkout.stripe.com/..."
}
```

### GET /api/checkout

Returns current user's subscription status.

**Response:**
```json
{
  "subscription": {
    "plan": "pro",
    "status": "active",
    "currentPeriodEnd": "2025-01-17T00:00:00Z",
    "cancelAtPeriodEnd": false
  }
}
```

### POST /api/billing/portal

Creates a Stripe Customer Portal session for subscription management.

**Response:**
```json
{
  "url": "https://billing.stripe.com/..."
}
```

### POST /api/webhook/stripe

Receives webhook events from Stripe. Verifies signature and updates database.

---

## Flow Diagrams

### Checkout Flow

```
User clicks "Start Free Trial"
    ↓
Frontend calls POST /api/checkout with priceId
    ↓
Backend creates Stripe Checkout Session with userId in metadata
    ↓
User redirects to Stripe Checkout
    ↓
User completes payment
    ↓
Stripe sends checkout.session.completed webhook
    ↓
Backend creates subscription record in database
    ↓
User redirects to success URL (/home?checkout=success)
```

### Subscription Update Flow

```
User upgrades/downgrades in Stripe Portal
    ↓
Stripe sends customer.subscription.updated webhook
    ↓
Backend finds user by stripeCustomerId
    ↓
Backend updates subscription record in database
```

### Cancellation Flow

```
User cancels in Stripe Portal
    ↓
Stripe sends customer.subscription.deleted webhook
    ↓
Backend updates subscription to plan: "free", status: "canceled"
```

---

## Entitlement Checking

### Server-Side (API Routes)

```typescript
import { hasProPlan, getUserPlan, requirePro } from '@/lib/subscriptions';

// Check if user has pro/max plan
const hasPro = await hasProPlan(userId);

// Get current plan
const plan = await getUserPlan(userId); // 'free' | 'pro' | 'max'

// Require pro or throw error
await requirePro(userId); // throws if not pro/max
```

### Gating Logic

```typescript
// In an API route
export async function GET(request: NextRequest) {
  const { userId } = await auth();
  
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  const hasPro = await hasProPlan(userId);
  
  if (!hasPro) {
    return NextResponse.json({ error: 'Upgrade to Pro required' }, { status: 403 });
  }
  
  // ... pro-only logic
}
```

---

## Testing

### Local Testing with Stripe CLI

1. Install Stripe CLI: https://stripe.com/docs/stripe-cli
2. Login: `stripe login`
3. Forward webhooks: `stripe listen --forward-to localhost:3000/api/webhook/stripe`
4. Copy the webhook signing secret and use it for local testing

### Test Cards

| Card Number | Result |
|-------------|--------|
| 4242 4242 4242 4242 | Success |
| 4000 0000 0000 0002 | Declined |
| 4000 0000 0000 3220 | Requires 3D Secure |

### Manual Test Checklist

- [ ] Visit landing page → Pricing section
- [ ] Click "Start Free Trial" on PRO plan
- [ ] Verify redirect to Stripe Checkout
- [ ] Complete payment with test card 4242 4242 4242 4242
- [ ] Verify redirect to success URL
- [ ] Check database for subscription record
- [ ] Test Customer Portal via /api/billing/portal
- [ ] Cancel subscription in portal
- [ ] Verify database updates to "canceled"

---

## Troubleshooting

### Webhook Not Receiving Events

1. Check webhook endpoint URL is correct in Stripe Dashboard
2. Verify `STRIPE_WEBHOOK_SECRET` is set correctly
3. Check Stripe Dashboard > Webhooks > your endpoint > Logs for errors

### Checkout Session Fails

1. Verify `STRIPE_SECRET_KEY` is set
2. Check price IDs are valid and match your Stripe products
3. Check browser console for errors

### Subscription Not Updating

1. Check webhook logs in Stripe Dashboard
2. Verify `userId` is being passed in checkout session metadata
3. Check database for existing subscription record

---

## Migration Notes

### Previous: Polar.sh (Never Implemented)

The app previously had Polar SDK packages installed but never actually integrated:
- `@polar-sh/nextjs` - REMOVED
- `@polar-sh/sdk` - REMOVED
- `app/api/webhook/polar/` - DELETED (was empty)

### Current: Stripe

Complete implementation with:
- Stripe SDK (`stripe` package)
- Checkout Sessions for payment
- Webhooks for subscription lifecycle
- Customer Portal for self-service management
- Database-backed entitlements

---

## Frontend Integration

### 1. Trigger Checkout from Any Button

```tsx
// In any component
"use client"

import { useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'

export function UpgradeButton() {
  const [loading, setLoading] = useState(false)
  const { isSignedIn } = useAuth()
  const router = useRouter()

  const handleUpgrade = async () => {
    if (!isSignedIn) {
      router.push('/sign-up')
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_PRO_MONTHLY,
        }),
      })

      const data = await response.json()
      if (data.url) {
        window.location.href = data.url
      }
    } catch (error) {
      console.error('Checkout error:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <button onClick={handleUpgrade} disabled={loading}>
      {loading ? 'Loading...' : 'Upgrade to Pro'}
    </button>
  )
}
```

### 2. Show Current Subscription Status

```tsx
// In a settings or profile component
"use client"

import { useEffect, useState } from 'react'

interface Subscription {
  plan: 'free' | 'pro' | 'max'
  status: 'active' | 'canceled' | 'past_due' | 'trialing'
  currentPeriodEnd: string | null
  cancelAtPeriodEnd: boolean
}

export function SubscriptionStatus() {
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/checkout')
      .then(res => res.json())
      .then(data => {
        setSubscription(data.subscription)
        setLoading(false)
      })
  }, [])

  if (loading) return <div>Loading...</div>

  if (!subscription || subscription.plan === 'free') {
    return (
      <div>
        <p>You're on the Free plan</p>
        <UpgradeButton />
      </div>
    )
  }

  return (
    <div>
      <p>Plan: {subscription.plan.toUpperCase()}</p>
      <p>Status: {subscription.status}</p>
      {subscription.currentPeriodEnd && (
        <p>Renews: {new Date(subscription.currentPeriodEnd).toLocaleDateString()}</p>
      )}
      {subscription.cancelAtPeriodEnd && (
        <p className="text-yellow-500">Cancels at period end</p>
      )}
      <ManageSubscriptionButton />
    </div>
  )
}
```

### 3. Manage Subscription Button (Opens Stripe Portal)

```tsx
"use client"

import { useState } from 'react'

export function ManageSubscriptionButton() {
  const [loading, setLoading] = useState(false)

  const handleManage = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/billing/portal', {
        method: 'POST',
      })
      const data = await response.json()
      if (data.url) {
        window.location.href = data.url
      }
    } catch (error) {
      console.error('Portal error:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <button onClick={handleManage} disabled={loading}>
      {loading ? 'Loading...' : 'Manage Subscription'}
    </button>
  )
}
```

### 4. Gate UI Features Based on Plan

```tsx
"use client"

import { useEffect, useState } from 'react'

export function ProFeature({ children }: { children: React.ReactNode }) {
  const [hasPro, setHasPro] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/checkout')
      .then(res => res.json())
      .then(data => {
        const plan = data.subscription?.plan
        setHasPro(plan === 'pro' || plan === 'max')
        setLoading(false)
      })
  }, [])

  if (loading) return null

  if (!hasPro) {
    return (
      <div className="opacity-50 pointer-events-none relative">
        {children}
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <span className="text-white">Pro Feature - Upgrade to Access</span>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
```

---

## Backend Integration

### 1. Protect API Routes (Require Pro Plan)

```typescript
// app/api/pro-feature/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { hasProPlan } from '@/lib/subscriptions'

export async function GET(request: NextRequest) {
  const { userId } = await auth()

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Check if user has pro/max plan
  const hasPro = await hasProPlan(userId)

  if (!hasPro) {
    return NextResponse.json(
      { error: 'This feature requires a Pro subscription' },
      { status: 403 }
    )
  }

  // User has pro - proceed with the feature
  return NextResponse.json({ message: 'Pro feature data here' })
}
```

### 2. Get User's Current Plan

```typescript
// app/api/some-route/route.ts
import { auth } from '@clerk/nextjs/server'
import { getUserPlan } from '@/lib/subscriptions'

export async function GET() {
  const { userId } = await auth()

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const plan = await getUserPlan(userId) // 'free' | 'pro' | 'max'

  // Different behavior based on plan
  if (plan === 'free') {
    // Limited response for free users
    return NextResponse.json({ data: limitedData, limit: 5 })
  }

  if (plan === 'pro') {
    // More features for pro
    return NextResponse.json({ data: proData, limit: 100 })
  }

  // Max plan - everything
  return NextResponse.json({ data: allData, limit: Infinity })
}
```

### 3. Check Subscription Details

```typescript
// app/api/subscription/route.ts
import { auth } from '@clerk/nextjs/server'
import { getUserSubscription } from '@/lib/subscriptions'

export async function GET() {
  const { userId } = await auth()

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const subscription = await getUserSubscription(userId)

  if (!subscription) {
    return NextResponse.json({
      plan: 'free',
      status: null,
      features: ['basic_analytics', 'limited_imports']
    })
  }

  // Check if subscription is still valid
  const isActive = ['active', 'trialing'].includes(subscription.status)

  // Check if within grace period (canceled but not expired)
  const inGracePeriod = subscription.status === 'canceled' &&
    subscription.currentPeriodEnd &&
    new Date(subscription.currentPeriodEnd) > new Date()

  return NextResponse.json({
    plan: isActive || inGracePeriod ? subscription.plan : 'free',
    status: subscription.status,
    currentPeriodEnd: subscription.currentPeriodEnd,
    cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
    features: getFeatures(subscription.plan)
  })
}

function getFeatures(plan: string) {
  const features = {
    free: ['basic_analytics', 'limited_imports'],
    pro: ['advanced_analytics', 'unlimited_imports', 'ai_insights', 'csv_export'],
    max: ['everything_in_pro', 'team_collab', 'api_access', 'priority_support']
  }
  return features[plan as keyof typeof features] || features.free
}
```

### 4. Middleware for Plan-Based Access (Optional)

```typescript
// middleware.ts - add to existing middleware
import { clerkMiddleware } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

// Note: For plan-based middleware, you'd need to fetch subscription
// This is generally better done at the API route level for performance

export default clerkMiddleware(async (auth, req) => {
  // ... existing auth logic

  // For pro-only pages, redirect to upgrade page
  const proOnlyPaths = ['/advanced-analytics', '/team']

  if (proOnlyPaths.some(path => req.nextUrl.pathname.startsWith(path))) {
    // You'd need to check subscription here
    // But it's better to do this at the page/API level
  }

  return NextResponse.next()
})
```

### 5. Server Component with Plan Check

```tsx
// app/pro-feature/page.tsx
import { auth } from '@clerk/nextjs/server'
import { hasProPlan, getUserPlan } from '@/lib/subscriptions'
import { redirect } from 'next/navigation'

export default async function ProFeaturePage() {
  const { userId } = await auth()

  if (!userId) {
    redirect('/sign-in')
  }

  const hasPro = await hasProPlan(userId)

  if (!hasPro) {
    redirect('/pricing?upgrade=required')
  }

  const plan = await getUserPlan(userId)

  return (
    <div>
      <h1>Pro Feature</h1>
      <p>Your plan: {plan}</p>
      {/* Pro-only content */}
    </div>
  )
}
```

---

## Security Considerations

1. **Webhook Signature Verification** - All webhook events are verified using `stripe.webhooks.constructEvent()`
2. **Server-Side Entitlements** - Plan checks happen server-side, never trust client state
3. **Metadata** - User ID is stored in checkout session metadata, not exposed to client
4. **Environment Variables** - All secrets stored in env vars, never committed

---

## Updating Prices in UI

To update the displayed prices in the pricing section, edit `components/pricing-section.tsx`:

```typescript
const pricingPlans = [
  // ...
  {
    name: "PRO",
    monthlyPrice: 4.99,   // € per month
    annualPrice: 49.99,   // € per year
    ctaMonthly: "Start Free Trial",  // Button text for monthly (has free trial)
    ctaAnnual: "Subscribe Now",      // Button text for annual (no free trial)
    // ...
  },
  {
    name: "MAX",
    monthlyPrice: 19.99,   // € per month
    annualPrice: 199.99,   // € per year
    ctaMonthly: "Start Free Trial",
    ctaAnnual: "Go MAX",
    // ...
  },
]
```

**Important:** These prices are display-only. The actual charge is determined by the Stripe Price IDs in your environment variables.

