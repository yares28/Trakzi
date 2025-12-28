# Endpoint Limit Dialog Integration Tracker

## Overview
This document tracks ALL endpoints where users can create transactions or categories.
Each must be updated to show user-friendly limit dialogs instead of generic errors.

---

## 🎯 HIGH PRIORITY - Category Creation Endpoints

### ✅ COMPLETED

| File | Line | Endpoint | Type | Status |
|------|------|----------|------|--------|
| `app/fridge/fridge-page-client.tsx` | 566 | POST /api/receipt-categories | Receipt Category | ✅ Done |
| - | - | Dashboard UI with gauges | Display | ⏳ In Progress |

### 📋 TODO - Find Category Creation Points

Need to search for:
- Creating transaction categories (spending categories)
- Where users can add new categories in analytics
- Category management in data-library
- Any admin/settings category creation

**Action:** Search entire codebase for POST /api/categories

---

## 💰 MEDIUM PRIORITY - Transaction Creation Endpoints

### ✅ Receipt Upload (Already Has TransactionLimitDialog)

| File | Line | Endpoint | Purpose | Status |
|------|------|----------|---------|--------|
| `app/fridge/fridge-page-client.tsx` | 927 | POST /api/receipts/upload | Upload receipt images/PDFs | ✅ Done |

### 📋 CSV/Statement Import

| File | Line | Endpoint | Purpose | Status |
|------|------|----------|---------|--------|
| `app/analytics/page.tsx` | ~1461 | POST /api/statements/import | Import parsed CSV transactions | ⏳ TODO |
| `app/analytics/page.tsx` | ~1259 | POST /api/statements/parse | Parse statement file | ⏳ TODO |

### 📋 Manual Transaction Entry

**Action:** Search for POST /api/transactions to find manual entry points

---

## 🔍 INVESTIGATION NEEDED

### Unknown POST Endpoints Found

#### app/home/page.tsx
- [ ] Line 1618: POST (unknown) - **Investigate this file**
- [ ] Line 1836: POST (unknown)
- [ ] Line 2063: POST (unknown)
- [ ] Line 2423: POST (unknown)

#### app/data-library/page.tsx
- [ ] Line 596: POST (unknown) - **Investigate this file**
- [ ] Line 801: POST (unknown)
- [ ] Line 993: POST (unknown)  
- [ ] Line 1090: POST (unknown)
- [ ] Line 1172: POST (unknown)
- [ ] Line 1246: POST (unknown)
- [ ] Line 1289: POST (unknown)

#### app/analytics/analytics-page-client.tsx
- [ ] Line 871: POST (unknown)
- [ ] Line 1076: POST (unknown)
- [ ] Line 1268: POST (unknown)
- [ ] Line 3034: POST (unknown)

---

## 📊 Implementation Checklist Per Endpoint

For each endpoint, verify/implement:

### 1. Category Creation (/api/categories or /api/receipt-categories)
```typescript
- [ ] Import CategoryLimitDialog component
- [ ] Add state: categoryLimitData, isCategoryLimitDialogOpen
- [ ] Update POST error handling:
if (response.status === 403 && errorData.code === 'CATEGORY_LIMIT_EXCEEDED') {
  setCategoryLimitData({...errorData, type: 'transaction' | 'receipt'})
  setIsCategoryLimitDialogOpen(true)
  return
}
- [ ] Add dialog to JSX with onUpgrade callback
- [ ] Test: Try creating 6th category on free plan
```

### 2. Transaction Creation (/api/transactions, /api/receipts/upload, /api/statements/import)
```typescript
- [ ] Import TransactionLimitDialog component
- [ ] Add state: transactionLimitData, isTransactionLimitDialogOpen
- [ ] Update POST error handling:
if (response.status === 403 && errorData.code === 'LIMIT_EXCEEDED') {
  setTransactionLimitData(errorData)
  setTransactionLimitDialogOpen(true)
  return
}
- [ ] Add dialog to JSX with onUpgrade, onDeleteOld, onPartialImport callbacks
- [ ] Test: Import 501+ transactions on free plan
```

---

## 📈 Progress Tracking

**Total Endpoints:** ~20+ (discovery in progress)
**Completed:** 2
**In Progress:** Dashboard gauges
**Remaining:** ~18+

---

## Next Actions

1. ✅ Create this tracker
2. ⏳ Add gauge charts to dashboard
3. 🔍 Investigate unknown POST endpoints in:
   - home/page.tsx
   - data-library/page.tsx  
   - analytics/analytics-page-client.tsx
4. 📝 Document exact endpoint URLs and purposes
5. 🔧 Systematically update each endpoint
6. ✅ Test each update
7. 📦 Commit progress regularly

---

## Testing Plan

### Category Limits
- [ ] Free plan: Try creating 6th transaction category → shows dialog
- [ ] Free plan: Try creating 6th receipt category → shows dialog
- [ ] Pro plan: Verify 20 category limit
- [ ] Max plan: Verify 100 category limit

### Transaction Limits
- [ ] Free plan: Import 501 transactions → shows dialog
- [ ] Free plan: Upload receipt at limit → shows dialog  
- [ ] Partial import works correctly
- [ ] Upgrade links navigate to /billing

