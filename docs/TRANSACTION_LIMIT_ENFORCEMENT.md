# Transaction Limit Enforcement Implementation

## Overview
This document describes the comprehensive transaction limit enforcement system that prevents users from exceeding their subscription plan's transaction limits.

## Changes Made

### 1. Core Library - Auto-Enforcement (`lib/limits/auto-enforce-cap.ts`)
**NEW FILE** - Automatic transaction cap enforcement module

**Features:**
- `autoEnforceTransactionCap()`: Automatically deletes oldest transactions when users exceed limits
- `wouldExceedCap()`: Dry-run check to see if adding transactions would exceed limits
- Called on page loads to ensure users are always within limits
- Silent mode for background checks

**Usage:**
```typescript
// Auto-delete oldest transactions if over limit (e.g., after subscription downgrade)
await autoEnforceTransactionCap(userId, true)

// Check before adding transactions
const check = await wouldExceedCap(userId, incomingCount)
if (check.wouldExceed) {
  // Show limit dialog
}
```

### 2. UI Components - Limit Dialogs (`components/limits/transaction-limit-dialog.tsx`)
**NEW FILE** - Reusable React components for limit exceeded UI

**Components:**
- `TransactionLimitDialog`: Full-featured dialog with upgrade/delete/filter options
- `TransactionLimitAlert`: Inline alert variant for banners

**Features:**
- Shows current plan, cap, used, and available transactions
- Displays upgrade options (Pro, Max plans)
- Action buttons for:
  - Upgrade to higher plan
  - Delete old transactions
  - Filter by date range
  - Import partial (only what fits)

### 3. UI Components - Alert (`components/ui/alert.tsx`)
**NEW FILE** - shadcn-style Alert component

Standard alert component with variants (default, destructive) for displaying contextual messages.

### 4. Backend - Home Bundle Auto-Enforcement
**MODIFIED:** `app/api/charts/home-bundle/route.ts`

**Changes:**
- Added `autoEnforceTransactionCap()` call on page load
- Ensures users are within limits when they view dashboard
- Automatically deletes oldest transactions if needed

**Behavior:**
- Runs silently in background
- Deletes excess transactions based on subscription cap
- No user interruption (happens during data fetch)

### 5. Backend - Receipts Upload Pre-Check
**MODIFIED:** `app/api/receipts/upload/route.ts`

**Changes:**
- Added capacity check BEFORE processing files
- Prevents expensive OCR processing when user is at capacity
- Returns proper `LIMIT_EXCEEDED` response with upgrade options

**Behaviour:**
- Checks if user has ANY remaining capacity
- If no capacity, returns 403 with structured error
- Saves AI/OCR costs by failing fast

### 6. Frontend - Fridge Page Limit Handling
**MODIFIED:** `app/fridge/fridge-page-client.tsx`

**Changes:**
- Added `TransactionLimitDialog` component import
- Added state for limit exceeded data and dialog visibility
- Updated upload error handling to detect limit exceeded responses
- Updated commit error handling to detect limit exceeded responses  
- Added dialog component to JSX with upgrade/delete actions

**User Experience:**
1. User tries to upload receipts
2. If at capacity, sees professional dialog instead of generic error
3. Dialog shows:
   - Current plan and limits
   - How many transactions they're over
   - Upgrade button → redirects to `/billing`
   - Delete old button → redirects to `/data-library`
4. User can choose their preferred action

### 7. Existing Transaction Creation Endpoints
These endpoints already have limit checking via `assertCapacityOrExplain()`:

**Already Protected:**
- ✅ `app/api/transactions/route.ts` (POST) - Manual transaction creation
- ✅ `app/api/statements/import/route.ts` (POST) - CSV import
- ✅ `app/api/receipts/commit/route.ts` (POST) - Receipt commit

**How they work:**
- Check capacity before creating transactions
- Support partial import if `allowPartialImport` flag is set
- Return structured `LIMIT_EXCEEDED` response with:
  - Plan info
  - Current usage
  - Suggested actions (upgrade, delete, filter, partial import)
  - Upgrade plan options

## Transaction Limit Flow

### Scenario 1: User at Capacity Tries to Upload Receipt
```
1. User drags receipt file to Fridge page
2. Upload dialog opens
3. User clicks "Upload"
4. Frontend calls POST /api/receipts/upload
5. Backend checks capacity (hasAnyRemainingCapacity)
6. Backend returns 403 LIMIT_EXCEEDED
7. Frontend detects limit response
8. Frontend shows TransactionLimitDialog
9. User clicks "Upgrade Plan"
10. Redirected to /billing
```

### Scenario 2: User Exceeds Limit After Downgrade
```
1. User downgrades from Pro (3000) to Free (400)
2. Webhook calls enforceTransactionCap()
3. Oldest 2600 transactions are deleted
4. User has 400 transactions remaining
5. User visits dashboard
6. autoEnforceTransactionCap() runs (safety check)
7. No action needed, user is within limits
8. Dashboard loads normally
```

### Scenario 3: User at Capacity Tries to Import CSV
```
1. User imports 500 transactions via CSV
2. Backend checks capacity
3. User has 50 slots remaining
4. Backend returns LIMIT_EXCEEDED with suggestedActions
5. Frontend shows options:
   - Import 50 most recent (partial import)
   - Filter by date range
   - Upgrade plan
   - Delete old transactions
6. User chooses partial import
7. Backend imports 50 newest transactions
8. Returns success with capacity info
```

## Plan Limits (from `lib/plan-limits.ts`)

| Plan | Max Transactions |
|------|------------------|
| Free | 400              |
| Pro  | 3,000            |
| Max  | 15,000           |

## Safety Mechanisms

### 1. Pre-Upload Check
- Prevents wasting AI/OCR resources
- Fails fast with clear error message
- Saves server costs

### 2. Pre-Commit Check  
- Checks capacity before committing to database
- Supports partial import
- Returns remaining capacity after operation

### 3. Auto-Enforcement on Page Load
- Runs on dashboard/home bundle fetch
- Ensures users are always within limits
- Handles edge cases (manual DB edits, race conditions, etc.)

### 4. Subscription Change Enforcement
- Webhook automatically deletes excess on downgrade
- Calculates deletions before applying
- Logs all enforcement actions

## User-Facing Messages

### Limit Exceeded Dialog
Shows when user tries to add transactions but is over limit:
- Clear explanation of the problem
- Current plan and limits displayed
- Specific numbers (used/available/cap)
- Multiple resolution paths:
  - Upgrade (fastest)
  - Delete old (keeps control)
  - Filter (for imports)
  - Partial (conservative approach)

### Error Messages
- Upload: "You have reached your transaction limit. Please delete some transactions or upgrade your plan to add more receipts."
- Import: "Cannot add X transactions, only Y slots available"  
- Commit: Structured limit exceeded response with actions

## Testing Checklist

- [ ] Upload receipt when at capacity → see dialog
- [ ] Upload receipt when near capacity → succeeds
- [ ] Import CSV when at capacity → see limit options
- [ ] Import CSV with partial → imports allowed amount
- [ ] Downgrade subscription → auto-deletes oldest
- [ ] Page load when over limit → auto-deletes oldest
- [ ] Upgrade plan → can add more transactions
- [ ] Dialog upgrade button → goes to /billing
- [ ] Dialog delete button → goes to /data-library
- [ ] Manual transaction add at capacity → blocked

## Future Enhancements

1. **Proactive Warnings**: Show warning when approaching limit (e.g., at 80% capacity)
2. **Smart Deletion**: Let users choose which transactions to delete (by date range, category, etc.)
3. **Archive Feature**: Archive old transactions instead of deleting them
4. **Usage Analytics**: Show transaction usage trends over time
5. **Bulk Actions**: Mass delete/archive transactions from Data Library
6. **Plan Comparison**: Show side-by-side plan comparison in limit dialog

## Security Notes

- All limits enforced server-side (never trust client)
- Database is source of truth for transaction counts
- Capacity checks use real-time queries, not cached values
- Deletion is cascade-safe (respects foreign keys)
- Logs all enforcement actions for audit trail

## Performance Considerations

- Auto-enforcement runs asynchronously during page load
- Upload pre-check is fast (single count query)
- Deletion query is optimized (single query with LIMIT)
- Caches are invalidated after any transaction changes
- No N+1 queries in limit checking logic
