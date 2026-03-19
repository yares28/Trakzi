# Room Transaction Sharing — Implementation Plan
**Date:** 2026-03-19
**Updated:** Deep-dive review — corrected column names, query bugs, and missing edge cases
**Status:** Awaiting confirmation
**Branch:** `feat/room-transaction-sharing`

---

## Problem Statement

Users want to share personal transactions with roommates in a room, with the shared amount
correctly reflected in their personal analytics (e.g., a €100 grocery receipt shared 50/50
should show as €50 effective cost, not €100).

There is also a gap in the reverse direction: expenses added manually in a room (quick-add)
don't appear in the payer's personal transaction list, creating an analytics blind spot.

---

## Core Design Decisions

### 1. One transaction → one room share (max)
A personal transaction can only be shared in one room. If already shared, the API returns
409 with the room name. No UNIQUE constraint at DB level — enforced at the API layer so the
error message is human-readable.

**Rationale:** Sharing the same receipt across two rooms creates unreviewable reimbursement
math (you could get back more than you paid). One clear home per expense.

### 2. Effective cost = accrual model
Effective cost = your split amount, immediately upon sharing. Does not wait for settlement.

```
Personal tx: €100
Split 50/50 → your share: €50
Analytics show: €50 (effective cost)
```

**Rationale:** Accrual answers "what did this cost me to consume." Cash basis (full amount
until settled) makes spending charts spike and dip in misleading ways. Outstanding
reimbursements are tracked separately as room balances.

### 3. Original transactions are never modified
Sharing a transaction copies `total_amount` and `description` into `shared_transactions` at
that moment. The personal transaction record is untouched. If the original amount changes
later, the share does NOT update automatically — the user must delete and recreate the share.

### 4. Two distinct flows, handled differently
| Flow | Trigger | Outcome |
|------|---------|---------|
| **Pay → split later** | Share from personal tx list | `shared_transactions` created linked via `original_tx_id`; personal tx shows "Shared" badge and effective cost |
| **Group expense → record now** | Manual add in room | Room-only by default; payer sees optional "Also add to personal transactions" toggle (OFF by default) |

The toggle is OFF by default to prevent duplicate entries for users who also import bank CSVs.

### 5. Shared records are immutable snapshots
Once a shared transaction is created, its `total_amount` and splits are frozen. Editing the
original personal transaction shows a warning: "This transaction is shared in [Room Name].
Changes won't affect the existing split."

---

## Important Codebase Facts (Verified Against Source)

> These are corrections to common assumptions. The plan below uses the correct names.

| Fact | Detail |
|------|--------|
| Transaction date column | `tx_date` (NOT `date`) |
| Transaction amount convention | Negative for expenses (`amount < 0`), positive for income |
| Category link | `category_id` FK → `categories` table; `c.name` for display |
| Transaction ID type | Integer (`id` is an integer in `transactions`) |
| `shared_transactions.original_tx_id` | Stored as integer (matches `transactions.id`) |
| Settlement transactions | NEW personal transactions with `tx_type` — do NOT have an `original_tx_id` pointing back to a shared_transaction |
| Item-level splits bug | SAME bug as top-level splits at route.ts:155 (not just :123) |
| Split amounts | Always positive in `transaction_splits.amount` |
| Effective cost sign | Must negate split amount to match expense sign convention |

---

## Bug Fixes (Phase 0 — do first)

### Bug 1: Auto-settle uses wrong user ID (top-level splits)

**File:** `app/api/rooms/[roomId]/transactions/route.ts:123-124`

```typescript
// CURRENT (wrong) — settles the API caller's split, not the payer's
status: split.user_id === userId ? "settled" : "pending",
settled_at: split.user_id === userId ? new Date().toISOString() : null,

// CORRECT — settle the actual payer's split
status: split.user_id === paidByUserId ? "settled" : "pending",
settled_at: split.user_id === paidByUserId ? new Date().toISOString() : null,
```

### Bug 2: Auto-settle uses wrong user ID (item-level splits)

**File:** `app/api/rooms/[roomId]/transactions/route.ts:154-155`

Same pattern, same fix needed for per-item splits:
```typescript
// CURRENT (wrong)
status: split.user_id === userId ? "settled" : "pending",
settled_at: split.user_id === userId ? new Date().toISOString() : null,

// CORRECT
status: split.user_id === paidByUserId ? "settled" : "pending",
settled_at: split.user_id === paidByUserId ? new Date().toISOString() : null,
```

**Impact:** If roommate paid and you add the expense on their behalf (`paid_by = roommate`),
your split incorrectly auto-settles. Both top-level and item-level splits are affected.
All balance calculations downstream are wrong until this is fixed.

---

## Phases

### Phase 0 — Fix auto-settle bugs
**Files:** `app/api/rooms/[roomId]/transactions/route.ts`
**Changes:**
1. Line ~123: Replace `userId` with `paidByUserId` in top-level split settle (2 lines)
2. Line ~154: Replace `userId` with `paidByUserId` in item-level split settle (2 lines)
3. Also invalidate user analytics cache after creation (currently only invalidates room cache):
   ```typescript
   await invalidateRoomCache(roomId)
   await invalidateUserCachePrefix(paidByUserId, 'analytics')
   await invalidateUserCachePrefix(paidByUserId, 'home')
   ```
**Complexity:** Trivial

---

### Phase 1 — "Share to Room" flow from personal transactions

**Entry point:** Personal transaction list and transaction detail view.

#### 1a. API: New endpoint `POST /api/transactions/[txId]/share`

This is a new endpoint (not a modification to the room route) — it takes a personal
transaction and links it to a room as a shared transaction.

```typescript
// POST /api/transactions/[txId]/share
const body = z.object({
  room_id: z.string().min(1),
  split_type: z.enum(['equal', 'percentage', 'custom']).default('equal'),
  splits: z.array(SplitInputSchema).default([]),
  transaction_date: z.string().optional(), // defaults to original tx date
})

// 1. Verify ownership: the transaction must belong to the caller
const tx = await neonQuery(
  `SELECT id, amount, description, category_id, tx_date FROM transactions
   WHERE id = $1 AND user_id = $2`,
  [txId, userId]
)
if (!tx.length) return 404

// 2. Verify room membership
const isMember = await verifyRoomMember(roomId, userId)
if (!isMember) return 404

// 3. Check for existing share (enforce one-share constraint)
const existing = await neonQuery(
  `SELECT st.id, r.name AS room_name
   FROM shared_transactions st
   JOIN rooms r ON r.id = st.room_id
   WHERE st.original_tx_id = $1`,
  [txId]
)
if (existing.length > 0) {
  return 409 with: `Already shared in "${existing[0].room_name}". Remove it there first.`
}

// 4. Create the shared transaction (amount is negative in transactions, positive in shared)
await neonInsert('shared_transactions', {
  room_id: roomId,
  uploaded_by: userId,          // the caller is always the payer when sharing personal tx
  original_tx_id: txId,
  total_amount: Math.abs(tx[0].amount),  // store as positive
  description: tx[0].description,
  category: categoryName,       // resolve from category_id JOIN
  transaction_date: data.transaction_date ?? tx[0].tx_date,
  split_type: data.split_type,
  ...
})

// 5. Create splits (same validateSplits logic as existing route)
// 6. Invalidate both room cache AND user analytics cache
await invalidateRoomCache(roomId)
await invalidateUserCachePrefix(userId, 'analytics')
await invalidateUserCachePrefix(userId, 'home')
```

#### 1b. UI: "Share in Room" button on transactions
Add to each transaction row/detail a `[Share in Room]` button.

Opens a 3-step sheet:
1. **Pick room** — dropdown of rooms the user belongs to
2. **Configure split** — Equal / % / Custom, per-member amounts, live preview
3. **Confirm** — shows "You'll pay: €50 · [Name] owes you: €50"

Reuses existing `validateSplits()` from `lib/rooms/split-validation.ts` — no new logic.

#### 1c. UI: Transaction picker in room (reverse direction)
In room detail → Expenses tab → "Add Expense" button → "From my transactions" tab.

Shows a searchable list of personal transactions **filtered to**:
- Unshared only — use NOT EXISTS subquery:
  ```sql
  WHERE NOT EXISTS (
    SELECT 1 FROM shared_transactions st
    WHERE st.original_tx_id = t.id
  )
  ```
- Expenses only (`t.amount < 0`)
- Matching room currency or convertible
- Paginated with search by description

Selecting one calls `POST /api/transactions/[txId]/share` with the room pre-filled.

---

### Phase 2 — Personal transaction "Shared" indicator

**Files:**
- `app/api/transactions/route.ts` (GET endpoint)
- Personal transaction list component
- Transaction detail component

#### 2a. Extend GET /api/transactions to include share info

Add a LEFT JOIN to detect linked shares. Note: `original_tx_id` in `shared_transactions`
is an integer that matches `transactions.id` (integer) — no casting needed.

```sql
SELECT
  t.id,
  t.tx_date,
  t.description,
  t.amount,
  t.category_id,
  c.name AS category_name,
  st.id           AS shared_tx_id,
  -ts.amount      AS effective_cost,   -- negate: split is positive, expense convention is negative
  r.name          AS shared_room_name
FROM transactions t
LEFT JOIN categories c ON c.id = t.category_id
LEFT JOIN shared_transactions st ON st.original_tx_id = t.id
LEFT JOIN transaction_splits ts
  ON ts.shared_tx_id = st.id AND ts.user_id = $1
LEFT JOIN rooms r ON r.id = st.room_id
WHERE t.user_id = $1
ORDER BY t.tx_date DESC
```

> **Sign note:** `ts.amount` is positive (€50). The personal transaction `t.amount` is
> negative (−€100 for an expense). `effective_cost` is returned as −€50 to maintain
> consistency with the amount sign convention in the rest of the app.

This adds three optional fields to every transaction response:
- `shared_tx_id` — null if not shared
- `effective_cost` — your split amount in expense sign convention (null if not shared → fallback to `t.amount`)
- `shared_room_name` — for display

#### 2b. UI: Badge + effective cost display

In the transaction row:
```
Groceries          [Shared · Kitchen Room]
€100.00 → €50.00 effective
```

In the transaction detail:
- Show full "Shared with [Names] in [Room]" breakdown
- Show each person's split amount
- Show settlement status

#### 2c. Warning on edit if shared

In the transaction edit form, if `shared_tx_id` is present:
> "This transaction is shared in Kitchen Room. Editing the amount won't update the existing split — you'd need to delete and recreate the share."

---

### Phase 3 — Manual room add: "Also track in personal transactions" toggle

**File:** The manual "Add Expense" modal in the room detail page.

When the user is adding an expense manually AND they are the payer:

```
[x] Also add to my personal transactions
    (Turn on if you won't import this from your bank)
```

**Default: OFF.**

If toggled ON and confirmed, do this in a transaction:
1. Create a personal `transactions` record for the payer:
   ```typescript
   await neonInsert('transactions', {
     user_id: paidByUserId,
     amount: -data.total_amount,   // MUST be negative (expense convention)
     description: data.description,
     category_id: resolvedCategoryId,  // resolve from category name or null
     tx_date: data.transaction_date,
   })
   // get the new transaction's id
   ```
2. Create the `shared_transactions` record with `original_tx_id = newTxId`
3. Create splits as normal

This ensures the "Shared" badge appears automatically on the personal transaction
(because `original_tx_id` is set).

If user later imports from bank and gets a duplicate:
- The transaction list shows both
- They can delete the manually-created one (since `shared_transactions.original_tx_id` has
  `ON DELETE SET NULL`, the room expense survives the deletion)

**Edge case: non-payer toggle**
The toggle only appears when the current user IS the payer. If `paid_by` is set to a
different member, the toggle is hidden (we can't create a personal transaction for another user).

---

### Phase 4 — Analytics "effective cost" in bundle

**Files:**
- `lib/charts/aggregations.ts`
- `lib/charts/home-trends-savings-aggregations.ts`
- `lib/charts/fridge-aggregations.ts`

#### 4a. Core query pattern

The analytics currently use `t.amount < 0` for expenses. When a transaction is shared,
the effective cost = split amount (positive) → must be negated to match sign convention.

```sql
-- Correct effective cost substitution for expense queries
SELECT
  COALESCE(c.name, 'Uncategorized') AS category,
  ABS(SUM(
    CASE
      WHEN st.id IS NOT NULL AND ts.amount IS NOT NULL
        THEN -ts.amount      -- split amount is positive; negate to match expense sign
      ELSE t.amount          -- original negative amount
    END
  )) AS effective_total,
  COUNT(*) AS count
FROM transactions t
LEFT JOIN categories c ON c.id = t.category_id
LEFT JOIN shared_transactions st ON st.original_tx_id = t.id
LEFT JOIN transaction_splits ts
  ON ts.shared_tx_id = st.id AND ts.user_id = $1
WHERE t.user_id = $1
  AND t.amount < 0                     -- expenses only (same as current)
  AND t.tx_date >= $2::date            -- use tx_date, NOT date
  AND t.tx_date <= $3::date
GROUP BY c.name, c.color
ORDER BY effective_total DESC
```

The `ABS()` wrapper still produces positive totals for chart display — same as current
behavior, just with split substitution.

#### 4b. KPIs effective cost

For `getKPIs`, the `totalExpense` KPI also needs substitution:

```sql
SELECT
  SUM(CASE WHEN t.amount > 0 THEN t.amount ELSE 0 END) AS total_income,
  ABS(SUM(
    CASE
      WHEN t.amount < 0 AND st.id IS NOT NULL AND ts.amount IS NOT NULL
        THEN -ts.amount
      WHEN t.amount < 0
        THEN t.amount
      ELSE 0
    END
  )) AS total_expense,
  ...
FROM transactions t
LEFT JOIN shared_transactions st ON st.original_tx_id = t.id
LEFT JOIN transaction_splits ts
  ON ts.shared_tx_id = st.id AND ts.user_id = $1
WHERE t.user_id = $1
```

#### 4c. Toggle in analytics UI
Add a `showEffectiveCosts` boolean to the analytics filter state.

- **ON (default):** Uses the effective cost query above
- **OFF:** Uses raw `t.amount` for all transactions

Toggle label: "Show effective costs (adjusts shared expenses to your split)"

Persisted in `localStorage` per user, so preference survives page refresh.

**Implementation note:** Rather than maintaining two query variants, add a `useEffectiveCost`
boolean parameter to each aggregation function. When false, omit the LEFT JOINs (they have
a performance cost even if no shared transactions exist).

#### 4d. Bundle API addition
The `AnalyticsSummary` type gets:
```typescript
sharedExpenseSummary: {
  effective_cost_mode: boolean   // whether the returned data uses effective costs
  total_fronted: number          // sum you paid that others owe you
  total_pending_owed: number     // your pending splits (you owe others)
}
```

Cache invalidation: after any split creation/settlement, invalidate `analytics` and `home`
cache for ALL members of the room (since their effective costs changed too, if they have
linked personal transactions).

---

### Phase 5 — Settlement reconciliation

This solves the "paying twice" problem: when someone settles a room debt via bank transfer,
the same €50 event exists in both the app (split status) and the bank CSV (outgoing transfer).

#### The two roles

| Role | Event | Problem without reconciliation |
|------|-------|-------------------------------|
| **Non-payer** (you owe €50) | Sends €50 bank transfer | Import shows generic "Transfer €50" — no category, no room link |
| **Payer** (owed €50) | Receives €50 bank transfer | Import shows €50 income — inflates income analytics incorrectly |

#### 5a. Schema changes

```sql
-- On transactions table:
ALTER TABLE transactions
  ADD COLUMN tx_type text NOT NULL DEFAULT 'expense'
  CHECK (tx_type IN ('expense', 'income', 'settlement_sent', 'settlement_received', 'transfer'));

ALTER TABLE transactions
  ADD COLUMN pending_import_match boolean NOT NULL DEFAULT false;

-- Link settlement transactions back to what they're settling:
ALTER TABLE transactions
  ADD COLUMN settlement_for_split_id text REFERENCES transaction_splits(id) ON DELETE SET NULL;
```

> **Why `settlement_for_split_id`?**
> Settlement transactions are NEW personal transactions — they don't have `original_tx_id`
> pointing to a `shared_transaction`. To support CSV matching logic, we need a direct link
> from the settlement transaction to the split it settled. This allows the import query to
> find the room name and description without a broken JOIN chain.

#### 5b. Settle Up modal — "How did you pay?"

When a non-payer taps [Settle Up] in the room:

```
How are you paying?
  ○ Bank / digital transfer
    → We'll suggest linking it when this appears in your imports
  ○ Cash
    → Record this as a personal expense now
```

**Cash path:**
Creates a personal transaction immediately:
```typescript
await neonInsert('transactions', {
  user_id: userId,
  amount: -splitAmount,          // negative: money going out
  description: `Settlement: ${roomName} — ${sharedTxDescription}`,
  tx_date: today,
  tx_type: 'settlement_sent',
  settlement_for_split_id: splitId,
  pending_import_match: false,
})
// Mark split as settled
await neonQuery(
  `UPDATE transaction_splits SET status='settled', settled_at=NOW() WHERE id=$1`,
  [splitId]
)
```

**Bank path:**
Creates a personal transaction in `pending_link` state:
```typescript
await neonInsert('transactions', {
  user_id: userId,
  amount: -splitAmount,
  description: `Settlement: ${roomName} — ${sharedTxDescription}`,
  tx_date: today,
  tx_type: 'settlement_sent',
  settlement_for_split_id: splitId,
  pending_import_match: true,    // flag for CSV matching
})
// Still mark split as settled — debt resolved regardless of bank import
await neonQuery(
  `UPDATE transaction_splits SET status='settled', settled_at=NOW() WHERE id=$1`,
  [splitId]
)
```

**Payer receiving path:**
When the payer marks a split as received:
```typescript
await neonInsert('transactions', {
  user_id: payerUserId,
  amount: splitAmount,           // positive: money coming in
  description: `Received: ${roomName} — ${sharedTxDescription} from ${payerName}`,
  tx_date: today,
  tx_type: 'settlement_received',
  pending_import_match: true,
})
```

#### 5c. CSV import smart matching

During the import flow, after parsing but before confirmation, for each imported transaction
check against pending settlement links:

```typescript
// Find pending settlements matching this import's amount
const pendingSettlements = await neonQuery(
  `SELECT
     t.id,
     t.amount,
     t.tx_type,
     t.description,
     ts.id AS split_id,
     st.description AS room_tx_description,
     r.name AS room_name
   FROM transactions t
   JOIN transaction_splits ts ON ts.id = t.settlement_for_split_id
   JOIN shared_transactions st ON st.id = ts.shared_tx_id
   JOIN rooms r ON r.id = st.room_id
   WHERE t.user_id = $1
     AND t.pending_import_match = true
     AND ABS(ABS(t.amount) - $2) < 0.01`,   -- amount match (both are absolute)
  [userId, Math.abs(importedAmount)]
)
```

If a match is found, show inline suggestion:

```
┌─────────────────────────────────────────────────────┐
│ Transfer · €50.00                                    │
│ ⚡ Looks like your settlement for Kitchen Room       │
│    (Groceries split with Alex)                       │
│ [Link it — exclude from analytics] [Keep separate]  │
└─────────────────────────────────────────────────────┘
```

**Linking:** Delete the pending settlement transaction (or merge its ID into the imported
transaction), mark `pending_import_match = false`, and set `tx_type = 'settlement_sent'`
on the imported row. No duplicate in the list.

**Not linking:** Imports as a normal transaction, user categorizes manually.

#### 5d. Analytics treatment

| `tx_type` | Spending analytics | Income analytics |
|-----------|-------------------|-----------------|
| `expense` | ✅ Included | ❌ Excluded |
| `income` | ❌ Excluded | ✅ Included |
| `settlement_sent` | ❌ Excluded (debt repayment, not spending) | ❌ Excluded |
| `settlement_received` | ❌ Excluded | ❌ Excluded (reimbursement, not income) |
| `transfer` | ❌ Excluded | ❌ Excluded |

**Implementation:** All analytics queries that currently use `amount < 0` for expenses must
also add `AND (t.tx_type IS NULL OR t.tx_type = 'expense')`. The `IS NULL` handles legacy
transactions created before the column was added.

---

### Phase 6 — Generalized transfer tagging

The `tx_type` column added in Phase 5 solves room settlements specifically, but the same
data corruption happens whenever money moves between accounts without a purchase.

| Real-world event | Imported as | What it should be |
|-----------------|-------------|-------------------|
| Pay credit card bill | €500 expense | `transfer` (neutral) |
| Move money to savings | €200 expense | `transfer` (neutral) |
| Receive settlement from friend | €50 income | `transfer` (neutral) |

#### 6a. UI: Transaction type selector

In the transaction edit form, add a `tx_type` dropdown:
- Expense (default)
- Income
- Transfer — excluded from both spending and income
- Settlement (read-only, set by Settle Up flow)

#### 6b. Transfer tagging on import

During CSV import review, heuristically flag potential transfers (description contains
"payment", "transfer", "sent to", "received from"). Show inline option:
> "Looks like a transfer. Mark as transfer so it's excluded from spending?"

This is a UX hint, not automatic — user confirms.

#### 6c. Credit card heuristic (no schema change)

When two imported transactions have opposite signs and near-matching amounts within 5 days:
> "€500 debit on Dec 1 matches €500 credit card statement total. Mark as credit card payment (transfer)?"

Confirmation marks both as `tx_type = 'transfer'`.

---

### Phase 7 — Split transactions across categories

A single CSV transaction can represent multiple purchases (Costco, Amazon). Currently the
whole transaction gets one category.

#### 7a. Schema change

```sql
CREATE TABLE transaction_category_splits (
  id          text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tx_id       integer NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  user_id     text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category_id integer REFERENCES categories(id) ON DELETE SET NULL,
  amount      numeric(10,2) NOT NULL,  -- positive (absolute amount)
  note        text,
  created_at  timestamptz DEFAULT NOW()
);

CREATE INDEX idx_tx_cat_splits_tx ON transaction_category_splits(tx_id);
CREATE INDEX idx_tx_cat_splits_user ON transaction_category_splits(user_id);
```

> **Note:** Uses `category_id` (FK) not a raw `category text` column, consistent with
> the rest of the codebase.

When `transaction_category_splits` rows exist for a transaction, they override the
transaction's own `category_id` in analytics queries.

#### 7b. UI: "Split across categories" in transaction detail

In the transaction edit/detail view, a `[Split across categories]` button opens a mini-form:
- Add rows: Category + Amount
- Live validation: amounts must sum to `ABS(transaction.amount)` (±€0.01)
- Example: €120 Costco → Groceries €60 + Household €35 + Electronics €25

#### 7c. Analytics query change

```sql
-- Category spending with category splits support:
SELECT
  COALESCE(
    split_c.name,        -- from category split
    c.name,              -- from transaction category
    'Uncategorized'
  ) AS category,
  ABS(SUM(COALESCE(tcs.amount, t.amount))) AS total,
  COUNT(*) AS count
FROM transactions t
LEFT JOIN categories c ON c.id = t.category_id
LEFT JOIN transaction_category_splits tcs ON tcs.tx_id = t.id AND tcs.user_id = $1
LEFT JOIN categories split_c ON split_c.id = tcs.category_id
WHERE t.user_id = $1
  AND t.amount < 0
  AND (t.tx_type IS NULL OR t.tx_type = 'expense')
GROUP BY COALESCE(split_c.name, c.name, 'Uncategorized')
```

If no splits exist, the LEFT JOIN produces nothing and COALESCE falls back to the original
category — fully backwards compatible.

#### 7d. Interaction with room splits (Phase 4)

If a transaction has BOTH category splits AND room splits, the effective cost applies
proportionally to each category split:

```
€120 transaction, split 50/50 → effective cost = 50%
Category splits: Groceries €80, Household €40
After effective cost: Groceries €40, Household €20
```

Query pattern:
```sql
SELECT
  COALESCE(split_c.name, c.name, 'Uncategorized') AS category,
  ABS(SUM(
    CASE
      WHEN st.id IS NOT NULL AND ts.amount IS NOT NULL
        -- Apply effective cost ratio to category split amount
        THEN COALESCE(tcs.amount, ABS(t.amount)) * (ts.amount / st.total_amount)
      ELSE COALESCE(tcs.amount, ABS(t.amount))
    END
  )) AS effective_total
FROM transactions t
LEFT JOIN categories c ON c.id = t.category_id
LEFT JOIN shared_transactions st ON st.original_tx_id = t.id
LEFT JOIN transaction_splits ts ON ts.shared_tx_id = st.id AND ts.user_id = $1
LEFT JOIN transaction_category_splits tcs ON tcs.tx_id = t.id AND tcs.user_id = $1
LEFT JOIN categories split_c ON split_c.id = tcs.category_id
WHERE t.user_id = $1
  AND t.amount < 0
  AND (t.tx_type IS NULL OR t.tx_type = 'expense')
GROUP BY COALESCE(split_c.name, c.name, 'Uncategorized')
```

---

### Phase 8 — Reimbursable expense tagging

Work dinners, client gifts, conference costs — paid personally, reimbursed by employer.
Currently these inflate spending analytics permanently.

#### 8a. Schema change

```sql
ALTER TABLE transactions
  ADD COLUMN is_reimbursable boolean NOT NULL DEFAULT false,
  ADD COLUMN reimbursed_at   timestamptz,
  ADD COLUMN reimbursed_tx_id integer REFERENCES transactions(id) ON DELETE SET NULL;
```

> **Note:** `reimbursed_tx_id` is `integer` (matches `transactions.id` type).

#### 8b. Analytics treatment

| State | Analytics treatment |
|-------|-------------------|
| `is_reimbursable = false` | Normal expense, fully counted |
| `is_reimbursable = true`, not yet reimbursed | Counted but marked with `[Reimbursable]` badge; shows in summary card |
| `is_reimbursable = true`, `reimbursed_at` IS NOT NULL | Excluded from spending |

The "pending reimbursement" total is surfaced in a summary card:
> "€240 in pending reimbursements · 3 transactions"

**Analytics query addition:**
```sql
AND (NOT t.is_reimbursable OR t.reimbursed_at IS NULL)
-- Exclude: reimbursable expenses that have been reimbursed
-- Include: reimbursable expenses still pending (so you see what's outstanding)
```

#### 8c. Incoming payment matching

When a new income transaction is imported that matches a pending reimbursable amount (±5%):
> "This €80 payment might be reimbursement for 'Client Lunch'. Link them?"

Linking sets:
- `reimbursed_tx_id` on the expense
- `reimbursed_at = NOW()` on the expense
- `tx_type = 'settlement_received'` on the income transaction (excluded from income analytics)

Net effect: €0 in both spending and income for this pair.

---

### Phase 9 — Recurring transaction detection

#### 9a. Detection algorithm (run post-import, async)

> **Warning:** Do NOT group by `description` for recurring detection — bank import descriptions
> are garbage (`"AMZN MKTP DE*1N3X2Y9Q2"`). Group by `category_id` for pattern detection,
> with optional merchant-name normalization as a future improvement.

For each import batch, run a background query:

```sql
-- Find categories that recur monthly (3+ occurrences, <5% amount variance)
SELECT
  t.category_id,
  c.name AS category_name,
  AVG(ABS(t.amount)) AS avg_amount,
  COUNT(*) AS occurrences,
  MAX(t.tx_date) AS last_seen,
  STDDEV(ABS(t.amount)) AS stddev_amount
FROM transactions t
LEFT JOIN categories c ON c.id = t.category_id
WHERE t.user_id = $1
  AND t.amount < 0
  AND t.tx_date > NOW() - INTERVAL '6 months'
  AND (t.tx_type IS NULL OR t.tx_type = 'expense')
GROUP BY t.category_id, c.name
HAVING COUNT(*) >= 3
  AND (STDDEV(ABS(t.amount)) IS NULL OR STDDEV(ABS(t.amount)) < AVG(ABS(t.amount)) * 0.05)
ORDER BY last_seen DESC
```

For subscription-style detection (same description prefix, regular cadence):
```sql
-- Find transactions within a category that appear on similar days each month
SELECT
  LEFT(description, 20) AS merchant_prefix,
  category_id,
  COUNT(*) AS occurrences,
  AVG(ABS(amount)) AS avg_amount,
  AVG(EXTRACT(DAY FROM tx_date)) AS avg_day_of_month
FROM transactions
WHERE user_id = $1
  AND amount < 0
  AND tx_date > NOW() - INTERVAL '4 months'
GROUP BY LEFT(description, 20), category_id
HAVING COUNT(*) >= 3
  AND STDDEV(EXTRACT(DAY FROM tx_date)) < 5  -- occurs on similar days
```

#### 9b. Schema change

```sql
ALTER TABLE transactions
  ADD COLUMN is_recurring boolean NOT NULL DEFAULT false,
  ADD COLUMN recurring_pattern text  -- 'monthly', 'weekly', 'annual', 'irregular'
  CHECK (recurring_pattern IN ('monthly', 'weekly', 'annual', 'irregular', NULL));
```

Auto-detected recurrings are soft-tagged (user can confirm or dismiss).

#### 9c. Cash flow projection (light version)

Based on confirmed recurring transactions, project next 30 days:
> "Expected this month: Subscriptions €35 · Rent €800 · Insurance €45 = €880 committed"

Add to the existing analytics/home bundle. New field in `AnalyticsSummary`:
```typescript
recurringProjection: {
  committed_this_month: number
  items: Array<{ category: string; avg_amount: number; pattern: string; next_expected: string }>
}
```

---

### Phase 10 — "Splittable" tag for discoverability (Optional)

```sql
ALTER TABLE transactions
  ADD COLUMN is_split_pending boolean NOT NULL DEFAULT false;
```

- Show `[Split pending]` badge in transaction list
- Add filter: "Show unshared" in transaction list filters
- Auto-clears when the transaction is shared (Phase 1 API sets `is_split_pending = false`)

---

## Schema Change Summary

### Columns added to `transactions`

| Column | Type | Phase | Purpose |
|--------|------|-------|---------|
| `tx_type` | `text DEFAULT 'expense'` | 5 | Settlement/transfer typing |
| `pending_import_match` | `boolean DEFAULT false` | 5 | CSV settlement dedup |
| `settlement_for_split_id` | `text FK → transaction_splits` | 5 | Links settlement to split |
| `is_reimbursable` | `boolean DEFAULT false` | 8 | Reimbursable tagging |
| `reimbursed_at` | `timestamptz` | 8 | When reimbursed |
| `reimbursed_tx_id` | `integer FK → transactions` | 8 | Links to reimbursement tx |
| `is_recurring` | `boolean DEFAULT false` | 9 | Recurring flag |
| `recurring_pattern` | `text` | 9 | monthly/weekly/annual/irregular |
| `is_split_pending` | `boolean DEFAULT false` | 10 | "Intend to split" tag |

### New tables

| Table | Phase | Purpose |
|-------|-------|---------|
| `transaction_category_splits` | 7 | Multi-category allocation |

---

## Summary Table

| Phase | What | Schema change | New API | Complexity |
|-------|------|---------------|---------|------------|
| 0 | Fix auto-settle bugs (top-level + item-level) | ❌ | ❌ | Trivial |
| 1 | Share to Room flow (both directions) | ❌ | New `POST /api/transactions/[txId]/share` | Medium |
| 2 | "Shared" badge + effective cost in tx list | ❌ | Extend `GET /transactions` | Medium |
| 3 | Manual room add → personal tx toggle | ❌ | Extend `POST /api/rooms/[roomId]/transactions` | Low |
| 4 | Analytics effective cost substitution | ❌ | Extend all bundle aggregations | Medium |
| 5 | Settlement reconciliation | ✅ (3 columns + `tx_type`) | Settle endpoint + import flow | Medium |
| 6 | Generalized transfer tagging UI | ❌ (reuses Phase 5 column) | Minor | Low |
| 7 | Split transactions across categories | ✅ (`transaction_category_splits` table) | Extend analytics queries | Medium |
| 8 | Reimbursable expense tagging | ✅ (3 columns on `transactions`) | Extend import + analytics | Medium |
| 9 | Recurring transaction detection | ✅ (2 columns on `transactions`) | Background job + bundle | Medium |
| 10 | "Splittable" tag | ✅ (1 column) | Minor | Low |

---

## What Does NOT Change

- Personal transaction records are never modified by sharing
- Room balances are unaffected (they already use `transaction_splits` sums correctly)
- Settlement flow is unchanged — settling a split just flips `status = 'settled'`
- Friend-to-friend splits are unaffected (different `friendship_id` path)
- `validateSplits()` is unchanged — reused as-is

---

## Files Touched (Comprehensive)

| File | Phase | Change |
|------|-------|--------|
| `app/api/rooms/[roomId]/transactions/route.ts` | 0, 3 | Bug fix (×2); toggle |
| `app/api/transactions/[txId]/share/route.ts` | 1 | New endpoint |
| `app/api/transactions/route.ts` | 2 | JOIN for share info |
| `lib/charts/aggregations.ts` | 4, 6, 7, 8 | Effective cost; tx_type filter; category splits |
| `lib/charts/home-trends-savings-aggregations.ts` | 4 | Effective cost |
| `lib/cache/upstash.ts` | 0 | Already correct — called in more places |
| `lib/types/rooms.ts` | — | No change needed |
| `lib/types/transactions.ts` | 5 | Add `TxType`, `settlement_for_split_id` fields |
| `components/rooms/add-expense-dialog.tsx` | 1, 3 | Picker tab + toggle |
| `components/transactions/share-to-room-sheet.tsx` | 1 | New component |
| `app/(pages)/transactions/_page/components/TransactionRow.tsx` | 2 | Badge UI |

---

## Edge Cases (Full List)

| Edge Case | Resolution |
|-----------|-----------|
| Same tx shared in 2 rooms | Blocked at API (409 with room name) |
| Original tx deleted after share | `ON DELETE SET NULL` — share survives, badge disappears |
| Original tx amount edited after share | Warning shown in edit form; no cascade |
| Payer ≠ API caller (`paid_by` field) | Phase 0 fix ensures correct split auto-settles |
| Item-level splits with wrong payer | Phase 0 fix addresses item-level bug too |
| Currency mismatch (tx vs room) | Picker filters to matching currency only |
| Equal split rounding (€10 / 3) | Already handled in `validateSplits()` |
| Phase 3 toggle for non-payer | Toggle hidden when `paid_by ≠ current user` |
| Manual tx from Phase 3 + bank import duplicate | Delete manually-created one; room share survives |
| Bank transfer settlement in CSV import | Phase 5 smart match via `settlement_for_split_id` |
| Cash settlement leaves no bank trace | Phase 5: personal tx created at settle time |
| Payer receives reimbursement via bank | `settlement_received` excluded from income analytics |
| Credit card payment from bank CSV | `tx_type = 'transfer'` excluded from analytics |
| Category split + room split on same tx | Phase 7d: proportional effective cost per category |
| Analytics with tx_type = NULL (legacy rows) | All analytics: `WHERE tx_type IS NULL OR tx_type = 'expense'` |
| Platform analytics (`getSpendingPyramid`) | Must also filter by tx_type (no user-scope issue) |
| Recurring detection on raw bank descriptions | Phase 9: group by `category_id`, not `description` |
| Settlement link after split deleted | `ON DELETE SET NULL` on `settlement_for_split_id` |
| `is_reimbursable` + room split same tx | Both apply independently; reimbursable overrides spending exclusion |
