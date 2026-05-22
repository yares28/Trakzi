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
  current_balance numeric(15,2),               -- user-entered or bank-sync'd
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
  ADD COLUMN external_tx_provider text,  -- snapshot of provider at import time
  ADD COLUMN import_source text NOT NULL DEFAULT 'csv'
             CHECK (import_source IN ('csv', 'bank_sync', 'manual'));

CREATE INDEX idx_transactions_account ON transactions(account_id);
CREATE UNIQUE INDEX idx_transactions_dedup
  ON transactions(account_id, external_tx_provider, external_tx_id)
  WHERE external_tx_id IS NOT NULL;  -- prevents duplicate bank sync entries
```

### Modify: `statements`

```sql
-- Link each imported CSV file to the account it belongs to
ALTER TABLE statements
  ADD COLUMN account_id text REFERENCES bank_accounts(id) ON DELETE SET NULL;

CREATE INDEX idx_statements_account ON statements(account_id);
```

This allows the UI to show "all imports for Amex Gold" and pre-select the correct account
on re-import of the same source. The import dialog sets `account_id` when the user picks
an account; existing statements get `account_id = NULL` (backwards compatible).

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

### Import Commit Flow — Preventing Race Conditions

Transfer detection **must run synchronously before the import is committed** to avoid
transactions briefly appearing as expenses in analytics:

```
1. Parse CSV rows → build transaction records in memory (not yet inserted)
2. Run transfer detection pass over the in-memory batch (intra-batch matching)
3. Run transfer detection pass against existing DB transactions (cross-import matching)
4. Candidates found → mark both sides as tx_type = 'pending_transfer' in memory
5. INSERT all transactions in a single transaction block
6. INSERT confirmed account_transfers rows
7. For pending_transfer candidates: surface review UI to user post-import
```

`tx_type = 'pending_transfer'` is excluded from analytics (same as `'transfer'`) until the
user confirms or rejects. This eliminates the window where a credit card payment inflates
spending while waiting for detection.

### Intra-Batch Transfer Detection (Same-CSV Edge Case)

When both sides of a transfer appear in the same import (e.g. a bank CSV that includes both
the savings-account debit and the credit-card payment debit on the same statement), the
detection loop must run over the **in-memory batch before any DB write**:

```
For each transaction T in batch:
  Look for another transaction T2 in same batch where:
    - T2.amount = -(T.amount)
    - |T2.date - T.date| <= 5 days
    - T2 is not already matched
    - T2.account_id != T.account_id (if account known) OR accounts differ by type
  If found: mark both T and T2 as tx_type = 'pending_transfer', pair them
```

After the intra-batch pass, run the standard cross-DB pass for any unmatched rows.
This ensures same-CSV transfers are caught before they ever land in the database as expenses.

### Manual (user confirms or creates)

In the transaction detail, a [Mark as transfer] button opens an account picker:
> "This is a transfer to: [Account dropdown]"

### Transfer Matching Rules and Safeguards (Upgrade)

- **Amount tolerance:** Support a small tolerance window (fees/interest) and flag as "partial match"
  when values differ; require explicit user confirmation.
- **Multiple candidates:** If more than one candidate matches, do not auto-link; show a choice list.
- **Currency must match:** Never auto-link across different currencies unless an FX rate is present.
- **Date range:** Make the matching window configurable (default 5 days), and widen for credit cards.
- **Manual override:** Always allow unlinking or re-linking transfers, with a short audit trail note.
- **Exclude known non-transfers:** Skip candidates already labeled as income/settlement/refund.

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
    AND t.tx_type = 'expense'                            -- no transfers/settlements/pending
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

## Import Dialog and Account Management (Additive)

Update the import dialog so account selection is part of the flow:

- **Import dialog account/card picker:** At import time, show a required account selector that
  determines which account the CSV belongs to.
- **Header account switcher (replace "Project lead"):** In the import dialog, replace the "Project
  lead" label with "Account/Card" and let the user change which account/card is used for this
  import (same as the account picker, but visible in the header so it is easy to change mid-flow).
- **Add account/card inline:** From that same control, allow creating a new account/card without
  leaving the import dialog (mini create form).

This ensures users always map new data to a specific account while keeping the flow fast.

Additional UI rules:
- **Default selection:** Preselect the most recently used account for imports.
- **Search and grouping:** Allow search and group by institution/type for fast selection.
- **Limit awareness:** If the user is at the plan limit, the inline create option shows an upgrade
  prompt and stays disabled, but import into existing accounts remains allowed.
- **Mixed CSV guardrail:** If the CSV appears to contain multiple accounts (multiple currencies or
  multiple account numbers), block import and prompt the user to split the file.

---

## Time Period Filter (Accounts)

Add an option to the global time period filter to control account visibility:

- **Show all accounts** (default)
- **Show only selected accounts** (respect current account filters)

This makes it easy to see overall totals or focus on specific accounts/cards.

---

## Account Filter Model (Upgrade)

Define a single, global account filter state used by analytics, lists, and exports:

- **Filter state:** `{ mode: all|selected, selected_account_ids: [] }`
- **Default:** `mode = all` with an empty selection.
- **Persistence:** Store per user in `user_preferences.preferences.settings` (server source of truth
  with local cache for offline load).
- **Archived accounts:** Hidden by default; only included if explicitly toggled on.
- **Scope:** Applies across dashboard totals, category charts, and transaction lists.
  Exports should respect the filter unless the user explicitly overrides it.

Implementation note:
- Add `settings.account_filter` to `lib/types/user-preferences.ts` and sync via
  `components/user-preferences-provider.tsx` and `/api/user-preferences`.

---

## Account Limits by Plan

Enforce plan-based limits on the number of accounts:

- **Free:** max 2 accounts
- **Pro:** max 5 accounts
- **Max:** max 15 accounts

If the user hits the limit, block creation and surface an upgrade prompt.

### Plan Limit Enforcement Details (Upgrade)

- **What counts:** Only active accounts count toward the limit; archived accounts do not.
- **Downgrade behavior:** Keep existing accounts but block new creation; show a banner prompting
  upgrade or archiving to get under the limit.
- **Import behavior:** Importing into existing accounts remains allowed even if over the limit.
- **Sync behavior:** Bank sync auto-creation must respect limits (prompt user to choose or upgrade).
- **Archive and limit:** Archiving an account frees a slot immediately; unarchive checks limits.

---

## Dedup Strategy (Upgrade)

`external_tx_id` can collide across providers. Make dedup unique on:
- `account_id + external_tx_provider + external_tx_id` (and only when `external_tx_id` is not null).

Also add a soft fallback dedup check for CSV imports (date + amount + description) that only
suggests duplicates and never auto-drops them.

---

## Multi-Currency Handling (Upgrade)

- Store `currency` per account and never auto-link transfers across currencies without an FX rate.
- If CSV imports include mixed currencies, require the user to split or select the correct account.
- Net worth view should be explicit about its base currency and the conversion source.
- If no FX rate is available, show separate currency totals instead of a combined net worth.

---

## Account Lifecycle (Upgrade)

- **Archive:** Hides from default filters but preserves history.
- **Delete:** Allowed only if no transactions exist or after explicit confirmation of orphaning.
- **Rename:** Does not affect historical analytics; stored as display-only metadata.
- **Merge (optional):** Provide a manual merge flow that reassigns all transactions to a target
  account and archives the source.

---

## Edge Cases Checklist (Upgrade)

- Credit card payments that include interest/fees or are split across multiple payments.
- Transfers that appear as two debits (ACH hold + settlement) or two credits.
- Refunds/chargebacks that reverse prior card spend.
- Imports where both sides of a transfer are in the same CSV/account.
- Multiple accounts with similar names causing mis-selection in import flow.
- Manual edits after a transfer is linked (amount/date changes).
- Mixed-currency CSV files or transfers across currencies.
- Provider re-syncs that re-issue external IDs or change descriptions.
- Downgrades where active accounts exceed plan limits.

---

## Implementation Order

Do NOT implement this before the room-transaction-sharing plan is complete (specifically
Phase 5 which adds `tx_type`). The correct order:

1. `tx_type` column (Phase 5 of sharing plan) - foundation
2. `bank_accounts` table - core model and account lifecycle rules (archive/delete)
3. `transactions` columns (`account_id`, `external_tx_id`, `external_tx_provider`) and dedup index
4. `statements.account_id` column - links imported files to accounts
5. Import dialog account/card picker + inline account creation + label update
6. Import commit flow: intra-batch + cross-DB transfer detection with `pending_transfer` state
7. Account filter model + time period filter option (persistent, global scope)
8. Transfer suggestion UI + safeguards (tolerance, multi-candidate handling, manual override)
9. Plan limit enforcement + upgrade prompts + downgrade handling
10. Multi-currency handling rules (no cross-currency auto-links; base currency for net worth)
11. Analytics query update - uses account types, account filters, excludes `pending_transfer`
12. Net worth view - surface balances
13. (Optional) Bank sync integration - auto-populate accounts and transactions

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
| Schema migration (`bank_accounts`, `transactions`, `statements`) | Low — additive, no data migration |
| CSV import: account picker + inline account create | Low–Medium |
| Import commit flow: intra-batch + cross-DB transfer detection | Medium |
| Transfer suggestion UI + safeguards | Medium |
| Analytics query update | Low — additive WHERE clause |
| Global account filter (server-persisted, offline-cached, all pages) | Medium–High |
| Plan limit enforcement + downgrade handling + upgrade prompts | Medium |
| Net worth view | Medium — new UI surface |
| **Total** | **Medium–High — 2–3 weeks** |
