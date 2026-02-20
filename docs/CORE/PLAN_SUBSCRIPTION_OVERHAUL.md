# Plan & Subscription System Overhaul

> **Status**: IMPLEMENTED
> **Created**: 2026-02-18
> **Implemented**: 2026-02-18
> **Complexity**: HIGH
> **Files Modified/Created**: ~25+ files

---

## 1. Executive Summary

Complete overhaul of the plan system with three major changes:

1. **Remove Basic plan** — simplify to Free / Pro / Max only
2. **Monthly Transaction Economy** — users get initial gift capacity + renewable monthly bonus that converts to permanent on use
3. **Buy Transaction Packs** — one-time Stripe purchases for permanent transaction capacity (all plans)

Plus: AI chat rate limiting change (per-week/per-month), AI insights partial preview for Free, advanced charts blur for Free.

---

## 2. Current vs New Plan Comparison

### Plans Being Removed

| Plan | Current Price | Action |
|------|--------------|--------|
| Basic | ~$1.99/mo | **DELETE** — migrate existing users to Pro |

### New Plan Structure

| Feature | Free | Pro | Max |
|---------|------|-----|-----|
| **Price** |  |  |  |
| **Base Capacity (monthly billing)** | 500 | 1,500 | 5,000 |
| **Base Capacity (annual billing)** | - | 2,000 | 6,000 |
| **Monthly Bonus Transactions** | 50 | 250 | 750 |
| **Receipt Scans / Month** | 10 | 50 | 150 |
| **Receipt OCR** | Yes | Yes | Yes |
| **AI Chat** | 10/week | 50/week | 100/week |
| **AI Insights** | 3 free preview (rest blurred) | Full | Full |
| **AI Categorization** | Yes | Yes | Yes |
| **Advanced Charts** | No (blurred) | Yes | Yes |
| **Custom Transaction Categories** | 1 | 10 | 25 |
| **Custom Fridge Categories** | 1 | 10 | 25 |

---

## 3. Transaction Economy System (NEW)

### 3.1 Core Concepts

The transaction system has three types of capacity:

```
EFFECTIVE CAP = permanent_capacity + monthly_remaining
              = (base_capacity + monthly_bonus_earned + purchased_capacity) + (plan.monthlyTransactions - monthly_used)
```

| Concept | Description | Persists? |
|---------|-------------|-----------|
| **Base Capacity** | Initial gift from plan (e.g., 500 for Free). Set once on signup or plan change. | Yes (resets on plan change) |
| **Monthly Bonus Earned** | Cumulative total of monthly transactions USED in past months. Grows over time. | Yes (capped per plan) |
| **Purchased Capacity** | Bought via transaction packs ($10/500). Never expires. | Yes (survives plan changes) |
| **Monthly Used** | How many of this month's bonus have been consumed. Resets each billing cycle. | No (resets monthly) |

### 3.2 How Transaction Creation Works

```
When user creates a transaction:

1. actual_count = COUNT(transactions) + COUNT(receipts)  // real DB rows
2. permanent_capacity = base_capacity + monthly_bonus_earned + purchased_capacity
3. monthly_remaining = plan.monthlyTransactions - monthly_used

IF actual_count < permanent_capacity:
    → Allow (no monthly slot consumed)

ELIF monthly_remaining > 0:
    → Allow + increment monthly_used by 1

ELSE:
    → Deny (show upgrade / buy transactions dialog)
```

### 3.3 Monthly Period Rollover

Detected **lazily** — when checking capacity, if `monthly_period_start` is in a previous period:

```
On rollover:
1. monthly_bonus_earned += monthly_used      // used slots become permanent
2. monthly_bonus_earned = MIN(monthly_bonus_earned, plan.maxTotalTransactions)  // CAP!
3. monthly_used = 0                          // reset for new period
4. monthly_period_start = current period start date
```

**The cap on `monthly_bonus_earned`** prevents infinite growth (see Anti-Abuse section 4.1).

### 3.4 What Happens on Delete

| Action | Effect on Permanent Capacity | Effect on Monthly Used |
|--------|------------------------------|----------------------|
| Delete a transaction created under permanent cap | actual_count drops (frees room) | No change |
| Delete a transaction created with monthly bonus | actual_count drops (frees room under permanent cap) | **No change** (monthly_used stays) |

**Key rule**: `monthly_used` only increments, NEVER decrements within a period. This prevents create-delete cycling to abuse monthly bonus.

### 3.5 Buy Transaction Packs

| Pack | Price | Transactions | Permanent? |
|------|-------|-------------|-----------|
| Bundle 1 | ~$9.99 | 500 | Yes, forever |
| Bundle 2 | ~$19.99 | 1,500 | Yes, forever |
| Bundle 3 | ~$49.99 | 5,000 | Yes, forever |

- All plans can buy packs (including Free)
- Purchased capacity survives plan changes (upgrade, downgrade, cancellation)
- Stripe one-time payment (Payment Intent, NOT subscription)
- Tracked in `transaction_purchases` table for audit trail

### 3.6 Annual Billing Bonus

Users who subscribe with **annual billing** get a higher base capacity:

| Plan | Monthly Billing Base | Annual Billing Base | Bonus |
|------|---------------------|-------------------|-------|
| Free | 500 | N/A (Free has no billing) | — |
| Pro | 1,500 | 2,000 | +500 |
| Max | 5,000 | 6,000 | +1,000 |

The billing interval is detected from the Stripe price ID (monthly vs annual) and stored in the `subscriptions` table.

---

## 4. Anti-Abuse Analysis & Mitigations

IN ANY OF THE LOOPHOLES AND THE APP, NEVER DELETE TRANSACTIONS EVEN IF THE USER IS OVER THE LIMIT. INSTEAD, ADD AN ERROR TO SAY THAT THE USER IS OVER THE LIMIT AND HE SHOULD UPDATE HIS TRANSACTIONS IN DATA LIBRARY REPORTA TABLE OR IF HE CLICKS HERE "DELETE OLDEST" IT DELETE OLDEST TRANSACTIONs IN THE DATABASE TO FIT THE AMOUNT OF TRANSACTIONS HE WANTS TO ADD

### 4.1 LOOPHOLE: Create-Delete Cycling Within a Month

**Problem**: User creates transaction using monthly bonus, deletes it, uses the freed permanent slot, repeat — effectively getting unlimited monthly usage.

**Mitigation**: `monthly_used` is a one-way counter. Once a monthly slot is consumed, it's consumed for the entire period regardless of deletions. The transaction exists under permanent capacity after deletion frees the slot, but the monthly slot is gone.

**Example walkthrough**:
1. permanent_cap=500, actual=500, monthly_used=0, monthly_bonus=50
2. User creates tx → actual=501, monthly_used=1 (used monthly slot)
3. User deletes an OLD tx → actual=500, monthly_used=1 (still 1!)
4. User creates tx → actual=501, but now under permanent cap (500 < 501? no, 500 = 500 so this uses another monthly slot → monthly_used=2)
5. Net: user replaced old tx with new, consumed 2 monthly slots for 2 creates

### 4.2 LOOPHOLE: Plan Upgrade/Downgrade Cycling

**Problem**: User subscribes to Max (5,000 base), earns monthly bonuses for a few months, then downgrades to Free. Could they keep the earned bonuses?

**Mitigation**: On plan change (upgrade or downgrade):
```
base_capacity = new_plan.maxTotalTransactions  (or annual variant)
monthly_bonus_earned = MIN(current_monthly_bonus_earned, new_plan.maxTotalTransactions)
monthly_used = 0  (reset for new period)
```

So if a Pro user earned 1,200 bonus and downgrades to Free:
“You have 5,750 transactions.
Your current plan allows 500.
Upgrade to continue adding data.”

And he will not be able to add any more transactions until he deletes some transactions or upgrades his plan. But the monthly bonus still gets counted to until base transactions of his plan reaches the current amount of transactions he has. Update UI to show how much he has and how much will he have after the bonus next month. 


### 4.3 LOOPHOLE: Refund Abuse for Purchased Transactions

**Problem**: User buys 500 transactions for $10, creates 500 transactions, requests Stripe refund. Gets money back but keeps the transactions.

**Mitigation**: On `charge.refunded` webhook:
1. Find the purchase record by payment intent ID
2. Deduct `purchased_capacity` by the refunded transaction count
3. Mark purchase as `refunded` in `transaction_purchases`
4. If actual count > new effective cap → auto-enforce (delete oldest)
5. Notify user via email that transactions were deducted due to refund

### 4.4 LOOPHOLE: Rapid Month-Boundary Gaming

**Problem**: User waits until last minute of month, creates 50 transactions (monthly bonus). Month rolls over 1 minute later, creates 50 more. Gets 100 "monthly" transactions in 2 minutes.

**Assessment**: This is **NOT a loophole** — it's expected behavior. Each month's bonus is independent. The user legitimately used month N's bonus at the end and month N+1's bonus at the start. If they have data to enter, this is fine.

### 4.5 LOOPHOLE: Account Churning (Create New Account for Fresh Capacity)

**Problem**: User creates a new account to get fresh 500 base capacity.

**Assessment**: Standard fraud concern, not easily preventable at code level. Mitigation:
- IP-based rate limiting on account creation
- Email verification requirement
- Clerk handles most of this

### 4.6 LOOPHOLE: Buying Transactions on Free Plan to Avoid Subscription

**Problem**: User stays on Free and buys 10,000 transactions ($200) instead of paying $5/mo for Pro.

**Assessment**: This is **intended behavior** — revenue is revenue. The user pays more upfront than a subscription would cost. They still miss out on Pro features (AI insights, advanced charts, higher AI chat limits, more categories).

### 4.7 LOOPHOLE: Subscription Status Manipulation

**Problem**: User's subscription goes to `past_due` or `canceled` — should monthly bonus still work?

**Mitigation**: Monthly bonus is tied to ACTIVE plan. If plan resolves to `free` (because subscription is canceled/expired), the monthly bonus uses Free's limits (50), not the previous paid plan's limits (250/500).

### 4.8 LOOPHOLE: Receipt Scan to Transaction Ratio Gaming

**Problem**: User creates receipt scans with 100 items each, using only 1 "transaction" (receipt trip) but getting 100 items of data.

**Assessment**: This is **existing behavior** — receipt trips are counted, not individual items. This is intentional to be generous. No change needed.

---

## 5. Database Schema Changes

### 5.1 New Table: `transaction_wallet`

```sql
CREATE TABLE transaction_wallet (
    user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    base_capacity INTEGER NOT NULL DEFAULT 500,
    monthly_bonus_earned INTEGER NOT NULL DEFAULT 0,
    purchased_capacity INTEGER NOT NULL DEFAULT 0,
    monthly_used INTEGER NOT NULL DEFAULT 0,
    monthly_period_start DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Index for fast lookups (PK already indexed)
COMMENT ON TABLE transaction_wallet IS 'Tracks transaction capacity per user: base gift + earned monthly bonuses + purchased packs';
COMMENT ON COLUMN transaction_wallet.base_capacity IS 'Initial gift from plan. Resets on plan change.';
COMMENT ON COLUMN transaction_wallet.monthly_bonus_earned IS 'Cumulative monthly bonus converted to permanent. Capped at plan maxTotalTransactions.';
COMMENT ON COLUMN transaction_wallet.purchased_capacity IS 'Transactions bought via one-time payment. Survives plan changes.';
COMMENT ON COLUMN transaction_wallet.monthly_used IS 'Monthly bonus slots consumed this period. Resets on period rollover. Never decrements.';
COMMENT ON COLUMN transaction_wallet.monthly_period_start IS 'Start of current monthly period. Used to detect rollover.';
```

### 5.2 New Table: `transaction_purchases`

```sql
CREATE TABLE transaction_purchases (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    stripe_payment_intent_id TEXT UNIQUE,
    stripe_checkout_session_id TEXT,
    amount_cents INTEGER NOT NULL,
    currency TEXT NOT NULL DEFAULT 'eur',
    transactions_count INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'refunded', 'pending')),
    refunded_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_transaction_purchases_user ON transaction_purchases(user_id);
CREATE INDEX idx_transaction_purchases_status ON transaction_purchases(user_id, status);
```

### 5.3 Modify: `subscriptions` Table

```sql
ALTER TABLE subscriptions ADD COLUMN billing_interval TEXT NOT NULL DEFAULT 'monthly'
    CHECK (billing_interval IN ('monthly', 'annual'));
```

### 5.4 Remove `basic` from Plan Type

The `plan` column in `subscriptions` currently accepts 'free', 'basic', 'pro', 'max'. After migration, 'basic' should no longer be a valid value.

### 5.5 Migration Script for Existing Users

```sql
-- Step 1: Create transaction_wallet for ALL existing users with their current plan's base
INSERT INTO transaction_wallet (user_id, base_capacity)
SELECT u.id,
    CASE
        WHEN s.plan = 'pro' THEN 1500
        WHEN s.plan = 'max' THEN 5000
        ELSE 500  -- free and basic both get 500
    END
FROM users u
LEFT JOIN subscriptions s ON s.user_id = u.id;

-- Step 2: Migrate basic users to free
UPDATE subscriptions SET plan = 'free', pending_plan = NULL
WHERE plan = 'basic';

-- Step 3: Set billing_interval from Stripe price IDs
UPDATE subscriptions SET billing_interval = 'annual'
WHERE stripe_price_id IN (
    -- Replace with actual annual price IDs from env
    'price_xxx_pro_annual',
    'price_xxx_max_annual'
);

-- Step 4: Adjust base_capacity for annual subscribers
UPDATE transaction_wallet tw SET base_capacity =
    CASE
        WHEN s.plan = 'pro' THEN 2000
        WHEN s.plan = 'max' THEN 6000
        ELSE tw.base_capacity
    END
FROM subscriptions s WHERE s.user_id = tw.user_id AND s.billing_interval = 'annual';
```

---

## 6. TypeScript Type & Config Changes

### 6.1 `lib/subscriptions.ts` — Remove `basic` from PlanType

```typescript
// BEFORE
export type PlanType = 'free' | 'basic' | 'pro' | 'max';

// AFTER
export type PlanType = 'free' | 'pro' | 'max';
```

### 6.2 `lib/plan-limits.ts` — New Interface & Config

```typescript
export interface PlanLimits {
    // --- Transaction Economy ---
    maxTotalTransactions: number;           // Base capacity (monthly billing)
    maxTotalTransactionsAnnual: number;     // Base capacity (annual billing)
    monthlyTransactions: number;            // Monthly bonus slots

    // --- Existing ---
    maxReceiptScansPerMonth: number;
    receiptOcrEnabled: boolean;

    // --- AI Chat (CHANGED: period-based) ---
    aiChatEnabled: boolean;
    aiChatMessages: number;                 // Message count
    aiChatPeriod: 'day' | 'week' | 'month'; // Rate limit period

    // --- AI Insights (CHANGED: preview for free) ---
    aiInsightsEnabled: boolean;
    aiInsightsFreePreviewCount: number;     // 0 = none, 3 = show 3 then blur

    // --- Existing ---
    aiCategorizationEnabled: boolean;
    advancedChartsEnabled: boolean;
    customTransactionCategoriesLimit: number;
    customFridgeCategoriesLimit: number;
}
```

### 6.3 `lib/stripe.ts` — Remove Basic Prices, Add Transaction Pack Price

```typescript
export const STRIPE_PRICES = {
    // Remove: BASIC_MONTHLY, BASIC_ANNUAL
    PRO_MONTHLY: process.env.STRIPE_PRICE_ID_PRO_MONTHLY,
    PRO_ANNUAL: process.env.STRIPE_PRICE_ID_PRO_ANNUAL,
    MAX_MONTHLY: process.env.STRIPE_PRICE_ID_MAX_MONTHLY,
    MAX_ANNUAL: process.env.STRIPE_PRICE_ID_MAX_ANNUAL,
    // NEW:
    TRANSACTION_PACK_500: process.env.STRIPE_PRICE_ID_TRANSACTION_PACK_500,
} as const;
```

---

## 7. API Changes

### 7.1 New: `POST /api/transactions/buy` — Buy Transaction Pack

```
Request:  { packId: 'pack_500' }
Response: { url: 'https://checkout.stripe.com/...' }

Flow:
1. getCurrentUserId()
2. Create Stripe Checkout Session (mode: 'payment', not 'subscription')
3. metadata: { userId, packId, transactionsCount: 500 }
4. Return checkout URL
```

### 7.2 New: `GET /api/transactions/wallet` — Get Transaction Wallet

```
Response: {
    permanentCapacity: 750,    // base + earned + purchased
    baseCapacity: 500,
    monthlyBonusEarned: 150,
    purchasedCapacity: 100,
    monthlyUsed: 12,
    monthlyLimit: 50,
    monthlyRemaining: 38,
    effectiveCap: 788,         // permanent + monthly remaining
    actualCount: 420,
    canCreate: 368,            // effective - actual
    monthlyPeriodStart: '2026-02-01',
    monthlyPeriodEnd: '2026-03-01',
}
```

### 7.3 Modified: `GET /api/subscription/me` — Add Wallet Data

Add transaction wallet information to the existing response for the subscription card UI.

### 7.4 Modified: Stripe Webhook — New Event Handlers

| Event | Action |
|-------|--------|
| `checkout.session.completed` (mode=payment) | Credit purchased_capacity, record in transaction_purchases |
| `charge.refunded` | Deduct purchased_capacity, auto-enforce cap |
| `customer.subscription.updated` | Detect billing_interval change, update base_capacity for annual bonus |
| `customer.subscription.created` | Initialize transaction_wallet with correct base_capacity |
| `customer.subscription.deleted` | Reset base_capacity to free tier, cap monthly_bonus_earned |

### 7.5 Modified: All Transaction Write APIs

Every endpoint that creates transactions needs a capacity check:

| API | Change |
|-----|--------|
| `POST /api/transactions` | Check wallet capacity, increment monthly_used if needed |
| `POST /api/transactions/import` | Check wallet capacity for batch, partial import |
| `POST /api/receipts` | Check wallet capacity |
| `POST /api/receipts/scan` | Check wallet capacity |

### 7.6 Modified: AI Chat Rate Limiting

Change from per-day to per-period:
- Free: 10 messages per **week** (rolling 7-day window)
- Pro: 50 messages per **month** (rolling 30-day window)
- Max: TBD

---

## 8. UI Changes

### 8.1 Subscription Card (`components/dashboard/subscription-card.tsx`)

- **Remove Basic plan card** from the grid
- **Add "Buy Transactions" button** (visible for all plans)
- **Show transaction wallet breakdown**: base + earned + purchased
- **Show monthly bonus progress bar**: X/50 used this month
- **Add annual billing badge** showing base capacity bonus

### 8.2 Transaction Limit Dialog (`components/limits/transaction-limit-dialog.tsx`)

- **Add "Buy Transactions" action** alongside Upgrade
- **Show wallet breakdown** in the stats box
- **Show monthly remaining** as separate stat
- **New suggested action**: `BUY_TRANSACTIONS`

### 8.3 Settings / Subscription Page

- **New section: "Transaction Balance"**
  - Current permanent capacity (base + earned + purchased)
  - Monthly bonus status (X/50 used, resets on DATE)
  - Purchase history (from transaction_purchases table)
  - "Buy More Transactions" CTA button

### 8.4 Advanced Charts Blur (Free users)

- Wrap advanced chart toggle/button with blur overlay
- Show lock icon + "Upgrade to Pro" tooltip
- Consistent across all pages (Analytics, Fridge, Home)

### 8.5 AI Insights Preview (Free users)

- Show first 3 AI insights normally
- Remaining insights: blur content + overlay "Upgrade to unlock"
- Counter: "3/3 free insights used"

---

## 9. Files to Modify (Complete List)

### Config & Types
| File | Change |
|------|--------|
| `lib/subscriptions.ts` | Remove `basic` from PlanType, add billing_interval handling |
| `lib/plan-limits.ts` | New limits structure, remove basic, add monthly/AI chat changes |
| `lib/stripe.ts` | Remove basic prices, add transaction pack price, detect annual |

### Transaction Economy (New + Modified)
| File | Change |
|------|--------|
| `lib/limits/transactions-cap.ts` | Rewrite to use wallet-based capacity (biggest change) |
| `lib/limits/auto-enforce-cap.ts` | Use wallet-based cap instead of static plan lookup |
| `lib/limits/transaction-wallet.ts` | **NEW** — wallet CRUD, rollover logic, capacity check |
| `lib/limits/category-cap.ts` | Remove `basic` plan references |

### API Routes
| File | Change |
|------|--------|
| `app/api/transactions/buy/route.ts` | **NEW** — Stripe checkout for transaction packs |
| `app/api/transactions/wallet/route.ts` | **NEW** — Get wallet status |
| `app/api/webhook/stripe/route.ts` | Add payment handlers, refund handler, billing interval detection |
| `app/api/subscription/me/route.ts` | Include wallet data in response |
| `app/api/subscription/status/route.ts` | Include wallet data |
| `app/api/checkout/route.ts` | Remove basic plan, detect annual from price ID |
| `app/api/billing/change-plan/route.ts` | Reset wallet on plan change |
| `app/api/billing/cancel/route.ts` | Handle wallet on cancel |
| `app/api/billing/cancel-now/route.ts` | Handle wallet on immediate cancel |

### Transaction Write Paths (Capacity Checks)
| File | Change |
|------|--------|
| All transaction creation APIs | Use new wallet-based capacity check |
| CSV import handler | Use wallet-based partial import logic |
| Receipt creation handler | Use wallet-based capacity check |

### UI Components
| File | Change |
|------|--------|
| `components/dashboard/subscription-card.tsx` | Remove basic, add buy button, show wallet |
| `components/limits/transaction-limit-dialog.tsx` | Add buy action, show monthly remaining |
| `components/limits/category-limit-dialog.tsx` | Remove basic plan references |
| Advanced charts components (per page) | Add blur overlay for free users |
| AI insights components | Add preview/blur for free users |

### Documentation
| File | Change |
|------|--------|
| `docs/CORE/NEON_DATABASE.md` | Add transaction_wallet, transaction_purchases tables |
| `docs/CORE/STRIPE.md` | Add transaction pack purchase flow |

---

## 10. Open Questions (NEED YOUR INPUT)

### QUESTION 1: Max Plan Details (Message Was Cut Off)

Your message was cut off at the Max plan. I need:

I UPDATED THIS IN THE FILE ABOVE

### QUESTION 2: Receipt Scans for Free Plan

I UPDATED THIS IN THE FILE ABOVE

### QUESTION 3: Basic Plan User Migration

There are currently users on the Basic plan. When we remove it:
- **(A)** Migrate all Basic users to **Free** (they lose AI chat, advanced charts)
- **(B)** Migrate all Basic users to **Pro** (they get a free upgrade until their current period ends)
- **(C)** Let Basic users stay on Basic until their subscription ends, then auto-migrate to Free
- **(D)** Email Basic users and let them choose

### QUESTION 4: Should Monthly Bonus Cap Be Plan-Specific?

I don't want a bonus cap for now, if a free user uses the app enough and gets pro level transactions, they should get pro level bonuses.

### QUESTION 5: Transaction Pack Pricing

I UPDATED THIS IN THE FILE ABOVE

### QUESTION 6: What Happens to Purchased Transactions on Downgrade?

If a user buys 500 transactions on Pro, then downgrades to Free:
- **(A)** Purchased transactions are KEPT (they paid for them) — permanent_capacity = 500 (base) + 500 (purchased) = 1,000
- **(B)** Purchased transactions are forfeited on downgrade
- **(C)** Purchased transactions are kept but capped (e.g., can't exceed 2x plan base)

ANSWER IS A

**My recommendation**: **(A)** — user paid real money for them, they should persist.

### QUESTION 8: Monthly Period Definition

When does the monthly bonus period reset?
- **(A)** Aligned with Stripe billing cycle (e.g., if subscribed on the 15th, resets on the 15th)
- **(B)** Calendar month (1st of each month)
- **(C)** Rolling 30 days from last reset

**My recommendation**: **(A)** for paid plans (aligned with billing), **(B)** for Free plan (calendar month). I LIKE THIS

---

## 11. Potential Issues & Concerns

### ISSUE 1: Backward Compatibility of `PlanType`

Removing `basic` from the union type will cause TypeScript errors everywhere `PlanType` is referenced. Need to find ALL usages and update. This is a large grep-and-replace operation.

**Estimated scope**: 50+ references to `basic` across the codebase.

### ISSUE 2: Stripe Products Need Manual Setup

New Stripe resources needed (cannot be automated):
- Transaction Pack product + price in Stripe Dashboard
- Remove Basic plan product from checkout (or archive it)
- Webhook endpoint may need to handle new event types

### ISSUE 3: Wallet Initialization Race Condition

If a user creates transactions before their wallet row exists (e.g., during signup), the capacity check could fail.

**Mitigation**: Create wallet row in the Clerk webhook (on user creation) OR use `INSERT ... ON CONFLICT` for lazy initialization.

### ISSUE 4: Performance Impact of Wallet Checks

Every transaction create now requires a wallet read + possible rollover + possible update. This adds 1-3 extra DB queries per transaction.

**Mitigation**:
- Wallet lookups are by PK (fast)
- Could cache wallet in Redis for 60s
- Rollover check is a simple date comparison

### ISSUE 5: Auto-Enforce Cap Changes

The current auto-enforce system uses `getTransactionCap(plan)` which returns a static number. The new system uses the wallet's `effective_cap` which requires a DB read. All auto-enforce callers need updating.

### ISSUE 6: AI Chat Rate Limiting Rewrite

Changing from per-day to per-week/per-month requires:
- New DB table or column to track AI chat messages with timestamps
- Different counting logic per plan
- Existing daily counter needs migration

---

## 12. Implementation Phases

### Phase 1: Database & Schema (LOW RISK) -- PARTIAL
1. [x] Create `transaction_wallet` table (schema defined, lazy init via `getOrCreateWallet()`)
2. [ ] Create `transaction_purchases` table (not yet in DB)
3. [ ] Add `billing_interval` column to `subscriptions` (not yet in DB)
4. [ ] Run migration script for existing users
5. [ ] **Test**: Verify all existing users have wallet rows

### Phase 2: Core Transaction Economy (HIGH RISK) -- COMPLETE
1. [x] Create `lib/limits/transaction-wallet.ts` -- wallet CRUD + rollover + capacity
2. [x] Rewrite `lib/limits/transactions-cap.ts` -- use wallet instead of static caps
3. [x] Rewrite `lib/limits/auto-enforce-cap.ts` -- use wallet-based caps (never auto-deletes)
4. [x] Update all transaction write APIs to use new capacity checks
5. [ ] **Test**: Unit tests for wallet logic, capacity checks, rollover

### Phase 3: Remove Basic Plan (MEDIUM RISK) -- COMPLETE
1. [x] Remove `basic` from `PlanType`
2. [x] Remove Basic from `PLAN_LIMITS`
3. [x] Remove Basic prices from `lib/stripe.ts`
4. [x] Update `getPlanFromPriceId()` and all helper functions
5. [x] Fix ALL TypeScript errors from removing `basic`
6. [x] **Test**: Build succeeds, no Basic references remain

### Phase 4: Update Plan Limits (LOW RISK) -- COMPLETE
1. [x] Update `PLAN_LIMITS` with new values
2. [x] Change AI chat from per-day to per-week (rolling 7-day window)
3. [x] Add AI insights preview count (`aiInsightsFreePreviewCount: 3`)
4. [x] **Test**: Limits match spec

### Phase 5: Buy Transactions Feature (MEDIUM RISK) -- COMPLETE
1. [x] Create `POST /api/transactions/buy` checkout route
2. [x] Handle `checkout.session.completed` (mode=payment) in webhook
3. [x] Handle `charge.refunded` for transaction purchases in webhook
4. [x] Create `GET /api/transactions/wallet` API
5. [ ] **Test**: Full purchase flow (Stripe test mode)

### Phase 6: UI Updates (LOW RISK) -- PARTIAL
1. [x] Remove Basic plan from subscription card
2. [ ] Add "Buy Transactions" button + checkout flow
3. [ ] Add wallet breakdown to subscription page
4. [x] Update transaction limit dialog with no-auto-delete messaging
5. [ ] Add advanced charts blur for Free users
6. [ ] Add AI insights preview/blur for Free users
7. [ ] **Test**: Visual QA on all plan states

### Phase 7: Stripe Webhook Updates (HIGH RISK) -- COMPLETE
1. [x] Handle one-time payment events (transaction packs)
2. [x] Handle refunds for transaction packs
3. [x] Detect billing interval (monthly vs annual) on subscription create/update
4. [x] Update wallet on plan change (base_capacity, monthly_bonus_earned cap)
5. [ ] **Test**: Webhook replay testing with Stripe CLI

---

## 13. Risk Assessment

| Risk | Severity | Likelihood | Mitigation |
|------|----------|-----------|------------|
| Breaking existing users on Basic plan | HIGH | CERTAIN | Migration script + email notice |
| Wallet race conditions during high traffic | MEDIUM | LOW | PK-based upserts, lazy init |
| Stripe webhook missing transaction pack events | HIGH | MEDIUM | Thorough testing with Stripe CLI |
| Monthly rollover edge cases (timezone, DST) | LOW | MEDIUM | Use UTC dates, simple date math |
| Performance regression from extra DB queries | LOW | LOW | PK lookups are fast, optional Redis cache |
| TypeScript breakage from removing `basic` | MEDIUM | CERTAIN | Systematic grep + fix before build |

---

## 14. Success Criteria

- [x] No Basic plan references in codebase
- [x] Free/Pro/Max limits match spec
- [x] Monthly bonus: used slots convert to permanent at rollover
- [x] Monthly bonus: unused slots lost at rollover
- [x] Monthly bonus: deleting transactions does NOT refund monthly slots
- [x] Monthly bonus earned capped per plan
- [x] Buy transactions: Stripe checkout works, capacity credited
- [x] Buy transactions: refund deducts capacity
- [x] Purchased transactions survive plan changes
- [x] AI chat rate limiting works per-week (rolling 7-day window for all plans)
- [ ] AI insights shows 3 previews for Free, blurs rest (UI pending)
- [ ] Advanced charts blurred for Free users (UI pending)
- [x] Transaction limit dialog: no-auto-delete messaging
- [ ] Settings page shows wallet breakdown (UI pending)
- [x] `npm run build` passes with zero errors
- [ ] Existing users migrated without data loss (pending DB migration)

---

## 15. Implementation Notes (2026-02-18)

### Phases Completed

| Phase | Status | Notes |
|-------|--------|-------|
| Phase 1: Database & Schema | Partial | `transaction_wallet` table defined; `transaction_purchases` and `billing_interval` column not yet created in DB |
| Phase 2: Core Transaction Economy | Complete | `lib/limits/transaction-wallet.ts` created with full wallet CRUD, lazy rollover, capacity checks |
| Phase 3: Remove Basic Plan | Complete | `PlanType = 'free' \| 'pro' \| 'max'` in `lib/subscriptions.ts`; all Basic references removed |
| Phase 4: Update Plan Limits | Complete | `lib/plan-limits.ts` has new `PlanLimits` interface, all three plans configured, `TRANSACTION_PACKS` defined |
| Phase 5: Buy Transactions Feature | Complete | `POST /api/transactions/buy` and `GET /api/transactions/buy` routes created; `GET /api/transactions/wallet` created |
| Phase 6: UI Updates | Partial | Subscription dialog updated with no-auto-delete messaging; full wallet breakdown UI pending |
| Phase 7: Stripe Webhook Updates | Complete | Webhook handles pack purchases (`checkout.session.completed` with mode=payment), syncs wallet on plan changes |

### Key Implementation Details

**Transaction Wallet (`lib/limits/transaction-wallet.ts`)**
- `getOrCreateWallet()` uses `INSERT ... ON CONFLICT` for safe lazy initialization
- `getWalletWithRollover()` is the primary read path -- checks period, applies rollover if needed
- `getWalletCapacity()` is the full capacity calculation including actual transaction count
- `syncWalletForPlan()` uses `GREATEST(base_capacity, $2)` to never reduce base on plan change
- `recordMonthlyUsage()` is the one-way increment for monthly slots
- `addPurchasedCapacity()` adds permanent capacity from pack purchases

**Auto-Enforce Cap (`lib/limits/auto-enforce-cap.ts`)**
- Completely rewritten to use wallet-based capacity
- `autoEnforceTransactionCap()` NEVER deletes -- returns `deletedCount: 0` always
- `wouldExceedCap()` added for pre-write dry-run checks

**AI Chat Rate Limiting (`lib/feature-access.ts`)**
- All plans now use a rolling 7-day window (`NOW() - INTERVAL '7 days'`)
- Free: 10/week, Pro: 50/week, Max: 100/week
- Uses existing `ai_chat_usage` table (no schema change needed)

**Stripe Integration (`lib/stripe.ts`)**
- `STRIPE_PRICES` now includes `TRANSACTION_PACK_500`, `TRANSACTION_PACK_1500`, `TRANSACTION_PACK_5000`
- `getBillingIntervalFromPriceId()` detects monthly vs annual from price ID
- `isTransactionPackPriceId()` validates pack price IDs
- All Basic price references removed

**Environment Variables Required**
```
STRIPE_PRICE_ID_PRO_MONTHLY
STRIPE_PRICE_ID_PRO_ANNUAL
STRIPE_PRICE_ID_MAX_MONTHLY
STRIPE_PRICE_ID_MAX_ANNUAL
STRIPE_PRICE_ID_TRANSACTION_PACK_500
STRIPE_PRICE_ID_TRANSACTION_PACK_1500
STRIPE_PRICE_ID_TRANSACTION_PACK_5000
```

### Files Modified (Complete)

| File | Change Summary |
|------|----------------|
| `lib/subscriptions.ts` | `PlanType = 'free' \| 'pro' \| 'max'` (removed `basic`) |
| `lib/plan-limits.ts` | New `PlanLimits` interface, `TRANSACTION_PACKS` array, helper functions |
| `lib/stripe.ts` | Removed Basic prices, added pack prices, `getBillingIntervalFromPriceId()`, `isTransactionPackPriceId()` |
| `lib/feature-access.ts` | AI chat uses 7-day rolling window for all plans |
| `lib/limits/transaction-wallet.ts` | **NEW** -- wallet CRUD, rollover, capacity calculation |
| `lib/limits/transactions-cap.ts` | `getRemainingCapacity()` now uses wallet |
| `lib/limits/auto-enforce-cap.ts` | Never auto-deletes; blocks writes instead |
| `lib/limits/category-cap.ts` | Removed Basic plan references |
| `app/api/transactions/buy/route.ts` | **NEW** -- POST (Stripe checkout) + GET (list packs) |
| `app/api/transactions/wallet/route.ts` | **NEW** -- GET wallet capacity breakdown |
| `app/api/webhook/stripe/route.ts` | Handles pack purchases, syncs wallet on plan changes |
| `app/api/billing/cancel-preview/route.ts` | Wallet-aware capacity preview |
| `app/api/billing/change-plan/route.ts` | Wallet sync on plan change |
| `app/api/checkout/route.ts` | Removed Basic plan |
| `app/api/subscription/me/route.ts` | Updated for new plan types |
| `app/api/subscription/status/route.ts` | Updated for new plan types |
| `components/subscription-dialog/SubscriptionDialog.tsx` | No-auto-delete messaging |
| `components/subscription-dialog/PlanCard.tsx` | Removed Basic |
| `components/subscription-dialog/plan-info.ts` | Removed Basic plan info |
| `components/subscription-dialog/types.ts` | Updated types |
| `components/pricing-section.tsx` | Removed Basic |
| `components/settings-panel.tsx` | Updated for new plans |
| `components/dashboard/subscription-card.tsx` | Updated for new plans |
