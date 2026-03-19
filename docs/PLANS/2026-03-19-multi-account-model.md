# Multi-Account Model — Architecture Plan
**Date:** 2026-03-19
**Status:** Future — do NOT implement before Phases 0-5 of room-transaction-sharing plan
**Depends on:** `2026-03-19-room-transaction-sharing.md` (Phase 5 adds `tx_type`)

---

## The Problem

Trakzi currently has one flat pool of transactions per user. There are no named accounts
(Checking, Savings, Credit Card). This causes two categories of silent data corruption that
undermine every analytics chart in the app:

### Corruption 1: Credit card double-counting

```
User has:
  Bank account CSV → imported monthly
  Credit card CSV  → imported monthly

January:
  Credit card:  Coffee €4, Lunch €12, Groceries €80  (individual purchases)
  Bank account: Credit card payment €96               (the bill payment)

Trakzi sees:
  Spending: €4 + €12 + €80 + €96 = €192
  Reality:  €4 + €12 + €80      = €96   ← HALF is phantom double-counting
```

Every user who imports from both their bank AND their credit card has corrupted analytics.
This is the most common source of "my numbers look wrong" confusion in any CSV-based app.

### Corruption 2: Savings transfers look like expenses

```
User moves €500 to savings account on the 1st of each month.
Bank CSV shows: -€500 "Transfer to Savings"

Trakzi sees:
  €500 expense every month, unrecognized category
  Monthly spending: artificially inflated by €500

Reality: This is not spending. Net worth is unchanged.
```

### Corruption 3: Incoming transfers look like income

```
Roommate pays back €50 for utilities.
Bank CSV shows: +€50 "Payment from Alex"

Trakzi sees:
  €50 income → counted in income charts
  Net savings rate: artificially high

Reality: This is debt repayment, not income. Already handled for room splits
         via tx_type = 'settlement_received', but general transfers are not.
```

---

## Why the Account Model Solves This

When transactions belong to a named account, and accounts have types, the app can:

1. **Detect credit card payment:** Bank account debit matches credit card total → it's a
   transfer between two known accounts → mark both sides as `tx_type = 'transfer'` → excluded
   from analytics.

2. **Detect savings transfer:** Bank debit to an account the user has labeled "Savings" →
   automatically a transfer → excluded from spending.

3. **Aggregate correctly:** Total spending = sum of expenses across ALL accounts, with
   transfers between accounts excluded.

Without an account model, these detections are heuristic guesses. With it, they are exact.

---

## Proposed Schema

### New table: `bank_accounts`

```sql
CREATE TABLE bank_accounts (
  id              text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id         text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name            text NOT NULL,                -- "Chase Checking", "Amex Gold", "Savings"
  account_type    text NOT NULL                 -- see CHECK below
                  CHECK (account_type IN (
                    'checking',    -- debit/current account
                    'savings',     -- savings/ISA
                    'credit_card', -- credit card (payments are transfers)
                    'cash',        -- physical cash tracking
                    'investment',  -- brokerage (excluded from spending)
                    'loan'         -- mortgage, car loan (liability)
                  )),
  currency        text NOT NULL DEFAULT 'EUR',
  current_balance numeric(10,2),               -- user-entered or bank-sync'd
  institution     text,                        -- "Revolut", "N26", "Monzo"
  color           text,                        -- UI color for this account
  is_active       boolean NOT NULL DEFAULT true,
  -- Bank sync fields (populated when connected via Open Banking)
  sync_provider         text,                  -- 'nordigen', 'truelayer', 'plaid'
  sync_external_id      text,                  -- provider's account ID
  sync_consent_expires  timestamptz,           -- PSD2 90-day re-auth
  sync_last_at          timestamptz,
  sync_status           text DEFAULT 'manual'  -- 'manual', 'active', 'expired', 'error'
                        CHECK (sync_status IN ('manual', 'active', 'expired', 'error')),
  created_at      timestamptz DEFAULT NOW(),
  updated_at      timestamptz DEFAULT NOW()
);

CREATE INDEX idx_bank_accounts_user ON bank_accounts(user_id);
```

### Modify: `transactions`

```sql
-- Add account reference (nullable — existing transactions have no account)
ALTER TABLE transactions
  ADD COLUMN account_id text REFERENCES bank_accounts(id) ON DELETE SET NULL,
  ADD COLUMN external_tx_id text,  -- provider's transaction ID (for dedup)
  ADD COLUMN import_source text NOT NULL DEFAULT 'csv'
             CHECK (import_source IN ('csv', 'bank_sync', 'manual'));

CREATE INDEX idx_transactions_account ON transactions(account_id);
CREATE UNIQUE INDEX idx_transactions_dedup
  ON transactions(account_id, external_tx_id)
  WHERE external_tx_id IS NOT NULL;  -- prevents duplicate bank sync entries
```

### New table: `account_transfers`

```sql
-- Links two transaction rows that represent both sides of a transfer
CREATE TABLE account_transfers (
  id            text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id       text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  from_tx_id    text NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  to_tx_id      text NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  amount        numeric(10,2) NOT NULL,
  created_at    timestamptz DEFAULT NOW(),
  UNIQUE (from_tx_id),
  UNIQUE (to_tx_id)
);
```

When a credit card payment is made, two transactions exist:
- Bank account: -€500 (from_tx_id)
- Credit card: +€500 payment (to_tx_id)

Linking them in `account_transfers` marks both as `tx_type = 'transfer'` and excludes them
from all analytics. The credit card individual purchases remain and ARE counted.

---

## How Transfer Detection Works

### Automatic (when both accounts are in Trakzi)

When a new transaction is imported, run:

```sql
-- Look for a matching transaction on the other side of a potential transfer
SELECT t.id, t.account_id, t.amount, t.date
FROM transactions t
JOIN bank_accounts ba ON ba.id = t.account_id
WHERE ba.user_id = $1
  AND t.amount = -($2)           -- opposite sign
  AND ABS(t.date - $3) <= 5     -- within 5 days
  AND t.tx_type = 'expense'      -- not already matched
  AND t.account_id != $4         -- different account
  AND NOT EXISTS (
    SELECT 1 FROM account_transfers
    WHERE from_tx_id = t.id OR to_tx_id = t.id
  )
LIMIT 1
```

If a match is found, surface the suggestion UI:
> "€500 from Checking matches €500 to Amex. Mark as credit card payment (transfer)?"

### Manual (user confirms or creates)

In the transaction detail, a [Mark as transfer] button opens an account picker:
> "This is a transfer to: [Account dropdown]"

---

## Analytics Query Change

Currently all analytics sum `t.amount WHERE user_id = $1`. With accounts:

```sql
-- Spending: exclude transfers, investments, loans; include checking + credit cards + cash
SELECT category, SUM(effective_amount) AS total
FROM (
  SELECT
    t.category,
    CASE
      WHEN st.id IS NOT NULL AND ts.amount IS NOT NULL THEN ts.amount  -- room share
      ELSE t.amount
    END AS effective_amount
  FROM transactions t
  LEFT JOIN bank_accounts ba ON ba.id = t.account_id
  LEFT JOIN shared_transactions st ON st.original_tx_id = t.id::text
  LEFT JOIN transaction_splits ts ON ts.shared_tx_id = st.id AND ts.user_id = $1
  WHERE t.user_id = $1
    AND t.tx_type = 'expense'                            -- no transfers/settlements
    AND (ba.account_type IS NULL OR ba.account_type NOT IN ('investment', 'loan'))
    AND t.date BETWEEN $2 AND $3
) sub
GROUP BY category
```

The `ba.account_type IS NULL` branch handles legacy transactions with no account — fully
backwards compatible.

---

## Net Worth View (New)

With account balances tracked, a net worth view becomes possible:

```
Assets:
  Checking (N26)     €2,400
  Savings (Revolut)  €8,500
  Investment         €12,000
Liabilities:
  Credit Card (Amex)   -€340
  Car Loan            -€8,200
─────────────────────────────
Net Worth             €14,360
```

This is a new page or section, fed from `bank_accounts.current_balance`. Balance is either:
- User-entered manually (always available)
- Auto-synced from bank API (requires Open Banking integration — see bank sync plan)

---

## Migration Strategy

Existing transactions have `account_id = NULL`. This is fine — all analytics queries fall
back to the old behavior when `account_id` is null. No data migration needed.

Users who want the account model:
1. Create their accounts in Settings → Accounts
2. On next CSV import, select which account the file is from
3. Trakzi tags all new transactions with that `account_id`
4. Old transactions remain untagged — user can bulk-tag them optionally

This is additive and opt-in. The account model is a power-user feature, not forced on anyone.

---

## Implementation Order

Do NOT implement this before the room-transaction-sharing plan is complete (specifically
Phase 5 which adds `tx_type`). The correct order:

1. `tx_type` column (Phase 5 of sharing plan) — foundation
2. `bank_accounts` table — core model
3. `account_id` on transactions — link transactions to accounts
4. Transfer detection UI — surfaces the credit card double-count fix
5. Analytics query update — uses account types for filtering
6. Net worth view — surface balances
7. (Optional) Bank sync integration — auto-populate accounts and transactions

---

## Relationship to Bank Sync

Bank sync (Open Banking / Plaid / Nordigen) and the account model are deeply linked:
- Bank sync creates `bank_accounts` rows automatically (one per bank account)
- Synced transactions have `account_id` set and `external_tx_id` for dedup
- Transfer detection between synced accounts is automatic (no user action needed)
- Without the account model, bank sync has no home for transactions and no dedup key

You cannot implement bank sync cleanly without this schema first.
See `docs/PLANS/2026-03-19-bank-sync.md` for the full bank sync plan.

---

## Complexity Assessment

| Task | Complexity |
|------|-----------|
| Schema migration | Low — additive, no data migration |
| CSV import: account picker | Low — one dropdown added to import flow |
| Transfer detection + suggestion UI | Medium |
| Analytics query update | Low — additive WHERE clause |
| Net worth view | Medium — new UI surface |
| **Total** | **Medium — 1-2 weeks** |
