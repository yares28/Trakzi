# Endpoint Limit Dialog Integration Tracker

## Overview
This document tracks all POST endpoints that need limit dialog integration to replace generic 403/400 errors with user-friendly dialogs offering upgrade options.

**Total Endpoints:** 28+  
**Completed:** 3  
**Remaining:** 25+

---

## Status Legend
- ✅ **DONE** - Limit dialog integrated and tested
- 🔄 **IN PROGRESS** - Currently being worked on
- ⏸️ **SKIPPED** - Not applicable for limit checks
- ⏳ **TODO** - Needs implementation

---

## 1. Category Creation Endpoints (HIGH PRIORITY)

### 1.1 Transaction Categories (Spending)
| File | Line | Endpoint | Status | Notes |
|------|------|----------|--------|-------|
| `app/analytics/page.tsx` | N/A | POST /api/categories | ⏳ TODO | Need to find where categories are created |
| `app/analytics/analytics-page-client.tsx` | N/A | POST /api/categories | ⏳ TODO | Need to investigate |
| `app/data-library/page.tsx` | TBD | POST /api/categories | ⏳ TODO | Needs investigation |

**Integration Required:**
- Import `CategoryLimitDialog` component  
- Add state: `categoryLimitData`, `isCategoryLimitDialogOpen`
- Catch `response.status === 403 && errorData.code === 'CATEGORY_LIMIT_EXCEEDED'`
- Set `type: 'transaction'`
- Render `<CategoryLimitDialog />` in UI

---

### 1.2 Receipt Categories (Grocery)
| File | Line | Endpoint | Status | Notes |
|------|------|----------|--------|-------|
| `app/fridge/fridge-page-client.tsx` | 566 | POST /api/receipt-categories | ✅ DONE | Completed with CategoryLimitDialog |

---

## 2. Transaction Creation Endpoints (MEDIUM PRIORITY)

### 2.1 Receipt Upload
| File | Line | Endpoint | Status | Notes |
|------|------|----------|--------|-------|
| `app/fridge/fridge-page-client.tsx` | 927 | POST /api/receipts/upload | ✅ DONE | Already has TransactionLimitDialog |

### 2.2 CSV/Statement Import
| File | Line | Endpoint | Status | Notes |
|------|------|----------|--------|-------|
| `app/analytics/page.tsx` | 1042 | POST /api/transactions/preferences | ⏸️ SKIPPED | Preferences, not transaction creation |
| `app/analytics/page.tsx` | 1259 | POST /api/statements/parse | ⏸️ SKIPPED | Parsing only, no DB write |
| `app/analytics/page.tsx` | 1461 | POST /api/statements/import | ⏳ TODO | **CRITICAL** - imports transactions |
| `app/analytics/analytics-page-client.tsx` | 871 | POST (unknown) | ⏳ TODO | Needs investigation |

**Integration Required for /api/statements/import:**
- Import `TransactionLimitDialog`
- Add state: `transactionLimitData`, `isTransactionLimitDialogOpen`  
- Catch `response.status === 403 && errorData.code === 'LIMIT_EXCEEDED'`
- Handle partial import if API supports it
- Render `<TransactionLimitDialog />` with upgrade option

---

### 2.3 Manual Transaction Entry
| File | Line | Endpoint | Status | Notes |
|------|------|----------|--------|-------|
| `app/home/page.tsx` | 1618 | POST (unknown) | ⏳ TODO | Need to identify endpoint |
| `app/home/page.tsx` | 1836 | POST (unknown) | ⏳ TODO | Need to identify endpoint |
| `app/home/page.tsx` | 2063 | POST (unknown) | ⏳ TODO | Need to identify endpoint |
| `app/home/page.tsx` | 2423 | POST (unknown) | ⏳ TODO | Need to identify endpoint |

**Action Required:** View these lines to identify actual endpoints

---

### 2.4 Data Library Operations  
| File | Line | Endpoint | Status | Notes |
|------|------|----------|--------|-------|
| `app/data-library/page.tsx` | 596 | POST (unknown) | ⏳ TODO | Needs investigation |
| `app/data-library/page.tsx` | 801 | POST (unknown) | ⏳ TODO | Needs investigation |
| `app/data-library/page.tsx` | 993 | POST (unknown) | ⏳ TODO | Needs investigation |
| `app/data-library/page.tsx` | 1090 | POST (unknown) | ⏳ TODO | Needs investigation |
| `app/data-library/page.tsx` | 1172 | POST (unknown) | ⏳ TODO | Needs investigation |
| `app/data-library/page.tsx` | 1246 | POST (unknown) | ⏳ TODO | Needs investigation |
| `app/data-library/page.tsx` | 1289 | POST (unknown) | ⏳ TODO | Needs investigation |
| `app/analytics/page.tsx` | 3567 | POST (unknown) | ⏳ TODO | Needs investigation |
| `app/analytics/analytics-page-client.tsx` | 1076 | POST (unknown) | ⏳ TODO | Needs investigation |
| `app/analytics/analytics-page-client.tsx` | 1268 | POST (unknown) | ⏳ TODO | Needs investigation |
| `app/analytics/analytics-page-client.tsx` | 3034 | POST (unknown) | ⏳ TODO | Needs investigation |

**Action Required:** Systematically view each line to identify endpoints

---

## 3. Support/Ancillary Endpoints (LOW PRIORITY)

| File | Line | Endpoint | Status | Notes |
|------|------|----------|--------|-------|
| `app/billing/return/page.tsx` | 23 | POST (unknown) | ⏸️ SKIPPED | Likely billing webhook, N/A for limits |

---

## Implementation Checklist Template

For each endpoint that needs updating:

```markdown
### File: [filename]  
**Line:** [line number]  
**Endpoint:** [API route]  
**Type:** Transaction | Category (transaction) | Category (receipt)

**Steps:**
- [ ] 1. Add import for appropriate dialog component
- [ ] 2. Add state variables (limitData, isDialogOpen)
- [ ] 3. Update POST handler error catching
- [ ] 4. Add dialog component to JSX
- [ ] 5. Test limit scenario
- [ ] 6. Commit changes

**Code Pattern:**
```typescript
// Error handling
if (!response.ok) {
  const errorData = await response.json().catch(() => ({}));
  
  if (response.status === 403 && errorData.code === '[LIMIT_CODE]') {
    set[Type]LimitData(errorData);
    setIs[Type]LimitDialogOpen(true);
    return;
  }
  
  throw new Error(errorData.error || "Failed...");
}
```

**Dialog Rendering:**
```tsx
{limitData && (
  <[Type]LimitDialog
    open={isDialogOpen}
    onOpenChange={setIsDialogOpen}
    data={limitData}
    onUpgrade={() => window.location.href = '/billing'}
  />
)}
```
```

---

## Next Steps

1. ✅ Create this tracking document
2. ⏳ Systematically view unknown endpoints to identify them
3. ⏳ Priority: Complete analytics statement import (line 1461)
4. ⏳ Work through data-library endpoints
5. ⏳ Update home page endpoints
6. ⏳ Final testing and verification

---

## Progress Tracking

**Session 1:**
- [x] Dashboard category UI
- [x] CategoryLimitDialog component created
- [x] Fridge receipt categories (line 566)
- [x] Fridge receipt upload (line 927) - already done

**Session 2:**
- [ ] Analytics statement import
- [ ] Identify and fix unknown endpoints
- [ ] Data library systematic update

