# Hybrid Import Pipeline v2 — Complete Documentation

**Objective**: Upgrade the transaction import pipeline to improve categorization accuracy and UX by introducing a two-stage enrichment process: simplify description (rules-first, AI fallback) → categorize using simplified description (AI).

**Created**: 2025-12-31  
**Status**: ✅ **READY FOR IMPLEMENTATION** - Comprehensive analysis complete, no breaking changes found  
**Target Version**: v2_hybrid  
**Risk Assessment**: 🟢 **LOW-MEDIUM** (85% confidence)

---

## 📑 Table of Contents

### Part I: Quick Reference Summary
1. [What Is This?](#what-is-this)
2. [Key Constraints](#key-constraints)
3. [File Structure](#file-structure)
4. [Implementation Phases](#implementation-phases)
5. [Quick Start Commands](#quick-start-commands)
6. [Example Transaction Flow](#example-transaction-flow)

### Part II: Implementation Plan
7. [Database Changes](#database-changes)
8. [Current Architecture Analysis](#current-architecture-analysis)
9. [Implementation Roadmap](#implementation-roadmap)
10. [Detailed Implementation Steps](#detailed-implementation-steps)
11. [Testing Plan](#testing-plan)
12. [Rollout Strategy](#rollout-strategy)

### Part III: Impact Analysis
13. [Executive Summary](#executive-summary)
14. [Database Schema Impact](#database-schema-impact)
15. [TypeScript Type Changes](#typescript-type-changes)
16. [Import Pipeline Impact](#import-pipeline-impact)
17. [User-Facing Features Impact](#user-facing-features-impact)
18. [Analytics & Reporting Impact](#analytics--reporting-impact)
19. [Receipt Processing Impact](#receipt-processing-impact)
20. [Performance & Scalability](#performance--scalability)
21. [Backward Compatibility](#backward-compatibility)
22. [Deployment Plan](#deployment-plan)
23. [Rollback Plan](#rollback-plan)
24. [Risk Assessment](#risk-assessment)

### Part IV: Technical Reference
25. [Merchant Rules Coverage](#merchant-rules-coverage)
26. [Transfer Name Extraction](#transfer-name-extraction)
27. [AI Cost Estimation](#ai-cost-estimation)
28. [Troubleshooting Guide](#troubleshooting-guide)

---

# Part I: Quick Reference Summary

## What Is This?

A two-stage transaction enrichment pipeline that improves categorization accuracy:

1. **Stage 1: Simplify** description (rules-first, AI fallback)
   - Sanitize sensitive data (cards, IBANs, phones)
   - Match against 80+ merchant patterns
   - Extract transfer names (e.g., "Bizum Juan")
   - AI fallback for unknown merchants
   - **Store in**: `simplified_description` column

2. **Stage 2: Categorize** using simplified description
   - Use simplified as primary signal
   - Batch AI categorization
   - **Store in**: `category_id` column + metadata

### Pipeline Flow

```
Current v1:
Upload → Parse → Normalize → AI Categorize → DB Insert

New v2:
Upload → Parse → Normalize → Sanitize → Rule Simplify → AI Simplify (fallback)
  → persist simplified_description → AI Categorize (from simplified) → DB Insert
```

---

## Key Constraints

- ✅ **ONLY ONE DB COLUMN**: Add `simplified_description` to transactions table
- ✅ **NO OTHER COLUMNS**: All metadata in existing JSON field (`raw_csv_row`)
- ✅ **PRESERVE RAW**: Keep existing `description` column unchanged (raw bank description)
- ✅ **SANITIZE FIRST**: Never send sensitive data (cards, IBANs, phones) to AI
- ✅ **AUDIT TRAIL**: Track simplification + categorization source/confidence

---

## File Structure

### New Files to Create (7 files)

```
lib/ai/
  ├── sanitize-description.ts          # Masks sensitive data
  ├── rule-simplify.ts                 # Rule-based merchant matching
  ├── ai-simplify.ts                   # AI fallback for unknown merchants
  
__tests__/lib/
  ├── sanitize-description.test.ts     # Unit tests for sanitization
  ├── rule-simplify.test.ts            # Unit tests for rule matching
  ├── ai-simplify.test.ts              # Unit tests for AI simplification
  
__tests__/integration/
  └── import-pipeline-v2.test.ts       # Full pipeline integration test
  
prisma/migrations/
  └── 20250101_add_simplified_description/
      └── migration.sql                # DB migration
```

### Files to Modify (6 files)

```
prisma/schema.prisma                   # Add simplifiedDescription field
lib/types/transactions.ts              # Add TxRow.simplifiedDescription
lib/ai/categoriseTransactions.ts       # Add aiCategorizeBatch() function
app/api/statements/parse/route.ts      # Integrate simplify + categorize
app/api/statements/import/route.ts     # Add simplified_description to insert
components/csv-review-dialog.tsx       # Show simplified description preview
```

**Total LOC Impact**: ~800-1000 new lines, ~150 modified lines

---

## Implementation Phases

### Phase 1: Foundation (Days 1-2)
- [ ] Run database migration
- [ ] Update TypeScript types
- [ ] Create `sanitize-description.ts` (100 lines)
- [ ] Create `rule-simplify.ts` (200 lines)
- [ ] Write unit tests (300 lines)

### Phase 2: AI Integration (Days 3-5)
- [ ] Create `ai-simplify.ts` (150 lines)
- [ ] Add `aiCategorizeBatch()` to categoriseTransactions.ts (200 lines)
- [ ] Write unit tests (200 lines)
- [ ] Test with OpenRouter API

###  Phase 3: Pipeline Integration (Days 6-7)
- [ ] Integrate into parse route (+150 lines)
- [ ] Integrate into import route (+50 lines)
- [ ] Update UI review dialog (+30 lines)
- [ ] Add batching + caching

### Phase 4: Testing (Days 8-10)
- [ ] Run all unit tests (pass rate target: 100%)
- [ ] Run integration tests (1000+ transactions)
- [ ] Manual testing with real CSVs
- [ ] Performance benchmarking (\<60s for 1000 txns)

### Phase 5: Deployment (Day 11)
- [ ] Deploy to staging
- [ ] Beta test with 10% users
- [ ] Gradual rollout (25% → 50% → 75% → 100%)
- [ ] Monitor AI costs + accuracy

---

## Quick Start Commands

### 1. Database Migration

```bash
# Create migration file
mkdir -p prisma/migrations/20250101_add_simplified_description
cat > prisma/migrations/20250101_add_simplified_description/migration.sql <<EOF
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS simplified_description VARCHAR(255);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transactions_simplified_description 
ON transactions(simplified_description);

COMMENT ON COLUMN transactions.simplified_description IS 
'Simplified merchant/label generated by hybrid pipeline v2';
EOF

# Apply migration
npx prisma db push
npx prisma generate
```

### 2. Run Tests

```bash
# Unit tests
npm test -- sanitize-description
npm test -- rule-simplify
npm test -- ai-simplify

# Integration tests
npm test -- import-pipeline-v2
```

### 3. Local Testing

```bash
# Start dev server
npm run dev

# Upload test CSV with these descriptions:
# - "COMPRA MERCADONA VALENCIA CARD*1234"
# - "BIZUM A SR JUAN PEREZ REF:123456789012"
# - "TRANSFERENCIA SEPA ES9121000418450200051332"
# - "COMISION MANTENIMIENTO CUENTA"
# - "COMPRA WWW.AMAZON.ES AUTH:CW4WE8Q35"

# Expected simplified descriptions:
# - "Mercadona"
# - "Bizum Juan"
# - "Transfer"
# - "Bank Fee"
# - "Amazon"
```

---

## Example Transaction Flow

### Input (Raw CSV)
| Date | Description | Amount |
|------|-------------|--------|
| 2025-01-15 | COMPRA MERCADONA VALENCIA CARD*1234 | -45.20 |
| 2025-01-14 | BIZUM A SR JUAN PEREZ REF:123456789012 | -20.00 |
| 2025-01-13 | COMPRA WWW.AMAZON.ES AUTH:CW4WE8Q35 | -89.99 |
| 2025-01-12 | COMISION MANTENIMIENTO CUENTA | -5.00 |

### Pipeline Processing

**1. Sanitize** (remove sensitive data):
- `COMPRA MERCADONA VALENCIA CARD*1234` → `COMPRA MERCADONA VALENCIA CARD`
- `BIZUM A SR JUAN PEREZ REF:123456789012` → `BIZUM A SR JUAN PEREZ REF`
- `COMPRA WWW.AMAZON.ES AUTH:CW4WE8Q35` → `COMPRA WWW.AMAZON.ES AUTH`
- `COMISION MANTENIMIENTO CUENTA` → (unchanged)

**2. Rule Simplify** (80%+ match rate):
- Mercadona → **"Mercadona"** (merchant rule, confidence 0.95)
- Bizum → **"Bizum Juan"** (transfer rule, confidence 0.85) *First name extracted!*
- Amazon → **"Amazon"** (merchant rule, confidence 0.95)
- Comision → **"Bank Fee"** (operation rule, confidence 0.8)

**3. AI Categorize** (using simplified descriptions):
- "Mercadona" → **Groceries** (confidence 0.95)
- "Bizum Juan" → **Transfers** (confidence 0.9)
- "Amazon" → **Home Goods** (confidence 0.85)
- "Bank Fee" → **Bank Fees** (confidence 0.95)

### Output (Database)
| description | simplified_description | category | metadata JSON |
|-------------|------------------------|----------|---------------|
| COMPRA MERCADONA... | Mercadona | Groceries | `{pipeline_version: "v2_hybrid", simplify: {source: "rules", confidence: 0.95}, ...}` |
| BIZUM A SR JUAN... | Bizum Juan | Transfers | `{pipeline_version: "v2_hybrid", simplify: {source: "rules", confidence: 0.85}, ...}` |
| COMPRA WWW.AMAZON... | Amazon | Home Goods | `{pipeline_version: "v2_hybrid", simplify: {source: "rules", confidence: 0.95}, ...}` |
| COMISION... | Bank Fee | Bank Fees | `{pipeline_version: "v2_hybrid", simplify: {source: "rules", confidence: 0.8}, ...}` |

---

# Part II: Implementation Plan

## Database Changes

### Migration SQL

**File**: `prisma/migrations/20250101_add_simplified_description/migration.sql`

```sql
-- Add simplified_description column to transactions table
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS simplified_description VARCHAR(255);

-- Add index for merchant search/filter (use CONCURRENTLY to avoid locks)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transactions_simplified_description 
ON transactions(simplified_description);

-- Add documentation comment
COMMENT ON COLUMN transactions.simplified_description IS 
'Simplified merchant/label (e.g., "Amazon", "Transfer Juan", "Bank Fee"). Generated by hybrid pipeline v2.';
```

### Updated Prisma Schema

**File**: `prisma/schema.prisma`

```prisma
model Transaction {
  id                    Int       @id @default(autoincrement())
  userId                String    @map("user_id")
  statementId           Int?      @map("statement_id")
  txDate                DateTime  @map("tx_date") @db.Date
  txTime                DateTime? @map("tx_time") @db.Time()
  description           String    // Raw bank description (unchanged)
  simplifiedDescription String?   @map("simplified_description") // NEW
  amount                Decimal   @db.Decimal(12, 2)
  balance               Decimal?  @db.Decimal(12, 2)
  categoryId            Int?      @map("category_id")
  currency              String    @default("EUR")
  rawCsvRow             Json?     @map("raw_csv_row") // Contains v2 metadata
  createdAt             DateTime  @default(now()) @map("created_at")
  updatedAt             DateTime  @updatedAt @map("updated_at")

  user                  User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId], name: "idx_transactions_user")
  @@index([userId, txDate(sort: Desc)], name: "idx_transactions_user_date")
  @@index([simplifiedDescription], name: "idx_transactions_simplified_description") // NEW
  @@map("transactions")
}
```

### Metadata Schema

**Stored in `raw_csv_row` JSON field**:

```typescript
interface TransactionMetadata {
  pipeline_version: "v2_hybrid";
  sanitized_description: string;
  simplify: {
    source: "rules" | "ai";
    confidence: number; // 0.0 - 1.0
    matched_rule?: string; // e.g., "merchant:mercadona", "transfer:bizum"
    type_hint?: "merchant" | "transfer" | "fee" | "atm" | "salary" | "refund" | "other";
  };
  categorize: {
    source: "ai" | "manual" | "preference";
    confidence: number;
    model?: string; // AI model used
  };
  errors?: string[]; // Any errors encountered
  
  // Original CSV row data (preserving existing behavior)
  date?: string;
  time?: string;
  description?: string;
  amount?: number;
  balance?: number;
  category?: string;
}
```

---

## Current Architecture Analysis

### Key Systems & Their Roles

#### 1. Import Pipeline Entry Points

| File | Role | Modification Needed |
|------|------|---------------------|
| `app/api/statements/parse/route.ts` | Parses CSV/PDF/XLSX → canonical CSV | ⚠️ MAJOR: Add sanitization + simplification |
| `app/api/statements/import/route.ts` | Imports CSV → DB | ✅ MINOR: Add `simplified_description` to insert |
| `components/file-upload-csv.tsx` | Upload UI | ✅ NONE: No changes |
| `components/csv-review-dialog.tsx` | Review before import | ✅ MINOR: Preview simplified descriptions |

#### 2. AI Categorization System

| File | Current Function | Modification Needed |
|------|------------------|---------------------|
| `lib/ai/categoriseTransactions.ts` | AI categorization (1404 lines) | ⚠️ MAJOR: Split into simplify + categorize |

**Reuse Opportunities**:
- ✅ `MERCHANT_PATTERNS` (295 line) → basis for rule simplification
- ✅ Existing batching logic
- ✅ OpenRouter API integration
- ❌ Current: categorizes from raw description (needs update)

#### 3. Critical Finding: `summary` Field Already Exists!

**Current `TxRow` Type** (`lib/types/transactions.ts`):
```typescript
export type TxRow = {
    date: string;
    time?: string | null;
    description: string;
    amount: number;
    balance: number | null;
    category?: string;
    summary?: string;  // ⚠️ ALREADY EXISTS!
};
```

**Current Usage**:
1. Generated in `lib/ai/categoriseTransactions.ts:1111` via `extractSummary()`
2. Used in AI prompts as "description" field
3. Persisted in canonical CSV (but NOT in database)

**✅ DECISION**: Replace `summary` → `simplifiedDescription` globally
- **Impact**: LOW (internal field only, not in DB)
- **Migration**: Rename all references
- **Benefit**: Cleaner codebase, no confusion

---

## Implementation Roadmap

### Phase 1: Foundation (Days 1-2)
**Goal**: Database ready, core utilities created

- [x] Design complete
- [ ] Database migration executed
- [ ] TypeScript types updated
- [ ] Sanitization utility created + tested
- [ ] Rule simplification utility created + tested

**Deliverables**:
- Migration SQL file
- `lib/ai/sanitize-description.ts` (~100 lines)
- `lib/ai/rule-simplify.ts` (~200 lines)
- Test files (~300 lines)
- Updated `lib/types/transactions.ts`

---

### Phase 2: Core Logic (Days 3-5)
**Goal**: AI integration complete

- [ ] AI simplify utility created
- [ ] AI categorize function added
- [ ] Transfer name extraction working
- [ ] All unit tests passing

**Deliverables**:
- `lib/ai/ai-simplify.ts` (~150 lines)
- Updated `lib/ai/categoriseTransactions.ts` (+200 lines)
- Test files (~200 lines)

---

### Phase 3: Integration (Days 6-7)
**Goal**: End-to-end pipeline working

- [ ] Parse route integrated
- [ ] Import route integrated
- [ ] UI review dialog updated
- [ ] Batching + caching implemented

**Deliverables**:
- Updated `app/api/statements/parse/route.ts` (+150 lines)
- Updated `app/api/statements/import/route.ts` (+50 lines)
- Updated `components/csv-review-dialog.tsx` (+30 lines)

---

### Phase 4: Testing & Refinement (Days 8-10)
**Goal**: Production-ready quality

- [ ] All unit tests passing (100%)
- [ ] Integration test passing (1000+ txns)
- [ ] Manual testing with real data
- [ ] Performance benchmarks met

**Acceptance Criteria**:
- Import 1000 transactions in \<60 seconds
- Rule coverage \>80%
- Categorization accuracy \>90%
- AI cost \<$1 per 1000 transactions
- No sensitive data leaked to AI

---

### Phase 5: Deployment (Day 11)
**Goal**: Safe production rollout

- [ ] Feature flag setup
- [ ] Staging deployment
- [ ] Beta test (10% users)
- [ ] Gradual rollout
- [ ] Monitoring active

**Rollout Schedule**:
- Day 11: Deploy to staging
- Day 12-13: Beta (10% users, monitor closely)
- Day 14: Expand to 25%
- Day 16: Expand to 50%
- Day 18: Expand to 75%
- Day 20: Full rollout (100%)

---

## Detailed Implementation Steps

For complete step-by-step implementation code (Steps 1-9), see:
- **Sanitization**: Page 314-438 in original plan
- **Rule Simplification**: Page 442-764 in original plan
- **AI Simplify**: Page 768-900 in original plan
- **AI Categorize**: Lines 900-1100 in original plan
- **Parse Route Integration**: See Part III, Section 16.3
- **Import Route Integration**: See Part III, Section 16.3
- **UI Updates**: See Part III, Section 17.3

---

## Testing Plan

### Unit Tests Required

**File**: `__tests__/lib/sanitize-description.test.ts`
```typescript
✅ Card number masking (TARJ*1234, CARD 5678)
✅ IBAN masking (ES9121000418450200051332)
✅ Phone number masking (+34 123 456 789)
✅ Authorization code masking (AUTH:ABC123)
✅ Long numeric sequence masking
✅ Merchant name preservation
```

**File**: `__tests__/lib/rule-simplify.test.ts`
```typescript
✅ Merchant pattern matching (80+ patterns)
✅ Transfer detection (Bizum, SEPA, P2P)
✅ Name extraction with honorifics (Mr, Mrs, Sr, Sra, Don, Doña)
✅ Operation detection (fee, ATM, salary, refund)
✅ Confidence scoring
✅ Fallback behavior (returns null for unknown)
```

**File**: `__tests__/lib/ai-simplify.test.ts`
```typescript
✅ Batch processing (100 items)
✅ Strict JSON response parsing
✅ Error handling (API failures)
✅ Retry logic
✅ Cost tracking
```

### Integration Tests

**File**: `__tests__/integration/import-pipeline-v2.test.ts`

**Test Scenarios**:
1. Full import flow (100 transactions)
2. Rule coverage (known merchants → 80%+ match)
3. AI fallback (unknown merchants)
4. Transfer handling (Bizum Juan extraction)
5. Privacy verification (sanitization audit)
6. Preference override (user preferences win)
7. Performance (1000 txns \<60s)

---

## Rollout Strategy

### Pre-Deployment Checklist

- [ ] All tests passing
- [ ] Code review complete
- [ ] Database migration tested on staging
- [ ] Feature flag configured
- [ ] Monitoring dashboards ready
- [ ] Rollback plan documented

### Deployment Steps

**Step 1: Database Migration** (Off-peak hours)
```bash
# Run on production
npx prisma db push --skip-generate

# Verify
psql $DATABASE_URL -c "SELECT column_name FROM information_schema.columns WHERE table_name = 'transactions' AND column_name = 'simplified_description';"
```

**Step 2: Deploy Code** (with feature flag OFF)
```typescript
// .env.production
ENABLE_HYBRID_PIPELINE_V2=false

// Feature flag check in parse route
const useV2Pipeline = process.env.ENABLE_HYBRID_PIPELINE_V2 === 'true';
```

**Step 3: Gradual Rollout**
```
Day 1: 10% users  → Monitor for 48h
Day 3: 25% users  → Monitor for 48h
Day 5: 50% users  → Monitor for 48h
Day 7: 75% users  → Monitor for 48h
Day 10: 100% users → Full rollout
```

**Step 4: Monitoring**
- AI costs (OpenRouter dashboard)
- Import success rate
- Categorization accuracy (sample review)
- User complaints
- Performance metrics

---

# Part III: Impact Analysis

## Executive Summary

✅ **SAFE TO IMPLEMENT** - The proposed changes are **non-breaking** with proper migration strategy.

### Key Findings

| Risk Area | Impact Level | Mitigation |
|-----------|--------------|------------|
| Database Schema | 🟢 LOW | Additive change only (new column) |
| Existing Transactions | 🟢 LOW | NULL values handled gracefully |
| UI Components | 🟡 MEDIUM | Need to handle NULL `simplified_description` |
| Category Preferences | 🟢 LOW | Uses `description`, not affected |
| Receipt Processing | 🟢 NONE | Separate pipeline |
| Analytics/Charts | 🟢 LOW | Data availability unaffected |
| AI Costs | 🟡 MEDIUM | Need cost controls |
| Manual Entry | 🟡 MEDIUM | Minor UI changes needed |
| Search/Filtering | 🟡 MEDIUM | Optional enhancement |

**Overall Risk Level**: 🟢 **LOW-MEDIUM**  
**Confidence Level**: **85%** ✅

---

## Database Schema Impact

### Current Schema
- ✅ **12 columns** in transactions table
- ✅ **2 indexes** on user_id and (user_id, tx_date)
- ✅ **JSON metadata** in `raw_csv_row` (flexible schema)

### Migration Impact
- ✅ **Non-breaking**: Adds nullable column
- ✅ **Backward compatible**: Old code continues to work
- ✅ **Performance**: Index improves search, doesn't block queries
- ⚠️ **Disk space**: +255 bytes × row count (negligible for \<10M rows)
- ⚠️ **Migration time**: ~1-2 minutes per 1M rows (CONCURRENT index)

### Queries Affected
**Found**: 2 occurrences in `lib/limits/transactions-cap.ts`
- ✅ **Impact**: NONE (using SELECT * or specific columns, new column auto-included)

---

## TypeScript Type Changes

### Key Decision: `summary` → `simplifiedDescription`

**Current** (lib/ai/categoriseTransactions.ts:1111):
```typescript
const summary = extractSummary(r.description);  // Generates merchant name
description: r.summary || r.description         // Used in AI prompt
```

**New v2**:
```typescript
const simplifiedDescription = await simplify(r.description);  // Rules + AI
description: r.simplifiedDescription || r.description
```

**Migration Path**:
1. Add `simplifiedDescription` field to `TxRow`
2. Deprecate `summary` (add @deprecated comment)
3. Update all references (6 files affected)
4. Remove `summary` in cleanup phase

**✅ Impact**: LOW (internal field, not persisted to DB)

---

## Import Pipeline Impact

### Current Flow (v1)
```
1. Parse CSV → TxRow[]
2. extractSummary(description) → summary
3. AI categorize (using summary)
4. Insert to DB (description + category_id)
```

### New Flow (v2)
```
1. Parse CSV → TxRow[]
2. sanitize(description) → sanitized
3. ruleSimplify(sanitized) → 80% get simplified_description
4. aiSimplify(remaining 20%) → simplified_description
5. aiCategorize(simplified_description) → category
6. Insert to DB (description + simplified_description + category_id + metadata)
```

### Code Changes Required

**File: `app/api/statements/parse/route.ts`**
- Lines added: ~150
- Complexity: HIGH (new logic flow)
- Risk: MEDIUM (comprehensive testing needed)

**File: `app/api/statements/import/route.ts`**
- Lines added: ~50
- Complexity: LOW (column addition, metadata structure)
- Risk: LOW (straightforward)

---

## User-Facing Features Impact

### 4.1 Transaction Category Preferences ✅ NONE

**System**: `lib/transactions/transaction-category-preferences.ts`

**Analysis**:
- Preferences key off RAW description (via `normalizeTransactionDescriptionKey`)
- v2 pipeline checks preferences BEFORE simplification
- **No code changes needed**

**Integration Order**:
```
1. Check preference (by raw description) → if match, use it, skip AI
2. If no preference → sanitize → simplify → categorize
```

✅ **No breaking changes to preference system**

---

### 4.2 Manual Transaction Entry ⚠️ MINOR CHANGES

**Component**: `components/transaction-dialog.tsx`

**Required Changes**:
```typescript
// Add client-side simplification
import { sanitizeDescription } from "@/lib/ai/sanitize-description";
import { ruleSimplifyDescription } from "@/lib/ai/rule-simplify";

const handleSubmit = async () => {
    const sanitized = sanitizeDescription(formData.description);
    const ruleResult = ruleSimplifyDescription(sanitized);
    const simplifiedDescription = ruleResult.simplified || sanitized.substring(0, 50);
    
    await fetch("/api/transactions", {
        body: JSON.stringify({
            ...formData,
            simplified_description: simplifiedDescription,  // NEW
        }),
    });
};
```

**Impact**:
- ⚠️ Code changes: ~20 lines
- ⚠️ Client bundle: +5KB (sanitization utilities)
- ✅ Non-breaking: Field is optional

---

### 4.3 Transaction Display (UI) ⚠️ MEDIUM CHANGES

**Components to Update** (~10-15 files):
- `app/home/_page/components/MemoizedTableRow.tsx`
- Transaction lists in Analytics, Savings, Trends
- CSV review dialog

**Recommended Pattern**:
```tsx
// Option 1: Simple fallback
{row.simplifiedDescription || row.description}

// Option 2: Show both (tooltip)
<div className="truncate" title={`Raw: ${row.description}`}>
    {row.simplifiedDescription || row.description}
</div>

// Option 3: Info icon
{row.simplifiedDescription && (
    <Tooltip content={`Raw: ${row.description}`}>
        <InfoIcon />
    </Tooltip>
)}
```

**Impact**:
- ⚠️ UI updates: ~10-15 components
- ✅ Gradual rollout: Can enable per-page
- ✅ Non-breaking: Fallback to raw if NULL

---

## Analytics & Reporting Impact

### Chart Aggregations ✅ NONE

**Analysis**: Charts aggregate by `category`, not `description`
- ✅ All existing queries continue to work unchanged
- ✅ No performance degradation
- ✅ Optional: Add "Top Merchants" chart using `simplified_description`

### Sub-Category Logic ✅ IMPROVEMENT

**Current** (`app/home/_page/utils/categories.ts`):
```typescript
export const getSubCategoryLabel = (description?: string) => {
  const delimiterSplit = description.split(/[-|]/)[0] ?? description;
  return delimiterSplit.trim();  // Returns "COMPRA MERCADO"
}
```

**Recommended Enhancement**:
```typescript
export const getSubCategoryLabel = (description?: string, simplified?: string) => {
  const useDescription = simplified || description;
  const delimiterSplit = useDescription.split(/[-|]/)[0] ?? useDescription;
  return delimiterSplit.trim();  // Returns "Mercadona" (cleaner!)
}
```

---

## Receipt Processing Impact

✅ **ZERO INTERACTION**

**Confirmation**:
- Receipts use `receipt_transactions` table (separate)
- Different categorization system (receipt categories)
- No shared code paths with transaction import
- Receipt processing does NOT call `categoriseTransactions()`

✅ **No changes needed for receipt processing**

---

## Performance & Scalability

### Database Performance

**Existing Indexes**:
```sql
idx_transactions_user
idx_transactions_user_date
```

**New Index**:
```sql
idx_transactions_simplified_description (CONCURRENT)
```

**Impact**:
- ✅ Write: Minimal impact (one more index)
- ✅ Read: IMPROVED (merchant-based queries)
- ⚠️ Disk: +1-2% overhead
- ⚠️ Migration: ~1-2 min per 1M rows

---

### AI Cost Analysis

**Current (v1)**: $0.50 per 1000 transactions (categorization only)

**New (v2)**:
| Stage | Coverage | Cost per 1K txns |
|-------|----------|------------------|
| Sanitization | 100% | $0 (local) |
| Rule simplify | 80% match | $0 (local) |
| AI simplify | 20% fallback | $0.15 |
| AI categorize | 100% | $0.40 |
| **Total** | - | **$0.55** |

**With Caching** (repeat imports):
- First import: $0.55
- Repeat: **$0.10** (80% savings!)

**Optimization Strategies**:
1. Hash-based caching (same merchant = cached)
2. Batch processing (100-150 items/call)
3. Rate limiting (max 10K txns/user/day)

---

### Import Speed

**Current**:
- 100 transactions: ~10 seconds
- 1000 transactions: ~50 seconds

**New v2 (estimated)**:
- 100 transactions: ~12 seconds (+20%)
- 1000 transactions: ~60 seconds (+20%)

**Mitigation**:
- Parallel processing where possible
- Progress indicators
- Background jobs for \>1000 txns

✅ **Acceptable tradeoff** for accuracy improvement

---

## Backward Compatibility

### Existing Transactions (NULL `simplified_description`)

**Scenario**: User has 10,000 pre-v2 transactions

**Database State**:
```sql
description           | simplified_description | category_id
COMPRA MERCADONA...   | NULL                  | 5 (Groceries)
BIZUM A JUAN...       | NULL                  | 12 (Transfers)
```

**UI Handling**:
```tsx
{row.simplifiedDescription || row.description}
// Result: Displays raw for old, simplified for new
```

✅ **Non-breaking**: Old transactions display correctly

---

### Data Migration (Backfilling)

**Question**: Backfill `simplified_description` for existing transactions?

**Option A - No Backfill** ✅ RECOMMENDED:
- ✅ Simple, fast, no cost
- ⚠️ Mixed data (old = NULL, new = filled)
- **Impact**: Old txns show raw description

**Option B - Selective Backfill** (90 days):
- ✅ Recent data gets simplification
- ⚠️ Costs ~$5 per 10K transactions
- **Impact**: Better UX for recent data

**Option C - Full Backfill**:
- ✅ Complete uniformity
- ❌ Expensive ($50-500), slow (hours)
- **NOT recommended**

**✅ DECISION**: **No backfill** (Option A)
- New imports get v2 benefits
- Old data remains unchanged
- UI handles NULL gracefully

---

## Deployment Plan

### Pre-Deployment (Week -1)

- [ ] Code review complete
- [ ] All tests passing
- [ ] Staging tested (1000+ txns)
- [ ] Performance validated
- [ ] AI costs measured
- [ ] Feature flag ready
- [ ] Monitoring configured
- [ ] Rollback plan documented

### Deployment Steps

**Day 1: Database Migration** (production, off-peak)
```bash
npx prisma db push
# Verify: SELECT simplified_description FROM transactions LIMIT 1;
```

**Day 2-3: Code Deployment** (feature flag OFF)
```bash
# Deploy with flag disabled
ENABLE_HYBRID_PIPELINE_V2=false

# Monitor: No errors, DB column exists
```

**Day 4-10: Gradual Rollout**
```
Day 4: 10% users  (enable flag for 10%)
Day 6: 25% users
Day 8: 50% users
Day 10: 75% users
```

**Day 11-30: Monitoring**
- AI costs tracking
- Categorization accuracy
- User feedback
- Error rates

**Day 31: Full Rollout**
- 100% users
- Remove feature flag
- Clean up old code

---

## Rollback Plan

### Scenario 1: High AI Costs

**Action**: Disable v2 via feature flag
```bash
ENABLE_HYBRID_PIPELINE_V2=false
```
**Impact**: Falls back to v1, no data loss

### Scenario 2: Categorization Issues

**Action**: Adjust prompts, re-tune rules
**Rollback**: Not needed (preferences still work)

### Scenario 3: Import Failures

**Action**: Debug edge case, patch
**Rollback**: Feature flag → v1

### Scenario 4: Database Issues (unlikely)

**Action**: Rollback migration
```sql
ALTER TABLE transactions DROP COLUMN simplified_description;
DROP INDEX idx_transactions_simplified_description;
```
**Impact**: Minimal (column was nullable)

---

## Risk Assessment

### Risk Matrix

| Risk | Probability | Impact | Severity | Mitigation |
|------|------------|--------|----------|------------|
| Migration fails | 🟢 5% | 🟢 LOW | 🟢 **LOW** | Test on staging, use CONCURRENT |
| Performance degrades | 🟡 20% | 🟡 MEDIUM | 🟡 **MEDIUM** | Batching, caching, monitoring |
| AI costs exceed budget | 🟡 30% | 🟡 MEDIUM | 🟡 **MEDIUM** | Rate limits, rule coverage \>80% |
| Accuracy drops | 🟢 10% | 🟡 MEDIUM | 🟢 **LOW** | Extensive testing, preferences preserved |
| UI breaks (old txns) | 🟢 5% | 🟢 LOW | 🟢 **LOW** | Fallback pattern |
| Preferences break | 🟢 2% | 🔴 HIGH | 🟡 **MEDIUM** | No changes to preference logic |
| Receipts break | 🟢 0% | N/A | 🟢 **NONE** | Separate system |

### Overall Assessment

**Risk Level**: 🟢 **LOW-MEDIUM**  
**Confidence**: **85%** ✅  
**Recommendation**: **PROCEED WITH IMPLEMENTATION**

**Why Safe**:
1. ✅ Additive database change (nullable column)
2. ✅ All existing queries continue to work
3. ✅ Preferences system unchanged
4. ✅ Receipts completely separate
5. ✅ UI fallback pattern
6. ✅ Feature flag for rollback
7. ✅ Comprehensive testing plan

**Watch Points**:
1. ⚠️ AI costs (need rate limiting)
2. ⚠️ Import speed (+20%, acceptable)
3. ⚠️ UI updates (15+ components)
4. ⚠️ Testing coverage (must be thorough)

---

# Part IV: Technical Reference

## Merchant Rules Coverage

### Spain-Heavy Merchants (80+ patterns)

**Groceries**: Mercadona, Carrefour, Lidl, DIA, Aldi, Eroski, Alcampo, Hipercor, Consum, Bonpreu

**Online Retail**: Amazon, AliExpress, Shein, eBay, Zalando

**Food Delivery**: Glovo, Just Eat, Uber Eats, Deliveroo, Telepizza

**Transport**: Uber, Cabify, Bolt, Ryanair, Iberia, Renfe, Metro, EMT

**Subscriptions**: Spotify, Netflix, Disney+, HBO Max, Apple, Google, YouTube Premium

**Payment Services**: PayPal, Stripe, Revolut, Wise, Bizum

**Fashion**: Zara, Inditex, H&M, Mango, Primark, Uniqlo

**Department Stores**: El Corte Inglés, Ikea, Decathlon, MediaMarkt, Fnac

**Utilities**: Iberdrola, Endesa, Naturgy, Movistar, Vodafone, Orange

### Operation Rules

**Fees**: COMISION, FEE, GASTOS, CHARGE → "Bank Fee" (confidence: 0.8)  
**ATM**: CAJERO, ATM, RETIRADA, WITHDRAWAL → "ATM Withdrawal" (0.85)  
**Salary**: NOMINA, SALARIO, PAYROLL → "Salary" (0.85)  
**Refund**: DEVOLUCION, REFUND, REVERSO, REVERSAL → "Refund" (0.85)  
**Transfer**: TRANSFERENCIA, TRF, SEPA, BIZUM, P2P → "Transfer \<FirstName\>" (0.8-0.85)

---

## Transfer Name Extraction

### Examples

| Input | Output | Explanation |
|-------|--------|-------------|
| BIZUM A SR JUAN PEREZ | Bizum Juan | SR ignored, PEREZ dropped (surname) |
| TRANSFERENCIA MRS ANNA SMITH | Transfer Anna | MRS ignored, SMITH dropped |
| BIZUM DE DON CARLOS GARCIA | Bizum Carlos | DON ignored, GARCIA dropped |
| SEPA MARIA | Transfer Maria | No honorific, direct name |
| BIZUM (no name) | Bizum | No name found |
| TRANSFERENCIA D. LUIS RODRIGUEZ | Transfer Luis | D. ignored, RODRIGUEZ dropped |

### Honorifics Ignored (Multilingual)

**English**: Mr, Mrs, Ms, Miss, Sir, Madam  
**Spanish**: Sr, Sra, Srta, Don, Doña, D  
**French**: Monsieur, Mme, Mlle  
**Professional**: Dr, Dra, Prof, Ing, Lic

### Algorithm

1. Detect transfer pattern (Bizum, Transferencia, SEPA, P2P)
2. Extract text after pattern
3. Tokenize by whitespace/punctuation
4. Filter out honorifics
5. Take first remaining token
6. Apply title case (Juan, not JUAN)
7. Return "Bizum Juan" or "Transfer Juan"

---

## AI Cost Estimation

### Per Import Session Analysis

**Scenario**: 500 transactions, 300 rules-matched, 200 need AI

| Task | Items | Model | Cost (est.) |
|------|-------|-------|-------------|
| AI Simplify | 200 | claude-3.5-sonnet | $0.15 |
| AI Categorize | 500 | claude-3.5-sonnet | $0.40 |
| **Total (First Import)** | | | **$0.55** |

**With Optimization** (repeat imports, same merchants):
- Caching enabled: 80% hit rate
- Only 100 items need AI: $0.05 (simplify) + $0.05 (categorize) = **$0.10**
- **Savings**: 82%!

### Monthly Cost Projection

**Assumptions**:
- 1000 users
- Average 500 transactions/user/month
- 50% repeat merchants (cached)

**Calculation**:
- First imports: 1000 × $0.55 = $550
- Repeat imports: Cached savings = -$400
- **Net monthly cost**: ~$150-200

**At scale** (10,000 users):
- Optimistic (80% cache): ~$1,500/month
- Pessimistic (50% cache): ~$3,000/month

**Cost Control Measures**:
1. Rate limiting (10K txns/user/day max)
2. Cache TTL (30 days)
3. Batch size optimization (100-150 items)
4. Fallback to rules when AI unavailable

---

## Troubleshooting Guide

### Issue: Simplified description too generic

**Symptoms**: "Payment", "Purchase" instead of merchant names

**Causes**:
- Rule patterns not matching
- AI prompt too broad

**Solutions**:
1. Add more specific merchant patterns to `rule-simplify.ts`
2. Refine AI prompt with examples
3. Lower confidence threshold for rules (0.75 → 0.7)

---

### Issue: AI simplify not called

**Symptoms**: All transactions simplified by rules (unlikely)

**Causes**:
- Rules too broad (matching everything)
- Threshold too low

**Solutions**:
1. Check rule confidence scores
2. Verify threshold logic (should be \>= 0.75)
3. Add debug logging

---

### Issue: Transfer name extraction failing

**Symptoms**: "Transfer" instead of "Transfer Juan"

**Causes**:
- Missing honorific in HONORIFICS set
- Name pattern not matching

**Solutions**:
1. Add missing honorific to `HONORIFICS` set
2. Add name pattern to `namePatterns` array
3. Check tokenization logic

**Example**:
```typescript
// Add to HONORIFICS
"MX", "MME", "HERR", "FRAU" // Mexican, French, German
```

---

### Issue: High AI costs

**Symptoms**: Monthly bill \>$500 for 1000 users

**Causes**:
- Low rule coverage (\<50%)
- No caching
- Large batch sizes

**Solutions**:
1. Increase rule coverage (add merchants)
2. Implement caching (hash-based)
3. Optimize batch size (100-150 optimal)
4. Enable rate limiting

**Debugging**:
```typescript
console.log("Rules matched:", rulesMatchedCount);
console.log("AI simplify called:", aiSimplifyCalls);
console.log("Coverage:", (rulesMatchedCount / total) * 100 + "%");
// Target: >80% rules matched
```

---

### Issue: Sanitization too aggressive

**Symptoms**: Merchant names removed (e.g., "CARD CARD" instead of "COMPRA MERCADONA")

**Causes**:
- Regex too broad
- Wrong order of operations

**Solutions**:
1. Refine regex patterns in `sanitize-description.ts`
2. Test against real examples
3. Add whitelist for known merchants

**Example Fix**:
```typescript
// Before: Removes all "CARD" instances
sanitized = sanitized.replace(/CARD/gi, "");

// After: Only removes card references
sanitized = sanitized.replace(/\b(TARJ|CARD)\s*\*?\d{4}\b/gi, "CARD");
```

---

### Issue: Import failures

**Symptoms**: 500 errors during import, transactions not saved

**Causes**:
- Metadata JSON serialization error
- Database constraint violation
- AI API timeout

**Solutions**:
1. Check logs for specific error
2. Validate metadata schema
3. Add retry logic for AI calls
4. Increase timeout limits

**Debug Checklist**:
- [ ] Database migration successful?
- [ ] `simplified_description` column exists?
- [ ] JSON metadata valid?
- [ ] API keys configured?
- [ ] Network connectivity OK?

---

## Success Criteria

✅ **Accuracy**: 90%+ categorization accuracy (up from ~75%)  
✅ **Coverage**: 80%+ transactions simplified by rules (no AI cost)  
✅ **Speed**: \<10s to process 100 transactions (\<60s for 1000)  
✅ **Privacy**: 100% sensitive data masked before AI  
✅ **UX**: 50% reduction in manual recategorization  
✅ **Cost**: \<$0.60 per 1000 transactions first import, \<$0.15 repeat  
✅ **Reliability**: 99%+ import success rate

---

## Final Recommendations

### ✅ PROCEED WITH IMPLEMENTATION

**Confidence**: 85%  
**Timeline**: 11 days  
**Risk**: LOW-MEDIUM  
**Impact**: HIGH (majorUX/accuracy improvement)

### Implementation Order

1. **Start with Foundation** (Days 1-2)
   - Database migration
   - Core utilities
   - Unit tests

2. **Add AI Integration** (Days 3-5)
   - AI simplify
   - AI categorize
   - More tests

3. **Integrate Pipeline** (Days 6-7)
   - Parse route
   - Import route
   - UI updates

4. **Test Thoroughly** (Days 8-10)
   - All tests
   - Performance
   - Manual QA

5. **Deploy Gradually** (Day 11+)
   - Staging
   - 10% → 25% → 50% → 75% → 100%
   - Monitor closely

### Decision Points

1. **Backfill?** → **NO** (Option A recommended)
2. **`summary` vs `simplifiedDescription`?** → **Replace globally**
3. **Feature flag duration?** → **1 month**
4. **AI budget limit?** → **$5/user/month**

---

**END OF DOCUMENTATION**

**Document Version**: 1.0  
**Last Updated**: 2025-12-31  
**Total Pages**: ~100  
**Total Lines**: ~2500

For questions or clarifications, refer to:
- **Quick Reference**: Part I
- **Implementation**: Part II
- **Impact Analysis**: Part III
- **Technical Details**: Part IV
