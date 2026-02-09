# Data Fetching & Bundle APIs

> **Last Updated:** December 25, 2024

---

## Overview

Dashboard pages use **bundle API endpoints** that return pre-aggregated data with Redis caching, replacing raw transaction fetching and client-side computation.

---

## Bundle API Endpoints

| Endpoint | Page | Returns | Cache TTL |
|----------|------|---------|-----------|
| `/api/charts/analytics-bundle` | Analytics | KPIs, category/daily/monthly spending | 5 min |
| `/api/charts/fridge-bundle` | Fridge | KPIs, category/store spending, macros | 5 min |
| `/api/charts/home-bundle` | Home | KPIs, top categories, activity rings | 5 min |
| `/api/charts/trends-bundle` | Analytics (Trends tab) | Category → daily spending trends | 5 min |
| `/api/charts/savings-bundle` | Savings | Savings KPIs, cumulative chart data | 5 min |

All endpoints accept `?filter=` parameter (e.g., `last30days`, `lastyear`, `2024`).

---

## Response Formats

### Analytics Bundle

```json
{
  "kpis": { "totalIncome", "totalExpense", "netSavings", "transactionCount", "avgTransaction" },
  "categorySpending": [{ "category", "total", "count", "color" }],
  "dailySpending": [{ "date", "total", "income", "expense" }],
  "monthlyCategories": [{ "month", "category", "total" }],
  "dayOfWeekSpending": [{ "dayOfWeek", "total", "count" }],
  "dayOfWeekCategory": [{ "dayOfWeek", "category", "total" }],
  "transactionHistory": [{ "id", "date", "description", "amount", "category", "color" }],
  "needsWants": [{ "classification", "total", "count" }],
  "cashFlow": { "nodes": [{ "id", "label" }], "links": [{ "source", "target", "value" }] },
  "dailyByCategory": [{ "date", "category", "total" }]
}
```

### Fridge Bundle

```json
{
  "kpis": { "totalSpent", "shoppingTrips", "storesVisited", "averageReceipt", "itemCount" },
  "categorySpending": [{ "category", "total", "count", "color", "broadType" }],
  "dailySpending": [{ "date", "total" }],
  "storeSpending": [{ "storeName", "total", "count" }],
  "macronutrientBreakdown": [{ "typeName", "total", "color" }]
}
```

### Home Bundle

```json
{
  "kpis": { "totalIncome", "totalExpense", "netSavings", "transactionCount", "avgTransaction" },
  "topCategories": [{ "category", "total", "count", "color", "percentage" }],
  "activityRings": [{ "category", "spent", "percentage", "color" }],
  "dailySpending": [{ "date", "total" }],
  "recentTransactions": number
}
```

### Trends Bundle

```json
{
  "categoryTrends": { "CategoryName": [{ "date", "value" }] },
  "categories": ["Category1", "Category2"]
}
```

### Savings Bundle

```json
{
  "kpis": { "totalSaved", "savingsRate", "transactionCount", "avgSavingsPerTransaction" },
  "chartData": [{ "date", "amount", "cumulative" }]
}
```

---

## Aggregation Files

| File | Description |
|------|-------------|
| `lib/charts/aggregations.ts` | Analytics SQL aggregations |
| `lib/charts/fridge-aggregations.ts` | Fridge SQL aggregations |
| `lib/charts/home-trends-savings-aggregations.ts` | Home, Trends, Savings aggregations |

---

## Legacy Endpoints

Still available but replaced by bundles for dashboard pages:

- `/api/transactions?all=true` - Raw transactions (for DataTable)
- `/api/fridge?all=true` - Raw receipt transactions
- `/api/categories` - Category definitions

---

## Cache Headers

Bundle responses include:

```
Cache-Control: public, s-maxage=60, stale-while-revalidate=120
X-Cache-Key: user:{userId}:{prefix}:{filter}:bundle
```
