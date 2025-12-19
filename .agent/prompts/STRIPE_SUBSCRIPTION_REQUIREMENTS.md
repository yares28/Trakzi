# TRAKZI STRIPE SUBSCRIPTION REQUIREMENTS

## IMPORTANT PRODUCT RULES

- **No trial** - Remove any trial logic, UI text, and Stripe trial parameters.
- **Plans and Transaction Caps:**
  | Plan | Total Transaction Cap |
  |------|-----------------------|
  | `free` | 400 |
  | `pro` | 3,000 |
  | `max` | 15,000 |

- **"Transactions" cap counts BOTH tables:**
  ```sql
  used_total = (SELECT COUNT(*) FROM transactions WHERE user_id = $1) 
             + (SELECT COUNT(*) FROM receipt_transactions WHERE user_id = $1)
  ```

- **Downgrade excess handling:**
  - If user exceeds cap after downgrade, they must delete excess manually.
  - If they don't, the system **auto-deletes the OLDEST transactions** to fit the cap at downgrade effective time.
  - Show clear warnings before this happens.

---

## DATABASE (Source of Truth for Entitlements)

Use the existing schema in `database/schema.sql`, particularly the `subscriptions` table:

```sql
CREATE TABLE IF NOT EXISTS subscriptions (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id TEXT UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    plan TEXT DEFAULT 'free',                    -- free, pro, max
    status TEXT DEFAULT 'active',                -- active, canceled, past_due, trialing
    stripe_customer_id TEXT UNIQUE,
    stripe_subscription_id TEXT UNIQUE,
    stripe_price_id TEXT,
    current_period_end TIMESTAMPTZ,
    cancel_at_period_end BOOLEAN DEFAULT FALSE,
    is_lifetime BOOLEAN DEFAULT FALSE,          -- Lifetime subscriptions bypass Stripe operations
    pending_plan TEXT DEFAULT NULL,             -- Plan user will switch to at period end
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Key Tables for Transaction Counting:**
- `transactions` (bank transactions) - uses `tx_date` + `tx_time` for timestamp
- `receipt_transactions` (grocery items) - uses `receipt_date` + `receipt_time` for timestamp

---

## STRIPE STANDARD BEHAVIOR REQUIREMENTS

### 1) Subscribe Free → Pro/Max
- Use Stripe Checkout (subscription mode), **no trial**.
- Endpoint: `POST /api/checkout` with `{ priceId }`
- After checkout → redirect to `/home?checkout=success`

### 2) Cancel Pro/Max → Free at Period End
- Set `cancel_at_period_end = true` on Stripe subscription.
- Store `pending_plan = 'free'` in DB.
- User keeps access until `current_period_end`.

### 3) Upgrade Pro → Max
- **Effective immediately**, charge prorated difference NOW.
- Use Stripe subscription update with `proration_behavior: 'always_invoice'` (handle SCA).
- Do NOT grant Max until payment succeeds (gate on `invoice.paid` or use pending updates).
- Clear `pending_plan` if set.

### 4) Downgrade Max → Pro
- **Scheduled at period end** (no immediate credit/refund).
- Store `pending_plan = 'pro'` in DB.
- Check transaction cap at period end and auto-delete if over.

### 5) Downgrade Pro → Free
- Scheduled cancellation at period end.
- Store `pending_plan = 'free'` in DB.
- Warn about transaction cap and auto-delete oldest if over 400 at effective time.

### 6) Billing Interval Switch
- **Monthly → Yearly:** Immediate with proration (pay now).
- **Yearly → Monthly:** Scheduled at period end (pay later).

### 7) Reactive UX
- After returning from Stripe (Checkout or Portal), user must see updated plan **without page refresh**.
- Implement `/billing/return` route that calls `POST /api/stripe/sync-subscription` and then updates client state via SWR/React Query mutate.
- While Manage Subscription modal is open, **poll `/api/subscription/me` every 3-5 seconds** to reflect changes, then stop polling on close.

---

## WEBHOOKS

Already implemented in `app/api/webhook/stripe/route.ts`. Ensure these events are handled:

| Event | Action |
|-------|--------|
| `checkout.session.completed` | Create subscription record with Clerk userId from metadata |
| `customer.subscription.created` | Create/update subscription record |
| `customer.subscription.updated` | Update plan, status, period_end; handle downgrades with `pending_plan` |
| `customer.subscription.deleted` | Set plan = 'free', status = 'canceled' |
| `invoice.payment_failed` | Set status = 'past_due', sync to Clerk |
| `charge.refunded` | Cancel subscription, set plan = 'free' |

**Webhook Responsibilities:**
- Upsert `subscriptions` row for `user_id` (use Clerk user_id linkage via metadata).
- Map Stripe status to: `active`, `canceled`, `past_due`.
- Update `plan` based on `stripe_price_id` using `getPlanFromPriceId()` from `lib/stripe.ts`.
- Maintain `current_period_end` and `cancel_at_period_end`.
- **Clear `pending_plan` when change is applied** (at period end renewal).

---

## AUTO-DELETE OLDEST TRANSACTIONS ON DOWNGRADE

When plan becomes `free` or `pro` (after effective downgrade at period end):

1. **Compute `used_total`** across both tables:
   ```sql
   SELECT COUNT(*) FROM transactions WHERE user_id = $1
   UNION ALL
   SELECT COUNT(*) FROM receipt_transactions WHERE user_id = $1
   ```

2. **If `used_total > cap`, delete oldest** (timestamp ASC) across BOTH tables until `used_total == cap`.

**Oldest Definition:**
- `transactions`: `ts = tx_date + COALESCE(tx_time, '00:00:00'::time)`
- `receipt_transactions`: `ts = receipt_date + COALESCE(receipt_time, '00:00:00'::time)`

**Implementation:**
```sql
-- Get oldest rows to delete
WITH oldest_transactions AS (
    SELECT 'transactions' AS source_table, id, 
           (tx_date + COALESCE(tx_time, '00:00:00'::time)) AS ts
    FROM transactions WHERE user_id = $1
    UNION ALL
    SELECT 'receipt_transactions' AS source_table, id, 
           (receipt_date + COALESCE(receipt_time, '00:00:00'::time)) AS ts
    FROM receipt_transactions WHERE user_id = $1
)
SELECT source_table, id, ts 
FROM oldest_transactions 
ORDER BY ts ASC, id ASC 
LIMIT $2; -- to_delete count
```

- Delete in batches by `source_table`.

**UI Warning When Scheduling Downgrade:**
> "You currently have X transactions. The [Plan] plan allows Y. If you don't delete [X - Y] transactions before [billing_date], Trakzi will automatically delete your oldest transactions to fit the plan."

---

## MANAGE SUBSCRIPTION MODAL UX

Implement consistent popups in subscription management:

| Popup | When to Show |
|-------|--------------|
| **Confirm Change** | Shows "pay now vs later", effective date, proration breakdown |
| **Payment Required** | 3DS authentication or payment failed |
| **Scheduled Change** | Confirms change effective at period end |
| **Reactivate** | Show if `cancel_at_period_end = true` AND `now < current_period_end` |

The existing `components/subscription-dialog.tsx` and `components/dashboard/subscription-card.tsx` should be updated accordingly.

---

## ENDPOINTS TO IMPLEMENT/UPDATE

### Existing Endpoints
- `POST /api/checkout` - Create Stripe Checkout Session (for new subscriptions) ✅
- `POST /api/billing/portal` - Create Stripe Customer Portal session ✅
- `POST /api/webhook/stripe` - Verified webhook handler ✅

### New/Updated Endpoints

**1. GET `/api/subscription/me`**
```typescript
// Returns current subscription details with usage
{
  plan: 'free' | 'pro' | 'max',
  status: 'active' | 'canceled' | 'past_due',
  current_period_end: string | null,
  cancel_at_period_end: boolean,
  pending_plan: string | null,
  is_lifetime: boolean,
  cap: number,           // 400, 3000, or 15000
  used_total: number,    // transactions + receipt_transactions count
  remaining: number      // cap - used_total
}
```

**2. POST `/api/stripe/sync-subscription`**
- Called from `/billing/return` to update DB immediately after Stripe.
- Fetches subscription from Stripe using `stripe_subscription_id` and updates DB.

**3. GET `/billing/return`** (Page route, not API)
- Calls `POST /api/stripe/sync-subscription`
- Updates client state via SWR mutate
- Redirects to dashboard/settings

---

## PRICE ID MAPPING

Update `lib/stripe.ts` with clear mapping:

```typescript
// Price IDs from environment
export const STRIPE_PRICES = {
    PRO_MONTHLY: process.env.STRIPE_PRICE_ID_PRO_MONTHLY,
    PRO_ANNUAL: process.env.STRIPE_PRICE_ID_PRO_ANNUAL,
    MAX_MONTHLY: process.env.STRIPE_PRICE_ID_MAX_MONTHLY,
    MAX_ANNUAL: process.env.STRIPE_PRICE_ID_MAX_ANNUAL,
} as const;

// Mapping table
export const PRICE_ID_MAP: Record<string, { plan: 'pro' | 'max', interval: 'monthly' | 'annual' }> = {
    [STRIPE_PRICES.PRO_MONTHLY!]: { plan: 'pro', interval: 'monthly' },
    [STRIPE_PRICES.PRO_ANNUAL!]: { plan: 'pro', interval: 'annual' },
    [STRIPE_PRICES.MAX_MONTHLY!]: { plan: 'max', interval: 'monthly' },
    [STRIPE_PRICES.MAX_ANNUAL!]: { plan: 'max', interval: 'annual' },
};

// Get plan from price ID
export function getPlanFromPriceId(priceId: string): 'pro' | 'max' | 'free' {
    const mapping = PRICE_ID_MAP[priceId];
    return mapping?.plan ?? 'free';
}

// Get interval from price ID
export function getIntervalFromPriceId(priceId: string): 'monthly' | 'annual' | null {
    const mapping = PRICE_ID_MAP[priceId];
    return mapping?.interval ?? null;
}
```

---

## PLAN CAPS HELPER

Add to `lib/subscriptions.ts`:

```typescript
export const PLAN_CAPS: Record<PlanType, number> = {
    free: 400,
    pro: 3000,
    max: 15000,
};

export async function getUserUsageTotal(userId: string): Promise<number> {
    const result = await neonQuery<{ count: number }>(`
        SELECT (
            (SELECT COUNT(*)::int FROM transactions WHERE user_id = $1) +
            (SELECT COUNT(*)::int FROM receipt_transactions WHERE user_id = $1)
        ) AS count
    `, [userId]);
    return result[0]?.count ?? 0;
}

export async function getUserSubscriptionWithUsage(userId: string) {
    const subscription = await getUserSubscription(userId);
    const plan = subscription?.plan ?? 'free';
    const cap = PLAN_CAPS[plan];
    const usedTotal = await getUserUsageTotal(userId);
    
    return {
        ...subscription,
        plan,
        cap,
        usedTotal,
        remaining: Math.max(0, cap - usedTotal),
    };
}
```

---

## REFUNDS (Case-by-Case) Implementation

Already handled in webhook via `charge.refunded` event:
- Full refund → Cancel subscription immediately, set plan = 'free'
- Partial refund → No automatic action (log only)

**Admin-only endpoint (optional future work):**
- Add endpoint or script to issue refunds by PaymentIntent/Charge
- Use Stripe Refunds API (full or partial)
- Document in STRIPE_INTEGRATION.md how to locate invoice payment and create refund

---

## ACCEPTANCE CRITERIA

| Requirement | Status |
|-------------|--------|
| No trial anywhere (UI + backend) | ⬜ Implement |
| Subscribe/cancel/upgrade/downgrade/interval switch follow policy | ⬜ Implement |
| Reactive updates: plan changes appear without manual refresh | ⬜ Implement |
| Downgrade cap enforcement: warning shown | ⬜ Implement |
| Auto-deletes oldest at effective time if still over cap | ⬜ Implement |
| Webhooks keep DB consistent and idempotent | ✅ Exists |
| Tests: cap counting and auto-delete selection logic | ⬜ Implement |

---

## DELIVERABLES

1. **PR-style summary** (files changed and why)
2. **Migrations** (if adding indexes or helper views)
3. **Clear mapping table** of `stripe_price_id` → `plan` + `interval`

---

## FILES TO MODIFY

| File | Changes |
|------|---------|
| `lib/subscriptions.ts` | Add `PLAN_CAPS`, `getUserUsageTotal()`, `getUserSubscriptionWithUsage()` |
| `lib/stripe.ts` | Add `PRICE_ID_MAP`, `getIntervalFromPriceId()` |
| `app/api/subscription/me/route.ts` | New endpoint returning usage + cap info |
| `app/api/stripe/sync-subscription/route.ts` | New endpoint to sync from Stripe |
| `app/billing/return/page.tsx` | New page for post-Stripe redirect |
| `app/api/webhook/stripe/route.ts` | Add auto-delete logic on downgrade |
| `components/subscription-dialog.tsx` | Add downgrade warning, polling |
| `components/dashboard/subscription-card.tsx` | Show pending plan, usage bar |
| `components/pricing-section.tsx` | Remove trial language |
| `__tests__/subscriptions.test.ts` | Add cap counting and auto-delete tests |
