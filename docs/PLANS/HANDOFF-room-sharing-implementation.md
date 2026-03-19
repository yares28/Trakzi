# Handoff: Room Transaction Sharing — Implementation Session
**Created:** 2026-03-19
**For:** New conversation context — deep dive + implement plans 1 & 2

---

## What This Session Decided

We designed a complete transaction sharing system for the Rooms feature. Here is everything
decided, why, and what to build next.

---

## The Feature (Plain English)

Users share a living space with roommates. When one person buys groceries for the household,
they should be able to:
1. Share that personal transaction into a room
2. Split the cost between members
3. See their personal analytics reflect only their share (not the full amount)
4. Settle what they owe each other, with the settlement reconciled against bank imports

---

## Core Design Decisions (Do Not Revisit)

| Decision | What | Why |
|----------|------|-----|
| **Immutability** | Original transactions are never modified | Financial records must be auditable; mutations destroy history |
| **Accrual model** | Effective cost = your split amount immediately, not after settlement | Cash basis makes charts spike/dip misleadingly; accrual answers "what did this cost me" |
| **One share per transaction** | A personal transaction can only be shared in one room | Sharing across two rooms creates unreviewable reimbursement math |
| **No new DB tables for core feature** | Everything works with existing `shared_transactions` + `transaction_splits` | Schema already supports all cases; this is a query + UI layer change |
| **Settlement reconciliation** | Settling a room debt creates a `settlement_sent` personal transaction; bank transfers are matched against it on import | Prevents the "paying twice" problem when bank CSV also shows the transfer |

---

## Existing Bug Found (Fix First)

**File:** `app/api/rooms/[roomId]/transactions/route.ts:116`

```typescript
// WRONG — settles the API caller, not the actual payer
status: split.user_id === userId ? "settled" : "pending"

// CORRECT
status: split.user_id === paidByUserId ? "settled" : "pending"
settled_at: split.user_id === paidByUserId ? new Date().toISOString() : null,
```

If roommate paid and you add on their behalf, your split auto-settles instead of theirs.
Every balance calculation downstream is wrong until this is fixed.

---

## Plan 1: Room Transaction Sharing (Phases 0–5)
**File:** `docs/PLANS/2026-03-19-room-transaction-sharing.md`

| Phase | What | Complexity |
|-------|------|-----------|
| **0** | Fix auto-settle bug (2 lines) | Trivial |
| **1** | "Share to Room" button on personal transactions + transaction picker inside room | Medium |
| **2** | "Shared" badge + effective cost display in personal transaction list | Medium |
| **3** | Manual room add → optional "Also add to personal transactions" toggle (payer only, OFF by default) | Low |
| **4** | Analytics bundle: substitute split amount for shared transactions + toggle "Show effective costs" | Medium |
| **5** | Settlement reconciliation: cash/bank flow, `tx_type` column, CSV import matching | Medium |

**No new tables. Two new columns on `transactions`:**
- `tx_type text DEFAULT 'expense'` — handles settlements and transfers
- `pending_import_match boolean DEFAULT false` — flags settlements waiting for CSV match

---

## Plan 2: YNAB-Model Gaps (Phases 6–9)
**File:** `docs/PLANS/2026-03-19-room-transaction-sharing.md` (continued)

| Phase | What | Schema | Complexity |
|-------|------|--------|-----------|
| **6** | Generalized transfer tagging — credit card payments, savings moves excluded from analytics | Reuses `tx_type` from Phase 5 | Low |
| **7** | Split one transaction across multiple categories — €120 Costco → Groceries/Household/Electronics | New `transaction_category_splits` table | Medium |
| **8** | Reimbursable expense tagging — work expenses, client lunches, employer reimbursements | 3 new columns on `transactions` | Medium |
| **9** | Recurring transaction auto-detection — surfaces subscriptions + cash flow projection | 2 new columns on `transactions` | Medium |

---

## Future Plans (Do NOT implement yet)

| Plan | File | Depends on |
|------|------|-----------|
| Multi-account model | `docs/PLANS/2026-03-19-multi-account-model.md` | Phases 0–9 complete |
| Bank sync (Open Banking / Nordigen) | `docs/PLANS/2026-03-19-bank-sync.md` | Multi-account model complete |

---

## Key Files to Know

| File | Purpose |
|------|---------|
| `app/api/rooms/[roomId]/transactions/route.ts` | POST (create shared tx) — has the bug; GET (list) |
| `lib/rooms/split-validation.ts` | `validateSplits()` — handles equal/percentage/custom rounding |
| `lib/rooms/balances.ts` | `getRoomBalances()` — uses `uploaded_by` as payer identity |
| `lib/types/rooms.ts` | `SharedTransaction`, `TransactionSplit`, `SplitType` types |
| `lib/charts/aggregations.ts` | Analytics bundle — needs effective cost substitution in Phase 4 |
| `lib/cache/upstash.ts` | `invalidateUserCachePrefix()` — call after any mutation |
| `lib/auth.ts` | `getCurrentUserId()` — required in every API route |
| `lib/neonClient.ts` | `neonQuery()`, `neonInsert()` — all DB access |

---

## DB Schema (Relevant Tables)

### `shared_transactions`
- `id`, `room_id`, `uploaded_by` (= payer), `original_tx_id` (FK → transactions, SET NULL on delete)
- `total_amount`, `currency`, `description`, `split_type`, `metadata`
- CHECK: must have `room_id` OR `friendship_id`

### `transaction_splits`
- `id`, `shared_tx_id`, `user_id`, `amount`, `status` ('pending'|'settled'), `settled_at`
- Payer's own split is auto-settled at creation time (this is where the bug is)

### `transactions` (personal)
- `id` (integer), `user_id`, `amount`, `description`, `category`, `date`
- Will gain: `tx_type`, `pending_import_match`, `is_reimbursable`, `reimbursed_at`,
  `reimbursed_tx_id`, `is_recurring`, `recurring_pattern`, `is_split_pending`

---

## Architecture Patterns to Follow

```typescript
// All API routes must start with:
const userId = await getCurrentUserId()  // throws 401 if unauthenticated

// All DB queries must scope by user:
WHERE user_id = $1  // always

// After any mutation, invalidate cache:
await invalidateUserCachePrefix(userId, 'analytics')
await invalidateUserCachePrefix(userId, 'home')
await invalidateRoomCache(roomId)

// Never modify personal transactions — they are immutable
// Effective cost is always computed at query time, never stored
```

---

## Instructions for New Session

1. Read `docs/PLANS/2026-03-19-room-transaction-sharing.md` in full
2. Read the key files listed above to understand current state
3. Deep dive each phase — find edge cases, improve the plan details
4. Wait for user confirmation before implementing anything
5. Implement Phase 0 first (bug fix), verify it, then proceed in order
6. Run `npm run build` after every phase — must pass with zero errors
7. After each phase: run code-reviewer agent before moving to next phase
