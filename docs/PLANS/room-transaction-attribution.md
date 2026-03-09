# Room Transaction Attribution — Implementation Plan

**Feature**: Add transactions to rooms from multiple sources with per-item/per-transaction user attribution and balance tracking.

**Status**: Planning
**Created**: 2026-03-09
**Complexity**: HIGH (spans backend, frontend, integrates 3 existing pipelines)

---

## Table of Contents

1. [Requirements](#1-requirements)
2. [Architecture Overview](#2-architecture-overview)
3. [Database Changes](#3-database-changes)
4. [Phase 1 — Backend: Core Attribution APIs](#phase-1--backend-core-attribution-apis)
5. [Phase 2 — Backend: Import Pipelines](#phase-2--backend-import-pipelines)
6. [Phase 3 — Frontend: Add to Room Dialog](#phase-3--frontend-add-to-room-dialog)
7. [Phase 4 — Frontend: Attribution List](#phase-4--frontend-attribution-list)
8. [Phase 5 — Frontend: Updated Balances](#phase-5--frontend-updated-balances)
9. [File Manifest](#file-manifest)
10. [DB Migration SQL](#db-migration-sql)
11. [Risk Matrix](#risk-matrix)
12. [Verification Checklist](#verification-checklist)

---

## 1. Requirements

### What the user does

1. **Opens a room** → clicks "Add Transactions"
2. **Chooses a source**:
   - **My Transactions** — browse & multi-select from personal `transactions` table
   - **Receipt / Photo** — upload image/PDF, OCR extracts line items
   - **Bank Statement** — upload CSV/PDF/XLSX, parse into transaction rows
3. **Attributes each item/transaction** to room members:
   - **"Mine"** — user pays alone (100% to self)
   - **"Split"** — split between 2+ members (equal, custom, or percentage)
   - **"Others"** — assign entirely to another specific member
   - **"Unattributed"** — leave unassigned (can be attributed later)
4. **Views the transaction list** with two filter modes:
   - **All** — every transaction in the room
   - **Unattributed** — only transactions with no user assigned
5. **Sees updated balances** including:
   - Per-member net balance (existing)
   - Source breakdown (receipts / statements / imported / manual)
   - Unattributed total (separate card)

### Constraints

- Room-scoped only — does NOT affect personal analytics, home page, or savings
- Must respect plan limits (shared tx/month via `checkSharedTxLimit`)
- Reuse existing OCR, CSV parsing, and statement import pipelines
- Reuse existing shadcn dialogs/modals — no new UI primitives

---

## 2. Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    ADD TO ROOM DIALOG                        │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────────┐  │
│  │ My Txns      │  │ Receipt      │  │ Bank Statement    │  │
│  │ (browse &    │  │ (OCR upload  │  │ (CSV/PDF/XLSX     │  │
│  │  select)     │  │  → items)    │  │  → transactions)  │  │
│  └──────┬───────┘  └──────┬───────┘  └────────┬──────────┘  │
│         │                 │                    │             │
│         └────────────┬────┴────────────────────┘             │
│                      ▼                                       │
│         ┌─────────────────────────┐                          │
│         │   ATTRIBUTION STEP      │                          │
│         │   Per item: assign to   │                          │
│         │   Me / Split / Other /  │                          │
│         │   Unattributed          │                          │
│         └───────────┬─────────────┘                          │
└─────────────────────┼───────────────────────────────────────┘
                      ▼
┌─────────────────────────────────────────────────────────────┐
│  POST /api/rooms/[roomId]/transactions/bulk                  │
│                                                             │
│  Creates shared_transactions + receipt_items +               │
│  transaction_splits (or none if unattributed)                │
│                                                             │
│  metadata.source_type = 'personal_import' | 'receipt' |     │
│                          'statement' | 'manual'              │
└─────────────────────────────────────────────────────────────┘
                      ▼
┌─────────────────────────────────────────────────────────────┐
│  ROOM DETAIL PAGE                                            │
│                                                             │
│  ┌──────────────┐  ┌──────────────────────────────────────┐  │
│  │ Balances     │  │ Transaction Attribution List          │  │
│  │ (per-member  │  │ Filter: [All] [Unattributed]         │  │
│  │  + unattrib  │  │                                      │  │
│  │  card)       │  │ Each row: description, amount,       │  │
│  └──────────────┘  │ source icon, attribution chips,      │  │
│                    │ edit button                           │  │
│                    └──────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Data flow for each source

| Source | Pipeline | Creates |
|--------|----------|---------|
| Personal Import | Query `transactions` → bulk insert `shared_transactions` with `original_tx_id` | 1 `shared_transaction` per selected tx, 0 `receipt_items`, 0-N `transaction_splits` |
| Receipt Upload | `parseReceiptFile()` → extract items → bulk insert | 1 `shared_transaction` (receipt total), N `receipt_items`, 0-N `transaction_splits` (per item via `item_id`) |
| Statement Upload | `parseCsvToRows()` → select rows → bulk insert | N `shared_transactions` (1 per row), 0 `receipt_items`, 0-N `transaction_splits` |

### Unattributed definition

A `shared_transaction` with **zero** `transaction_splits` rows = **unattributed**. This is clean and queryable:

```sql
-- Count unattributed
SELECT COUNT(*) FROM shared_transactions st
WHERE st.room_id = $1
  AND NOT EXISTS (SELECT 1 FROM transaction_splits ts WHERE ts.shared_tx_id = st.id)

-- For receipt items: item has no split
SELECT ri.* FROM receipt_items ri
WHERE ri.shared_tx_id = $1
  AND NOT EXISTS (SELECT 1 FROM transaction_splits ts WHERE ts.item_id = ri.id)
```

---

## 3. Database Changes

### No new tables needed

The existing schema already supports everything:
- `shared_transactions` — has `original_tx_id`, `receipt_url`, `metadata` (jsonb for source_type)
- `receipt_items` — line items for receipts
- `transaction_splits` — per-user splits with optional `item_id` for item-level
- `SplitType = 'item_level'` — already in the CHECK constraint

### Schema-level changes

**1. Allow empty splits** — Currently the API (not DB) enforces `splits.length >= 1`. Relax this in the Zod schema and `validateSplits()`.

**2. Metadata convention** — Store `source_type` in `shared_transactions.metadata`:

```jsonc
// Personal import
{ "source_type": "personal_import", "original_tx_ids": [123, 456] }

// Receipt upload
{ "source_type": "receipt", "store_name": "Mercadona", "item_count": 10 }

// Statement upload
{ "source_type": "statement", "file_name": "march-2026.csv", "row_count": 15 }

// Manual (existing flow, default)
{ "source_type": "manual" }
```

**3. Add index for unattributed query performance:**

```sql
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_splits_shared_tx_id
ON transaction_splits(shared_tx_id);
-- This index already exists (idx_splits_shared_tx), so no change needed.
```

---

## Phase 1 — Backend: Core Attribution APIs

### 1.1 Modify `validateSplits()` to allow empty splits

**File:** `lib/rooms/split-validation.ts`

```typescript
// BEFORE (line 23):
if (splits.length === 0) {
    throw new Error('At least one split is required')
}

// AFTER:
if (splits.length === 0) {
    return [] // Unattributed — no splits
}
```

No other changes. All downstream code (balance calc, settle-up) naturally skips transactions with 0 splits.

### 1.2 Modify transaction creation schema

**File:** `app/api/rooms/[roomId]/transactions/route.ts`

```typescript
// BEFORE:
splits: z.array(SplitInputSchema).min(1, "At least one split required"),

// AFTER:
splits: z.array(SplitInputSchema).default([]), // Empty = unattributed
```

Also add `source_type` and `receipt_items` to the schema:

```typescript
const CreateSharedTxSchema = z.object({
    total_amount: z.number().positive(),
    description: z.string().min(1).max(500),
    category: z.string().max(100).optional(),
    transaction_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    split_type: z.enum(["equal", "percentage", "custom", "item_level"]).default("equal"),
    currency: z.enum(["EUR", "USD", "GBP"]).default("EUR"),
    splits: z.array(SplitInputSchema).default([]),
    source_type: z.enum(["manual", "personal_import", "receipt", "statement"]).default("manual"),
    original_tx_id: z.number().optional(),
    receipt_items: z.array(z.object({
        name: z.string().min(1).max(300),
        amount: z.number().positive(),
        quantity: z.number().int().positive().default(1),
        category: z.string().max(100).optional(),
    })).optional(),
})
```

When `receipt_items` is provided:
1. Insert the `shared_transaction`
2. Insert each `receipt_item` linked to `shared_tx_id`
3. For each item, if it has splits in the request, insert `transaction_splits` with `item_id`

### 1.3 New: Bulk create endpoint

**File:** `app/api/rooms/[roomId]/transactions/bulk/route.ts` (NEW)

**POST** — Creates multiple shared_transactions in a single request (for statement/personal import).

```typescript
const BulkCreateSchema = z.object({
    transactions: z.array(z.object({
        total_amount: z.number().positive(),
        description: z.string().min(1).max(500),
        category: z.string().max(100).optional(),
        transaction_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        currency: z.enum(["EUR", "USD", "GBP"]).default("EUR"),
        original_tx_id: z.number().optional(),
        splits: z.array(SplitInputSchema).default([]),
    })).min(1).max(100), // Max 100 per batch
    source_type: z.enum(["personal_import", "statement"]),
    metadata: z.record(z.unknown()).optional(),
})
```

**Logic:**
1. Auth + membership check
2. Check shared tx limit: `checkSharedTxLimit(userId)` — compare `current + transactions.length` vs `max`
3. Begin transaction (use `neonQuery` with multi-statement)
4. For each transaction: insert `shared_transaction` + optional `transaction_splits`
5. Invalidate room cache
6. Return `{ created: number, ids: string[] }`

### 1.4 New: Update splits for a transaction

**File:** `app/api/rooms/[roomId]/transactions/[txId]/splits/route.ts` (NEW)

**PUT** — Replace all splits for a shared_transaction. Used by the attribution UI.

```typescript
const UpdateSplitsSchema = z.object({
    split_type: z.enum(["equal", "percentage", "custom", "item_level"]).default("custom"),
    splits: z.array(z.object({
        user_id: z.string().min(1),
        amount: z.number().optional(),
        percentage: z.number().optional(),
        item_id: z.string().optional(), // For item-level attribution
    })).default([]), // Empty = set to unattributed
})
```

**Logic:**
1. Auth + membership check
2. Verify transaction belongs to this room
3. Only the uploader OR admin/owner can modify splits
4. DELETE all existing `transaction_splits` for this `shared_tx_id` (and optionally `item_id`)
5. If `splits.length > 0`: validate via `validateSplits()`, insert new rows
6. If `splits.length === 0`: transaction becomes unattributed
7. Invalidate room cache

### 1.5 New: Browse personal transactions endpoint

**File:** `app/api/rooms/[roomId]/transactions/browse/route.ts` (NEW)

**GET** — Returns the current user's personal transactions for import selection.

```typescript
// Query params: ?search=grocery&from=2026-01-01&to=2026-03-09&limit=50&offset=0
```

**Logic:**
1. Auth + membership check
2. Query `transactions` table filtered by `user_id`, optional `search` (ILIKE on description), `from`/`to` date range
3. Exclude transactions already imported to this room (`original_tx_id` check)
4. Return paginated results with total count

**Response:**
```typescript
{
    data: Array<{
        id: number
        date: string
        description: string
        amount: number
        category_name: string | null
        already_in_room: boolean
    }>
    meta: { total, limit, offset }
}
```

### 1.6 Update room bundle to include attribution stats

**File:** `app/api/rooms/[roomId]/bundle/route.ts`

Add to the parallel `Promise.all`:

```typescript
// Unattributed stats
const unattributedStats = await neonQuery<{ total: string; count: string }>(
    `SELECT
        COALESCE(SUM(st.total_amount), 0)::text AS total,
        COUNT(*)::text AS count
     FROM shared_transactions st
     WHERE st.room_id = $1
       AND NOT EXISTS (
           SELECT 1 FROM transaction_splits ts WHERE ts.shared_tx_id = st.id
       )`,
    [roomId]
)

// Source breakdown
const sourceBreakdown = await neonQuery<{ source_type: string; total: string; count: string }>(
    `SELECT
        COALESCE(metadata->>'source_type', 'manual') AS source_type,
        COALESCE(SUM(total_amount), 0)::text AS total,
        COUNT(*)::text AS count
     FROM shared_transactions
     WHERE room_id = $1
     GROUP BY COALESCE(metadata->>'source_type', 'manual')`,
    [roomId]
)
```

Add to `RoomBundleSummary`:

```typescript
interface RoomBundleSummary {
    // ... existing fields ...
    unattributedTotal: number
    unattributedCount: number
    sourceBreakdown: {
        personal_import: { total: number; count: number }
        receipt: { total: number; count: number }
        statement: { total: number; count: number }
        manual: { total: number; count: number }
    }
}
```

### 1.7 Update transaction list to include splits + items

**File:** `app/api/rooms/[roomId]/transactions/route.ts` (GET)

Extend the query to include split info per transaction:

```sql
-- After fetching transactions, batch-fetch their splits:
SELECT ts.shared_tx_id, ts.user_id, ts.amount, ts.item_id, u.name AS display_name
FROM transaction_splits ts
JOIN users u ON u.id = ts.user_id
WHERE ts.shared_tx_id = ANY($1::text[])

-- And receipt items:
SELECT ri.id, ri.shared_tx_id, ri.name, ri.amount, ri.quantity, ri.category
FROM receipt_items ri
WHERE ri.shared_tx_id = ANY($1::text[])
```

Return as nested objects:

```typescript
{
    ...transaction,
    splits: TransactionSplitWithProfile[],
    items: ReceiptItem[],
    is_attributed: boolean, // splits.length > 0
    source_type: string,    // from metadata
}
```

---

## Phase 2 — Backend: Import Pipelines

### 2.1 Receipt upload → room items

**No new endpoint needed.** The Add to Room dialog handles receipt parsing client-side:

1. User uploads image/PDF in the dialog
2. Client calls existing `POST /api/receipts/upload` which triggers OCR
3. Client polls `GET /api/receipts/[id]` for parsed items
4. Parsed items are shown in the attribution step
5. On "Save", client calls `POST /api/rooms/[roomId]/transactions` with:
   ```json
   {
       "total_amount": 47.50,
       "description": "Mercadona receipt",
       "transaction_date": "2026-03-09",
       "split_type": "item_level",
       "source_type": "receipt",
       "receipt_items": [
           { "name": "Milk 1L", "amount": 1.20, "quantity": 1 },
           { "name": "Bread", "amount": 0.95, "quantity": 2 }
       ],
       "splits": [] // All unattributed initially, user attributes in step 3
   }
   ```

**Alternative (simpler):** Skip the background processing pipeline entirely. Instead, use a dedicated lightweight endpoint:

**File:** `app/api/rooms/[roomId]/transactions/parse-receipt/route.ts` (NEW)

**POST** — Upload receipt image, parse it, return items (no DB write yet).

```typescript
// Request: FormData with file
// Response:
{
    store_name: string | null
    receipt_date: string | null
    total_amount: number | null
    currency: string | null
    items: Array<{
        name: string
        amount: number
        quantity: number
        category: string | null
    }>
}
```

**Logic:**
1. Auth + membership check
2. Read file from FormData
3. Call `parseReceiptFile()` directly (synchronous, no queue)
4. Return parsed items — client uses them in attribution step
5. On "Save", client posts to `POST /api/rooms/[roomId]/transactions` with `receipt_items`

This avoids creating orphan receipt records in the `receipts` table. The receipt items are only saved when the user confirms.

### 2.2 Statement upload → room transactions

Same pattern — parse first, then bulk-import on confirmation.

**File:** `app/api/rooms/[roomId]/transactions/parse-statement/route.ts` (NEW)

**POST** — Upload CSV/PDF/XLSX, parse it, return transactions (no DB write yet).

```typescript
// Request: FormData with file
// Response:
{
    rows: Array<{
        date: string       // ISO
        description: string
        amount: number
        category: string | null
    }>
    diagnostics: {
        totalRows: number
        validRows: number
        warnings: string[]
    }
}
```

**Logic:**
1. Auth + membership check
2. Detect file type (CSV, PDF, XLSX)
3. For PDF: extract text → AI-to-CSV via existing pipeline
4. For XLSX: convert to CSV via `xlsx` library
5. Run `parseCsvToRows()` on resulting CSV
6. Return parsed rows
7. User selects which rows to import → client calls `POST /api/rooms/[roomId]/transactions/bulk`

---

## Phase 3 — Frontend: Add to Room Dialog

### Component: `components/rooms/add-to-room-dialog.tsx` (NEW)

Multi-step dialog with animated transitions between steps.

### Step 1: Source Selection

```
┌─────────────────────────────────────────────────────────┐
│  Add Transactions to Room                          [X]  │
│─────────────────────────────────────────────────────────│
│                                                         │
│  Choose how to add transactions:                        │
│                                                         │
│  ┌─────────────────┐  ┌─────────────────┐               │
│  │  📋 My Txns     │  │  🧾 Receipt     │               │
│  │  Browse your    │  │  Upload photo   │               │
│  │  transactions   │  │  or PDF         │               │
│  └─────────────────┘  └─────────────────┘               │
│                                                         │
│  ┌─────────────────┐                                    │
│  │  📄 Statement   │                                    │
│  │  Upload CSV,    │                                    │
│  │  PDF, or XLSX   │                                    │
│  └─────────────────┘                                    │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Step 2a: Browse Personal Transactions

```
┌─────────────────────────────────────────────────────────┐
│  ← Back     Select Transactions                    [X]  │
│─────────────────────────────────────────────────────────│
│  🔍 Search transactions...         📅 Date range ▾     │
│─────────────────────────────────────────────────────────│
│  ☐  Mar 8   Mercadona groceries           -€47.50      │
│  ☐  Mar 7   Restaurant La Casa            -€32.00      │
│  ☑  Mar 6   Lidl weekly shop              -€28.90      │
│  ☑  Mar 5   Coffee shop                    -€4.50      │
│  ☐  Mar 4   Gas station                   -€45.00      │
│  ☐  Mar 3   Pharmacy                      -€12.30      │
│  ... (scrollable, paginated)                            │
│─────────────────────────────────────────────────────────│
│  2 selected (€33.40)        [Import & Attribute →]      │
└─────────────────────────────────────────────────────────┘
```

**Reuses:** `Input` (search), `Checkbox`, `Badge` (category), `Button`
**Fetches:** `GET /api/rooms/[roomId]/transactions/browse?search=...&from=...&to=...`

### Step 2b: Receipt Upload

```
┌─────────────────────────────────────────────────────────┐
│  ← Back     Upload Receipt                         [X]  │
│─────────────────────────────────────────────────────────│
│                                                         │
│  ┌─────────────────────────────────────────────────┐    │
│  │                                                 │    │
│  │     Drag & drop receipt image or PDF here       │    │
│  │              or click to browse                  │    │
│  │                                                 │    │
│  │     Supports: JPG, PNG, PDF                     │    │
│  └─────────────────────────────────────────────────┘    │
│                                                         │
│  (After upload + OCR parsing:)                          │
│                                                         │
│  🏪 Mercadona  •  Mar 8, 2026  •  €47.50 total        │
│                                                         │
│  ☑  Milk 1L                    x1        €1.20          │
│  ☑  Bread                      x2        €1.90          │
│  ☑  Chicken breast 500g        x1        €4.50          │
│  ☑  Olive oil 1L               x1        €5.80          │
│  ☐  Toilet paper               x1        €3.20          │
│  ... (editable names + amounts)                         │
│─────────────────────────────────────────────────────────│
│  8 items selected (€41.10)    [Continue to Attribution →]│
└─────────────────────────────────────────────────────────┘
```

**Reuses:** `FileUpload01` component (drag-drop, progress), `Checkbox`, `Input`
**Calls:** `POST /api/rooms/[roomId]/transactions/parse-receipt` (FormData)

### Step 2c: Statement Upload

```
┌─────────────────────────────────────────────────────────┐
│  ← Back     Upload Statement                       [X]  │
│─────────────────────────────────────────────────────────│
│                                                         │
│  (Same drag-drop zone, accepts CSV/PDF/XLSX)            │
│                                                         │
│  (After parsing:)                                       │
│                                                         │
│  Found 23 transactions (Feb 1 - Feb 28, 2026)          │
│  ⚠ 2 rows skipped (invalid date)                       │
│                                                         │
│  ☑  Feb 28  Mercadona                     -€47.50      │
│  ☑  Feb 27  Restaurant                    -€32.00      │
│  ☐  Feb 26  Salary deposit              +€2,400.00     │
│  ☑  Feb 25  Lidl                          -€28.90      │
│  ... (scrollable, selectable)                           │
│─────────────────────────────────────────────────────────│
│  15 selected (€342.80)       [Continue to Attribution →] │
└─────────────────────────────────────────────────────────┘
```

**Reuses:** `FileUploadStatement` component (drag-drop), `Checkbox`, `Badge`
**Calls:** `POST /api/rooms/[roomId]/transactions/parse-statement` (FormData)

### Step 3: Attribution (shared across all sources)

```
┌─────────────────────────────────────────────────────────┐
│  ← Back     Attribute Transactions                 [X]  │
│─────────────────────────────────────────────────────────│
│  Filter: [All (10)] [Unattributed (6)]                  │
│─────────────────────────────────────────────────────────│
│                                                         │
│  Milk 1L                           €1.20                │
│  [🙋 Mine] [👥 Split] [👤 Other] [⊘ Skip]              │
│                                                         │
│  Bread                             €1.90                │
│  [🙋 Mine] [👥 Split ▾] [👤 Other] [⊘ Skip]            │
│  └─ Split between: You (€0.95) + Alice (€0.95)         │
│                                                         │
│  Chicken breast 500g               €4.50                │
│  [🙋 Mine] [👥 Split] [👤 Alice ▾] [⊘ Skip]            │
│                                                         │
│  Olive oil 1L                      €5.80                │
│  [🙋 Mine ✓] [👥 Split] [👤 Other] [⊘ Skip]            │
│                                                         │
│  ... (scrollable)                                       │
│─────────────────────────────────────────────────────────│
│  Summary: You €12.45 • Alice €8.30 • Bob €3.20         │
│  Unattributed: €17.15 (6 items)                         │
│                                                         │
│                                      [Save Attribution]  │
└─────────────────────────────────────────────────────────┘
```

**Attribution modes per item:**

| Mode | What happens | Split created |
|------|-------------|---------------|
| **Mine** | 100% to current user | 1 split: `{ user_id: me, amount: full, status: 'settled' }` |
| **Split** | Divide among selected members | N splits: equal or custom amounts |
| **Other** | 100% to one other member | 1 split: `{ user_id: them, amount: full, status: 'pending' }` |
| **Skip** | Leave unattributed | 0 splits (can be attributed later) |

**Split sub-UI** (inline expand when "Split" selected):

```
Split between:
  ☑ You       €—  (auto-calculated)
  ☑ Alice     €—  (auto-calculated)
  ☐ Bob
  Split mode: [Equal ▾] / [Custom amounts]
```

**Member selector** (for "Other" mode): dropdown of room members excluding self.

### State management

```typescript
type AttributionMode = 'mine' | 'split' | 'other' | 'skip'

interface PendingItem {
    tempId: string              // Client-generated
    name: string
    amount: number
    quantity?: number
    category?: string | null
    date?: string
    // Attribution state:
    mode: AttributionMode
    splitMembers?: string[]     // user_ids for split mode
    splitAmounts?: Record<string, number>  // custom amounts
    assignedTo?: string         // user_id for "other" mode
}
```

On "Save Attribution":
1. Group items by their parent transaction (receipt = 1 parent, statement/import = 1 per item)
2. For receipts: `POST /api/rooms/[roomId]/transactions` with `receipt_items` + per-item splits
3. For statements/imports: `POST /api/rooms/[roomId]/transactions/bulk` with per-tx splits
4. Close dialog, invalidate room bundle, show success toast

---

## Phase 4 — Frontend: Attribution List

### Component: `app/rooms/[roomId]/_page/components/RoomAttributionList.tsx` (NEW)

Replaces the current `RoomTransactions` component with a richer view.

### Layout

```
┌─────────────────────────────────────────────────────────┐
│  Transactions                          [+ Add to Room]  │
│─────────────────────────────────────────────────────────│
│  [All (24)] [Unattributed (6)]                          │
│─────────────────────────────────────────────────────────│
│                                                         │
│  📋  Lidl weekly shop              Mar 6     €28.90     │
│      You: €14.45 • Alice: €14.45        Split (equal)   │
│                                              [Edit ✏️]   │
│                                                         │
│  🧾  Mercadona receipt             Mar 8     €47.50     │
│      8 items • 4 attributed • 4 unattributed            │
│      ▸ Expand items                          [Edit ✏️]   │
│                                                         │
│  📄  Statement: Feb 2026 import    Feb 28    €342.80    │
│      15 transactions • ⚠ 6 unattributed                 │
│      ▸ Expand transactions                   [Edit ✏️]   │
│                                                         │
│  📋  Coffee shop                   Mar 5      €4.50     │
│      ⊘ Unattributed                          [Edit ✏️]   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Source icons

| Source | Icon | Component |
|--------|------|-----------|
| `personal_import` | `ArrowDownToLine` | lucide-react |
| `receipt` | `Receipt` | lucide-react |
| `statement` | `FileSpreadsheet` | lucide-react |
| `manual` | `PenLine` | lucide-react |

### Attribution chips

Per transaction/item, show colored avatar chips for assigned users:
- **Assigned:** `<Avatar>` mini chips (like challenge leaderboard)
- **Split:** Multiple avatar chips with amount labels
- **Unattributed:** Grey `Badge` with "Unattributed" text

### Edit button behavior

Clicking "Edit" on a transaction opens a **bottom sheet or inline editor** (not a full dialog) with the same attribution UI from Step 3, but scoped to that single transaction's items/splits.

### Expand behavior (for receipts/statements)

Receipts and statement imports can be expanded to show individual items/rows with their own attribution state. Uses `Collapsible` from shadcn (or a simple toggle).

---

## Phase 5 — Frontend: Updated Balances

### Component: `app/rooms/[roomId]/_page/components/RoomBalances.tsx` (MODIFY)

Add an "Unattributed" summary card alongside member balance cards.

```
┌─────────────────────────────────────────────────────────┐
│  Balances                                               │
│─────────────────────────────────────────────────────────│
│                                                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐              │
│  │ YA       │  │ AL       │  │ BO       │              │
│  │ You      │  │ Alice    │  │ Bob      │              │
│  │ +€45.20  │  │ -€32.10  │  │ -€13.10  │              │
│  │ emerald  │  │ rose     │  │ rose     │              │
│  └──────────┘  └──────────┘  └──────────┘              │
│                                                         │
│  ┌─────────────────────────────────────────────────┐    │
│  │  ⊘ Unattributed                                 │    │
│  │  6 transactions • €127.40 total                 │    │
│  │  [Attribute Now →]                              │    │
│  └─────────────────────────────────────────────────┘    │
│                                                         │
│  Source Breakdown:                                       │
│  📋 Imported: €33.40 (2)  🧾 Receipts: €47.50 (1)     │
│  📄 Statements: €342.80 (15)  ✏️ Manual: €0 (0)       │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Props update

```typescript
interface RoomBalancesProps {
    balances: Balance[]
    unattributedTotal: number
    unattributedCount: number
    sourceBreakdown: {
        personal_import: { total: number; count: number }
        receipt: { total: number; count: number }
        statement: { total: number; count: number }
        manual: { total: number; count: number }
    }
    onAttributeClick?: () => void  // Scroll to attribution list or open dialog
}
```

---

## File Manifest

### New Files (10)

| # | File | Purpose |
|---|------|---------|
| 1 | `app/api/rooms/[roomId]/transactions/bulk/route.ts` | Bulk create shared transactions |
| 2 | `app/api/rooms/[roomId]/transactions/[txId]/splits/route.ts` | Replace splits for a transaction |
| 3 | `app/api/rooms/[roomId]/transactions/browse/route.ts` | Browse personal txns for import |
| 4 | `app/api/rooms/[roomId]/transactions/parse-receipt/route.ts` | Upload + parse receipt (no DB write) |
| 5 | `app/api/rooms/[roomId]/transactions/parse-statement/route.ts` | Upload + parse statement (no DB write) |
| 6 | `components/rooms/add-to-room-dialog.tsx` | Multi-step add dialog |
| 7 | `components/rooms/attribution-step.tsx` | Attribution UI (shared step 3) |
| 8 | `components/rooms/browse-transactions-step.tsx` | Personal tx browser (step 2a) |
| 9 | `app/rooms/[roomId]/_page/components/RoomAttributionList.tsx` | Transaction list with attribution |
| 10 | `app/rooms/[roomId]/_page/components/RoomTransactionEditSheet.tsx` | Inline edit attribution for single tx |

### Modified Files (7)

| # | File | Change |
|---|------|--------|
| 1 | `lib/rooms/split-validation.ts` | Allow empty splits array |
| 2 | `app/api/rooms/[roomId]/transactions/route.ts` | Relax Zod schema, add receipt_items + source_type |
| 3 | `app/api/rooms/[roomId]/bundle/route.ts` | Add unattributed stats + source breakdown |
| 4 | `app/rooms/[roomId]/page.tsx` | Wire Add button + dialog, swap RoomTransactions for RoomAttributionList |
| 5 | `app/rooms/[roomId]/_page/components/RoomBalances.tsx` | Add unattributed card + source breakdown |
| 6 | `app/rooms/[roomId]/_page/components/RoomHeader.tsx` | Add "Add Transactions" button |
| 7 | `lib/types/rooms.ts` | Add `SourceType`, extend `RoomBundleSummary` type |

### Reused (no changes)

| File | Reuse |
|------|-------|
| `lib/receipts/ingestion/parseReceiptFile.ts` | Receipt OCR + parsing |
| `lib/parsing/parseCsvToRows.ts` | CSV → TxRow[] |
| `lib/rooms/balances.ts` | Balance calc (unchanged — naturally skips unattributed) |
| `lib/rooms/permissions.ts` | Room membership checks |
| `lib/friends/limits.ts` | `checkSharedTxLimit()` |
| `lib/cache/upstash.ts` | `invalidateRoomCache()` |
| `components/file-upload-01.tsx` | Receipt upload UI |
| `components/file-upload-statement.tsx` | Statement upload UI |

---

## DB Migration SQL

```sql
-- No schema changes required.
-- The existing tables fully support this feature:
--   shared_transactions.metadata (jsonb) → stores source_type
--   shared_transactions.original_tx_id → links to personal transactions
--   receipt_items → line items for receipts
--   transaction_splits.item_id → item-level attribution
--
-- The only change is relaxing the API validation (splits.min(1) → default([]))
-- and using metadata->>'source_type' for filtering.
--
-- Optional: Add a partial index for unattributed query performance
-- (only needed if rooms grow to 10K+ transactions)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_shared_tx_unattributed
ON shared_transactions(room_id)
WHERE id NOT IN (SELECT DISTINCT shared_tx_id FROM transaction_splits);
-- NOTE: This index won't auto-update. Use the NOT EXISTS subquery approach instead.
-- The existing idx_splits_shared_tx index is sufficient for the NOT EXISTS pattern.
```

---

## Risk Matrix

| Risk | Severity | Probability | Mitigation |
|------|----------|-------------|------------|
| Receipt OCR fails / returns bad items | HIGH | MEDIUM | Show editable items list; user can fix names/amounts before saving. Add "Manual entry" fallback. |
| Statement parsing fails for unusual bank format | HIGH | MEDIUM | Existing `parseCsvToRows` handles 10+ date formats and delimiters. Show diagnostics + warnings. Allow user to skip bad rows. |
| Bulk insert of 100 txns hits plan limit mid-batch | MEDIUM | LOW | Check limit upfront: `current + batch_size <= max`. If over, return error with remaining slots. Allow partial import. |
| Item-level splits don't sum to receipt total | MEDIUM | LOW | Validate in API: sum of item splits ≤ item amount. Allow "unattributed remainder" naturally. |
| Large receipt (50+ items) makes attribution step unwieldy | MEDIUM | MEDIUM | Add "Select All → Mine" and "Select All → Equal Split" bulk actions. Pagination for 20+ items. |
| Concurrent edits to same transaction's splits | LOW | LOW | Last-write-wins (full replace). Room cache invalidation ensures fresh data on next load. |
| Performance: NOT EXISTS subquery on large rooms | LOW | LOW | `idx_splits_shared_tx` index makes this fast even at 10K transactions. |

---

## Verification Checklist

### Phase 1 (Backend)
- [ ] `validateSplits([])` returns empty array (no throw)
- [ ] `POST /api/rooms/[roomId]/transactions` accepts `splits: []`
- [ ] `POST /api/rooms/[roomId]/transactions` accepts `receipt_items` array
- [ ] `POST /api/rooms/[roomId]/transactions/bulk` creates N transactions in one call
- [ ] `PUT /api/rooms/[roomId]/transactions/[txId]/splits` replaces splits
- [ ] `PUT /api/rooms/[roomId]/transactions/[txId]/splits` with `splits: []` makes tx unattributed
- [ ] `GET /api/rooms/[roomId]/transactions/browse` returns personal txns, excludes already-imported
- [ ] Room bundle includes `unattributedTotal`, `unattributedCount`, `sourceBreakdown`
- [ ] Transaction list includes `splits`, `items`, `is_attributed`, `source_type`
- [ ] Plan limits enforced on bulk creates

### Phase 2 (Import Pipelines)
- [ ] `POST .../parse-receipt` accepts image/PDF, returns parsed items
- [ ] `POST .../parse-statement` accepts CSV/PDF/XLSX, returns parsed rows
- [ ] Neither endpoint writes to DB — parsing only
- [ ] Deterministic parsers (Mercadona, Consum, Dia) work for receipts
- [ ] CSV delimiter detection works for semicolon-separated European banks

### Phase 3 (Add to Room Dialog)
- [ ] Source selection shows 3 cards
- [ ] "My Txns" step: search, date filter, multi-select, import count
- [ ] Receipt step: drag-drop, OCR loading state, editable items
- [ ] Statement step: drag-drop, parsed rows with select/deselect
- [ ] Attribution step: Mine/Split/Other/Skip per item
- [ ] Split sub-UI: member checkboxes, equal/custom toggle, amounts
- [ ] Summary footer: per-member totals + unattributed total
- [ ] "Save" creates correct API calls, closes dialog, shows toast, refreshes data

### Phase 4 (Attribution List)
- [ ] Filter tabs: All / Unattributed with counts
- [ ] Source icons match source_type
- [ ] Attribution chips show assigned users
- [ ] "Edit" button opens inline editor
- [ ] Receipt/statement rows are expandable to show items
- [ ] Empty state when no transactions

### Phase 5 (Balances)
- [ ] Unattributed card shows total + count
- [ ] "Attribute Now" button scrolls or opens dialog
- [ ] Source breakdown shows 4 categories with totals
- [ ] Member balances still correct (unchanged logic)

### Build & Security
- [ ] `npm run build` passes clean
- [ ] All new API routes call `getCurrentUserId()`
- [ ] All new API routes call `verifyRoomMember()`
- [ ] All queries use parameterized `$1, $2` placeholders
- [ ] File uploads validate MIME type and size
- [ ] No N+1 queries (batch fetch splits + items)
- [ ] Room cache invalidated after all mutations

---

## Implementation Order

**Recommended execution sequence:**

```
Phase 1.1  →  Modify split validation (5 min)
Phase 1.2  →  Modify transaction creation schema (15 min)
Phase 1.3  →  Bulk create endpoint (30 min)
Phase 1.4  →  Update splits endpoint (20 min)
Phase 1.5  →  Browse personal txns endpoint (20 min)
Phase 1.6  →  Update room bundle (15 min)
Phase 1.7  →  Update transaction list response (20 min)
        ↓
Phase 2.1  →  Parse receipt endpoint (30 min)
Phase 2.2  →  Parse statement endpoint (20 min)
        ↓
Phase 3    →  Add to Room Dialog (multi-step) (2-3 hours)
        ↓
Phase 4    →  Attribution List component (1-2 hours)
        ↓
Phase 5    →  Updated Balances component (30 min)
        ↓
        Build + Verify
```

Total estimated effort: **6-8 hours of implementation**
