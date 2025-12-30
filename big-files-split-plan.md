# Big files split plan

## Scope
- Code files only (.ts, .tsx, .js, .jsx, .mjs, .cjs).
- Threshold: >700 lines.
- Excludes markdown and binary assets.

## Structure convention (feature-first)
- Each feature stays under its own root (example: app/analytics/).
- Inside each feature root, use a dedicated subfolder (example: app/analytics/_page/) and group by components/hooks/utils.
- Shared UI or utilities live under components/<feature>/ or lib/<feature>/ with a local index.ts barrel.
- API routes keep route.ts as the entry and use a local _lib/ folder for helpers.

## Big files (>700 lines)
- 4158: app/analytics/page.tsx
- 4148: app/data-library/page.tsx
- 3286: app/home/page.tsx
- 2334: app/fridge/fridge-page-client.tsx
- 1286: components/subscription-dialog.tsx
- 1195: components/data-table.tsx
- 1125: app/dashboard/page.tsx
- 1106: components/analytics-advanced-charts.tsx
- 1021: components/dashboard/subscription-card.tsx
- 976: components/chart-all-months-category-spending.tsx
- 936: app/api/receipts/upload/route.ts
- 862: lib/chart-card-sizes.config.ts
- 860: components/receipt-fridge-animation.tsx
- 826: components/fridge/data-table-fridge.tsx
- 777: lib/receipts/processing.ts
- 776: components/chart-day-of-week-spending.tsx
- 759: components/reports-data-table.tsx
- 758: lib/parsing/parseCsvToRows.ts
- 758: components/chart-transaction-calendar.tsx
- 747: components/ui/sidebar.tsx
- 740: components/chart-day-of-week-category.tsx
- 737: __tests__/core/chartsFunctionality.test.ts
- 722: components/charts-showcase.tsx

## Implementation progress (current)

### /analytics
- Done:
  - /analytics/page.tsx wrapper + /analytics/_page split completed (hooks/components/utils/types/constants).
- Remaining:
  - None.

### /components/subscription-dialog
- Done:
  - /components/subscription-dialog split (types/plan-info/PlanCard/SubscriptionDialog + wrapper).
- Remaining:
  - None.

### /data-library
- Done:
  - /data-library/page.tsx wrapper and /data-library/_page/DataLibraryPage.tsx wired to hooks and StatsCards.
  - /data-library/_page/constants.ts, /data-library/_page/utils/file-dnd.ts.
  - /data-library/_page/utils/defaults.ts (default category/type helpers).
  - /data-library/_page/hooks/useLibraryData.ts, useSearchPagination.ts, useCategoryPreferences.ts, useCsvImport.ts, useCategoryManagement.ts, useReceiptTypeManagement.ts, useReceiptCategoryManagement.ts, useStatementViewer.ts.
  - /data-library/_page/components/DataLibraryLayout.tsx, StatsCards.tsx, CsvPreviewTable.tsx, MemoizedTableRow.tsx, CsvUploadDialog.tsx, AiReparseDialog.tsx, LimitDialogs.tsx.
  - /data-library/_page/components/CategoryDialogs.tsx, ReceiptTypeDialogs.tsx, ReceiptCategoryDialogs.tsx.
  - /data-library/_page/components/ReportsTable.tsx, CategoriesTable.tsx, ReceiptTypesTable.tsx, ReceiptCategoriesTable.tsx, TransactionsTable.tsx, ViewStatementDialog.tsx.
  - /data-library/_page/DataLibraryPage.tsx now uses the table/dialog components instead of inline blocks.
- Remaining:
  - None.

### /home
- Done:
  - /home/page.tsx wrapper.
  - /home/_page/components/HomeLayout.tsx.
  - /home/_page/types.ts.
  - /home/_page/components/SpendingActivityRings.tsx.
  - /home/_page/components/MemoizedTableRow.tsx, CsvPreviewTable.tsx, CsvUploadDialog.tsx, AiReparseDialog.tsx.
  - /home/_page/components/StatsCards.tsx, FavoritesGrid.tsx, ChartsGrid.tsx.
  - /home/_page/hooks/useHomeData.ts, useHomeStats.ts, useHomeChartData.ts, useFavoritesLayout.ts, useCsvImport.ts, useCategoryPreferences.ts.
  - /home/_page/constants.ts, /home/_page/utils/file-dnd.ts, /home/_page/utils/categories.ts.
  - /home/_page/HomePage.tsx now uses hooks/components instead of inline dialog/data/chart blocks.
- Remaining:
  - None (LimitDialogs not needed for current home flow; ChartsGrid stays disabled until charts are re-enabled).

### /fridge
- Done:
  - /fridge/fridge-page-client.tsx wrapper and /fridge/_client/FridgePageClient.tsx wired.
  - /fridge/_client/constants.ts.
  - /fridge/_client/utils/file-dnd.ts, /fridge/_client/utils/dates.ts, /fridge/_client/utils/categories.ts.
  - /fridge/_client/hooks/useFridgeData.ts, useReceiptUpload.ts, useReviewDialog.ts, useReceiptCategoryManagement.ts, useFridgeMetrics.ts, useFridgeChartData.ts, useChartLayout.ts.
  - /fridge/_client/components/FridgeLayout.tsx, MetricsCards.tsx, ChartsGrid.tsx, ReceiptsTable.tsx, UploadDialog.tsx, ReviewDialog.tsx, CreateCategoryDialog.tsx, LimitDialogs.tsx.
- Remaining:
  - None.

### /dashboard
- Done:
  - /dashboard/page.tsx wrapper now re-exports the split page.
  - /dashboard/_page/DashboardPage.tsx (main layout + wiring).
  - /dashboard/_page/types.ts, constants.ts, icons.tsx, insights.ts, formatters.ts, score-style.ts.
  - /dashboard/_page/components/DashboardLayout.tsx, AnimatedScore.tsx, TrendIndicator.tsx, ScoreSparkline.tsx, ComparisonPopover.tsx.
- Remaining:
  - None.

# Big files ANALYTICS split plan

## Status
- Detailed split plan completed: app/analytics/page.tsx
- Remaining files: none

## app/analytics/page.tsx (4158) split plan

### Goals
- Keep app/analytics/page.tsx as the client route file, but move most logic into app/analytics/_page/.
- Separate data fetching, CSV import flow, chart layout state, and derived chart data into hooks.
- Extract reusable UI pieces into focused components to reduce render complexity and file size.

### Folder layout
```txt
app/analytics/
  page.tsx
  _page/
    AnalyticsPage.tsx
    types.ts
    constants.ts
    cache.ts
    utils/
      file-dnd.ts
      categories.ts
    hooks/
      useAnalyticsData.ts
      useAnalyticsStats.ts
      useAnalyticsChartData.ts
      useChartLayout.ts
      useCsvImport.ts
      useCategoryPreferences.ts
    components/
      AnalyticsLayout.tsx
      StatsCards.tsx
      ChartsGrid.tsx
      SpendingActivityRings.tsx
      CsvPreviewTable.tsx
      MemoizedTableRow.tsx
      CsvUploadDialog.tsx
      AiReparseDialog.tsx
```

### Subfile responsibilities
- app/analytics/page.tsx: keep the "use client" directive and re-export the default page component.
- app/analytics/_page/AnalyticsPage.tsx: main page composition; wires hooks, derived data, dialogs, and chart grid.
- app/analytics/_page/types.ts: shared types (ParsedRow, AnalyticsTransaction, ActivityRingsDatum/Data/Config, cache types).
- app/analytics/_page/constants.ts: static config and keys (cache TTL, chart order, storage keys, default sizes).
- app/analytics/_page/cache.ts: analyticsDataCache map plus getAnalyticsCacheKey/getAnalyticsCacheEntry/isAnalyticsCacheFresh helpers.
- app/analytics/_page/utils/file-dnd.ts: isFileDragEvent and any drag-and-drop helpers.
- app/analytics/_page/utils/categories.ts: normalizeCategoryName and ring-limit helpers used in chart data.
- app/analytics/_page/hooks/useAnalyticsData.ts: fetchAllAnalyticsData, cache hydration, rawTransactions/ringLimits state, loading state.
- app/analytics/_page/hooks/useAnalyticsStats.ts: stats and statsTrends derived from rawTransactions.
- app/analytics/_page/hooks/useAnalyticsChartData.ts: derived datasets for charts (income/expense, category flow, treemap, funnel, pies, circle packing, polar bar, stream, sankey, rings config, transaction summary), plus category visibility controls.
- app/analytics/_page/hooks/useChartLayout.ts: chart order + resize persistence, snapToAllowedSize, saved sizes and storage keys.
- app/analytics/_page/hooks/useCsvImport.ts: drag/drop, parseFile, parse progress, parsedCsv/parsedRows, delete rows, import requests, error handling.
- app/analytics/_page/hooks/useCategoryPreferences.ts: debounced preference updates for category changes.
- app/analytics/_page/components/AnalyticsLayout.tsx: sidebar/header layout shell for the page.
- app/analytics/_page/components/StatsCards.tsx: SectionCards/TrendLineBackground summary using stats and trends.
- app/analytics/_page/components/ChartsGrid.tsx: SortableGrid layout and chart card composition.
- app/analytics/_page/components/SpendingActivityRings.tsx: activity rings chart and popover content.
- app/analytics/_page/components/CsvPreviewTable.tsx: parsed CSV table and selection UI.
- app/analytics/_page/components/MemoizedTableRow.tsx: memoized row renderer used by CsvPreviewTable.
- app/analytics/_page/components/CsvUploadDialog.tsx: confirm upload dialog with progress and CsvPreviewTable.
- app/analytics/_page/components/AiReparseDialog.tsx: AI reparse dialog UI for parse mode/context.

### Import wiring (keep behavior unchanged)
- app/analytics/page.tsx:
  ```ts
  "use client"
  export { default } from "./_page/AnalyticsPage"
  ```
- app/analytics/_page/AnalyticsPage.tsx imports:
  - hooks: useAnalyticsData, useAnalyticsStats, useAnalyticsChartData, useChartLayout, useCsvImport, useCategoryPreferences.
  - components: AnalyticsLayout, StatsCards, ChartsGrid, CsvUploadDialog, AiReparseDialog, SpendingActivityRings.
  - external: useAnalyticsBundleData, useDateFilter, useTheme, useColorScheme, useCurrency, toast, TransactionLimitDialog.
- Hooks share types via app/analytics/_page/types.ts and constants via app/analytics/_page/constants.ts.
- useAnalyticsData uses cache.ts helpers and existing deduplicatedFetch/normalizeTransactions utilities.
- useAnalyticsChartData uses useChartCategoryVisibility, getChartCardSize/ChartId, and category helpers from utils/categories.ts.
- useCsvImport uses parseCsvToRows/rowsToCanonicalCsv, DEFAULT_CATEGORIES, safeCapture, and returns state/handlers used by CsvUploadDialog.

### Notes
- Keep "use client" in app/analytics/page.tsx so Next treats the page as a client component.
- Preserve existing named exports and types when moving code to avoid cascading import changes.
- If you want zero import churn elsewhere, add a simple barrel file app/analytics/_page/index.ts and import from it inside AnalyticsPage.tsx only.
# Big files DATA LIBRARY split plan

## app/data-library/page.tsx (4148) split plan

### Goals
- Keep app/data-library/page.tsx as the client route file, but move most logic into app/data-library/_page/.
- Separate bundle fetching, statements viewing, CSV import flow, and category management into hooks.
- Extract table sections and dialogs into focused components.

### Folder layout
```txt
app/data-library/
  page.tsx
  _page/
    DataLibraryPage.tsx
    types.ts
    constants.ts
    formatters.ts
    utils/
      file-dnd.ts
    hooks/
      useLibraryData.ts
      useStatementViewer.ts
      useCategoryPreferences.ts
      useCsvImport.ts
      useCategoryManagement.ts
      useReceiptTypeManagement.ts
      useReceiptCategoryManagement.ts
      useSearchPagination.ts
    components/
      DataLibraryLayout.tsx
      StatsCards.tsx
      ReportsTable.tsx
      TransactionsTable.tsx
      CategoriesTable.tsx
      ReceiptTypesTable.tsx
      ReceiptCategoriesTable.tsx
      ViewStatementDialog.tsx
      CategoryDialogs.tsx
      ReceiptTypeDialogs.tsx
      ReceiptCategoryDialogs.tsx
      CsvPreviewTable.tsx
      MemoizedTableRow.tsx
      CsvUploadDialog.tsx
      AiReparseDialog.tsx
      LimitDialogs.tsx
```

### Subfile responsibilities
- app/data-library/page.tsx: keep the "use client" directive and re-export the default page component.
- app/data-library/_page/DataLibraryPage.tsx: main page composition; wires hooks, derived data, tables, and dialogs.
- app/data-library/_page/types.ts: Transaction, Statement, ReceiptCategoryOption, StatsResponse, Category, ReceiptCategoryType, ReceiptCategory, UserFile, ParsedRow.
- app/data-library/_page/constants.ts: storage keys, page size defaults, and any static configuration values.
- app/data-library/_page/formatters.ts: formatNumber, formatFreshness, formatBytes, formatDateLabel.
- app/data-library/_page/utils/file-dnd.ts: drag/drop helpers for CSV upload.
- app/data-library/_page/hooks/useLibraryData.ts: fetchLibraryData bundle call, loading/error state, and core datasets.
- app/data-library/_page/hooks/useStatementViewer.ts: view dialog state, statementTransactions fetch, dialog receipt categories/types.
- app/data-library/_page/hooks/useCategoryPreferences.ts: debounced /api/transactions/preferences updates for CSV edits.
- app/data-library/_page/hooks/useCsvImport.ts: parseFile flow, drag/drop state, progress, import requests, AI reparse, and parsed row state.
- app/data-library/_page/hooks/useCategoryManagement.ts: add/delete spending categories, optimistic updates.
- app/data-library/_page/hooks/useReceiptTypeManagement.ts: add/delete receipt types and related dialogs.
- app/data-library/_page/hooks/useReceiptCategoryManagement.ts: add/delete receipt categories, create-from-dialog flow.
- app/data-library/_page/hooks/useSearchPagination.ts: search/pagination/selection state + filtered lists for categories, receipt types, receipt categories, and reports.
- app/data-library/_page/components/DataLibraryLayout.tsx: sidebar/header layout shell.
- app/data-library/_page/components/StatsCards.tsx: stats summary cards based on totals.
- app/data-library/_page/components/ReportsTable.tsx: reports list, filtering, pagination, selection.
- app/data-library/_page/components/TransactionsTable.tsx: statement transaction table content.
- app/data-library/_page/components/CategoriesTable.tsx: categories list, search, pagination, selection.
- app/data-library/_page/components/ReceiptTypesTable.tsx: receipt type list, search, pagination, selection.
- app/data-library/_page/components/ReceiptCategoriesTable.tsx: receipt category list, search, pagination, selection.
- app/data-library/_page/components/ViewStatementDialog.tsx: view statement details and transactions.
- app/data-library/_page/components/CategoryDialogs.tsx: add/delete category dialogs.
- app/data-library/_page/components/ReceiptTypeDialogs.tsx: add/delete receipt type dialogs.
- app/data-library/_page/components/ReceiptCategoryDialogs.tsx: add/delete receipt category dialogs.
- app/data-library/_page/components/CsvPreviewTable.tsx: parsed CSV preview table.
- app/data-library/_page/components/MemoizedTableRow.tsx: memoized row renderer for CSV preview.
- app/data-library/_page/components/CsvUploadDialog.tsx: confirm upload dialog and progress UI.
- app/data-library/_page/components/AiReparseDialog.tsx: AI reparse dialog UI.
- app/data-library/_page/components/LimitDialogs.tsx: TransactionLimitDialog and CategoryLimitDialog.

### Import wiring (keep behavior unchanged)
- app/data-library/page.tsx:
  ```ts
  "use client"
  export { default } from "./_page/DataLibraryPage"
  ```
- app/data-library/_page/DataLibraryPage.tsx imports:
  - hooks: useLibraryData, useStatementViewer, useCsvImport, useCategoryPreferences, useCategoryManagement, useReceiptTypeManagement, useReceiptCategoryManagement, useSearchPagination.
  - components: DataLibraryLayout, StatsCards, ReportsTable, CategoriesTable, ReceiptTypesTable, ReceiptCategoriesTable, ViewStatementDialog, CsvUploadDialog, AiReparseDialog, LimitDialogs.
  - external: useCurrency, toast, normalizeTransactions, parseCsvToRows, rowsToCanonicalCsv, DEFAULT_CATEGORIES.
- Hooks share types via app/data-library/_page/types.ts and formatters via app/data-library/_page/formatters.ts.

### Notes
- Keep "use client" in app/data-library/page.tsx to preserve client behavior.
- Preserve named exports and type names when moving code to avoid extra churn.

# Big files HOME split plan

## app/home/page.tsx (3286) split plan

### Goals
- Keep app/home/page.tsx as the client route file, but move most logic into app/home/_page/.
- Separate transaction fetch, chart data derivation, favorites layout, and CSV import flow into hooks.
- Extract rings/chart UI and dialogs into focused components.

### Folder layout
```txt
app/home/
  page.tsx
  _page/
    HomePage.tsx
    types.ts
    constants.ts
    utils/
      file-dnd.ts
      categories.ts
    hooks/
      useHomeData.ts
      useHomeStats.ts
      useHomeChartData.ts
      useFavoritesLayout.ts
      useCsvImport.ts
      useCategoryPreferences.ts
    components/
      HomeLayout.tsx
      StatsCards.tsx
      FavoritesGrid.tsx
      SpendingActivityRings.tsx
      ChartsGrid.tsx
      CsvPreviewTable.tsx
      MemoizedTableRow.tsx
      CsvUploadDialog.tsx
      AiReparseDialog.tsx
      LimitDialogs.tsx
```

### Subfile responsibilities
- app/home/page.tsx: keep the "use client" directive and re-export the default page component.
- app/home/_page/HomePage.tsx: main page composition; wires hooks, derived data, dialogs, and layout.
- app/home/_page/types.ts: ParsedRow, ActivityRingsDatum/Data/Config, and any shared chart data shapes.
- app/home/_page/constants.ts: favorites storage keys, default chart sizes, default chart order.
- app/home/_page/utils/file-dnd.ts: drag/drop helpers for CSV upload.
- app/home/_page/utils/categories.ts: normalizeCategoryName and ring limit helpers used in chart data.
- app/home/_page/hooks/useHomeData.ts: fetchTransactions, loading/error state, and ringLimits from budgets.
- app/home/_page/hooks/useHomeStats.ts: stats and statsTrends derived from transactions.
- app/home/_page/hooks/useHomeChartData.ts: chart datasets and category visibility controls.
- app/home/_page/hooks/useFavoritesLayout.ts: favorites order and size persistence.
- app/home/_page/hooks/useCsvImport.ts: parseFile flow, drag/drop state, progress, import requests, AI reparse.
- app/home/_page/hooks/useCategoryPreferences.ts: debounced /api/transactions/preferences updates for CSV edits.
- app/home/_page/components/HomeLayout.tsx: sidebar/header layout shell.
- app/home/_page/components/StatsCards.tsx: SectionCards summary using stats and trends.
- app/home/_page/components/FavoritesGrid.tsx: sortable favorites grid and resize handling.
- app/home/_page/components/SpendingActivityRings.tsx: rings chart and popover content.
- app/home/_page/components/ChartsGrid.tsx: optional charts layout (if charts are re-enabled).
- app/home/_page/components/CsvPreviewTable.tsx: parsed CSV preview table.
- app/home/_page/components/MemoizedTableRow.tsx: memoized row renderer for CSV preview.
- app/home/_page/components/CsvUploadDialog.tsx: confirm upload dialog and progress UI.
- app/home/_page/components/AiReparseDialog.tsx: AI reparse dialog UI.
- app/home/_page/components/LimitDialogs.tsx: TransactionLimitDialog handling.

### Import wiring (keep behavior unchanged)
- app/home/page.tsx:
  ```ts
  "use client"
  export { default } from "./_page/HomePage"
  ```
- app/home/_page/HomePage.tsx imports:
  - hooks: useHomeData, useHomeStats, useHomeChartData, useFavoritesLayout, useCsvImport, useCategoryPreferences.
  - components: HomeLayout, StatsCards, FavoritesGrid, SpendingActivityRings, CsvUploadDialog, AiReparseDialog, LimitDialogs.
  - external: useSearchParams, useRouter, useTransactionDialog, useFavorites, useDateFilter, useTheme, useColorScheme.
- Hooks share types via app/home/_page/types.ts and constants via app/home/_page/constants.ts.

### Notes
- Keep "use client" in app/home/page.tsx to preserve client behavior.
- Preserve existing named exports and type names when moving code.

# Big files FRIDGE split plan

## app/fridge/fridge-page-client.tsx (2334) split plan

### Goals
- Keep app/fridge/fridge-page-client.tsx as the client entry point, but move most logic into app/fridge/_client/.
- Separate upload/review flow, chart layout state, and derived metrics into hooks.
- Extract dialogs and table sections into focused components.

### Folder layout
```txt
app/fridge/
  fridge-page-client.tsx
  _client/
    FridgePageClient.tsx
    types.ts
    constants.ts
    utils/
      file-dnd.ts
      dates.ts
      categories.ts
    hooks/
      useFridgeData.ts
      useReceiptUpload.ts
      useReviewDialog.ts
      useReceiptCategoryManagement.ts
      useFridgeMetrics.ts
      useFridgeChartData.ts
      useChartLayout.ts
    components/
      FridgeLayout.tsx
      MetricsCards.tsx
      ChartsGrid.tsx
      ReceiptsTable.tsx
      UploadDialog.tsx
      ReviewDialog.tsx
      CreateCategoryDialog.tsx
      LimitDialogs.tsx
```

### Subfile responsibilities
- app/fridge/fridge-page-client.tsx: keep the "use client" directive and re-export the FridgePageClient component.
- app/fridge/_client/FridgePageClient.tsx: main page composition; wires hooks, derived data, dialogs, and layout.
- app/fridge/_client/types.ts: ReceiptTransactionRow, UploadedReceiptTransaction, UploadedReceipt, ReceiptCategoryOption, FridgeChartId.
- app/fridge/_client/constants.ts: FRIDGE_CHART_TO_ANALYTICS_CHART, FRIDGE_CHART_ORDER, DEFAULT_CHART_SIZES, storage keys.
- app/fridge/_client/utils/file-dnd.ts: upload drag/drop helpers and file key helpers.
- app/fridge/_client/utils/dates.ts: parseIsoDateUtc, monthKey, formatMonthLabel.
- app/fridge/_client/utils/categories.ts: normalizeCategoryName, normalizeMerchantName, broad type helpers.
- app/fridge/_client/hooks/useFridgeData.ts: bundle data access, receiptTransactions fetch, refresh state.
- app/fridge/_client/hooks/useReceiptUpload.ts: upload dialog state, file progress, project name, upload flow.
- app/fridge/_client/hooks/useReviewDialog.ts: review dialog state, item editing, commit flow.
- app/fridge/_client/hooks/useReceiptCategoryManagement.ts: create category flow and category lists.
- app/fridge/_client/hooks/useFridgeMetrics.ts: metrics and trends from receiptTransactions/bundle data.
- app/fridge/_client/hooks/useFridgeChartData.ts: derived chart datasets for fridge charts.
- app/fridge/_client/hooks/useChartLayout.ts: chart order + resize persistence, snapToAllowedSize, renderChart mapping.
- app/fridge/_client/components/FridgeLayout.tsx: sidebar/header layout shell.
- app/fridge/_client/components/MetricsCards.tsx: SectionCardsFridge and summary cards.
- app/fridge/_client/components/ChartsGrid.tsx: sortable grid layout and chart composition.
- app/fridge/_client/components/ReceiptsTable.tsx: receipt transactions table.
- app/fridge/_client/components/UploadDialog.tsx: upload dialog UI with FileUpload01 and progress.
- app/fridge/_client/components/ReviewDialog.tsx: review UI for parsed receipts and category edits.
- app/fridge/_client/components/CreateCategoryDialog.tsx: dialog for adding receipt categories.
- app/fridge/_client/components/LimitDialogs.tsx: TransactionLimitDialog and CategoryLimitDialog.

### Import wiring (keep behavior unchanged)
- app/fridge/fridge-page-client.tsx:
  ```ts
  "use client"
  export { FridgePageClient } from "./_client/FridgePageClient"
  ```
- app/fridge/_client/FridgePageClient.tsx imports:
  - hooks: useFridgeData, useReceiptUpload, useReviewDialog, useReceiptCategoryManagement, useFridgeMetrics, useFridgeChartData, useChartLayout.
  - components: FridgeLayout, MetricsCards, ChartsGrid, ReceiptsTable, UploadDialog, ReviewDialog, CreateCategoryDialog, LimitDialogs.
  - external: useUser, useDateFilter, useFridgeBundleData, toast, clearResponseCache.
- Hooks share types via app/fridge/_client/types.ts and constants via app/fridge/_client/constants.ts.

### Notes
- Keep "use client" in app/fridge/fridge-page-client.tsx to preserve client behavior.
- Preserve existing named exports and type names when moving code.

# Big files SUBSCRIPTION DIALOG split plan

## components/subscription-dialog.tsx (1286) split plan

### Goals
- Keep components/subscription-dialog.tsx as a stable import path.
- Extract plan metadata, types, and UI pieces into smaller files.
- Preserve named exports so existing imports keep working.

### Folder layout
```txt
components/
  subscription-dialog.tsx
  subscription-dialog/
    index.ts
    types.ts
    plan-info.ts
    PlanCard.tsx
    SubscriptionDialog.tsx
```

### Subfile responsibilities
- components/subscription-dialog.tsx: thin re-export layer for existing imports.
- components/subscription-dialog/index.ts: re-export types and components from this folder.
- components/subscription-dialog/types.ts: SubscriptionStatus, PlanType.
- components/subscription-dialog/plan-info.ts: planIcons and PLAN_INFO constants.
- components/subscription-dialog/PlanCard.tsx: PlanCard UI component.
- components/subscription-dialog/SubscriptionDialog.tsx: dialog composition and layout.

### Import wiring (keep behavior unchanged)
- components/subscription-dialog.tsx:
  ```ts
  export * from "./subscription-dialog"
  ```
- components/subscription-dialog/index.ts:
  ```ts
  export { SubscriptionDialog } from "./SubscriptionDialog"
  export { PlanCard } from "./PlanCard"
  export type { SubscriptionStatus, PlanType } from "./types"
  export { PLAN_INFO, planIcons } from "./plan-info"
  ```

### Notes
- If you want to share planIcons/PLAN_INFO with the dashboard subscription card, move plan-info.ts and types.ts to a shared folder and re-export from both places.

# Big files DATA TABLE split plan

## components/data-table.tsx (1195) split plan

### Goals
- Keep components/data-table.tsx as a stable import path.
- Separate schema/columns, DnD helpers, and cell rendering from the main component.
- Preserve existing exports (DataTable, schema, etc.).

### Folder layout
```txt
components/
  data-table.tsx
  data-table/
    index.ts
    types.ts
    schema.ts
    columns.ts
    DragHandle.tsx
    DraggableRow.tsx
    TableCellViewer.tsx
    chart-preview.tsx
    DataTable.tsx
```

### Subfile responsibilities
- components/data-table.tsx: thin re-export layer for existing imports.
- components/data-table/index.ts: re-export DataTable, schema, and types.
- components/data-table/types.ts: DataTableProps and row/column types.
- components/data-table/schema.ts: exported schema definition.
- components/data-table/columns.ts: defaultColumns and column helpers.
- components/data-table/DragHandle.tsx: drag handle UI.
- components/data-table/DraggableRow.tsx: DnD row wrapper.
- components/data-table/TableCellViewer.tsx: custom cell renderer/viewer.
- components/data-table/chart-preview.tsx: chartData/chartConfig and chart preview helpers.
- components/data-table/DataTable.tsx: main DataTable component.

### Import wiring (keep behavior unchanged)
- components/data-table.tsx:
  ```ts
  export * from "./data-table"
  ```
- components/data-table/index.ts:
  ```ts
  export { DataTable } from "./DataTable"
  export { schema } from "./schema"
  export { defaultColumns } from "./columns"
  export type { DataTableProps } from "./types"
  ```

### Notes
- If other files import internal helpers from components/data-table.tsx, re-export them from index.ts to avoid churn.

# Big files DASHBOARD split plan

## app/dashboard/page.tsx (1125) split plan

### Goals
- Keep app/dashboard/page.tsx as the route entry point.
- Split insights, formatting, and score styling from UI components.
- Extract reusable UI pieces into focused components.

### Folder layout
```txt
app/dashboard/
  page.tsx
  _page/
    DashboardPage.tsx
    types.ts
    constants.ts
    icons.tsx
    insights.ts
    formatters.ts
    score-style.ts
    components/
      DashboardLayout.tsx
      AnimatedScore.tsx
      TrendIndicator.tsx
      ScoreSparkline.tsx
      ComparisonPopover.tsx
```

### Subfile responsibilities
- app/dashboard/page.tsx: keep the "use client" directive and re-export the default page component.
- app/dashboard/_page/DashboardPage.tsx: main page composition; wires data, insights, and UI.
- app/dashboard/_page/types.ts: DashboardStats, ScoreInsight.
- app/dashboard/_page/constants.ts: pagesConfig, chartConfig, and other static config.
- app/dashboard/_page/icons.tsx: IconAnalytics/IconFridge/IconSavings/IconLightbulb and getCardIcon/getIconForTip.
- app/dashboard/_page/insights.ts: getAnalyticsInsight, getSavingsInsight, getFridgeInsight, getTrendsInsight.
- app/dashboard/_page/formatters.ts: formatNumber, formatCurrency.
- app/dashboard/_page/score-style.ts: getScoreColor, getTipBgColor, getTipIconColor, getScoreLabel, getCardGradient, getScoreGlow, getCardHoverStyles.
- app/dashboard/_page/components/DashboardLayout.tsx: AppSidebar/SiteHeader layout shell.
- app/dashboard/_page/components/AnimatedScore.tsx: animated score display.
- app/dashboard/_page/components/TrendIndicator.tsx: trend direction UI.
- app/dashboard/_page/components/ScoreSparkline.tsx: sparkline chart for score trends.
- app/dashboard/_page/components/ComparisonPopover.tsx: comparison details popover.

### Import wiring (keep behavior unchanged)
- app/dashboard/page.tsx:
  ```ts
  "use client"
  export { default } from "./_page/DashboardPage"
  ```
- app/dashboard/_page/DashboardPage.tsx imports:
  - helpers: types, constants, icons, insights, score-style.
  - components: DashboardLayout, AnimatedScore, ScoreSparkline, ComparisonPopover.

### Notes
- Keep the route file as the only Next entry to avoid routing changes.

# Big files ANALYTICS ADVANCED CHARTS split plan

## components/analytics-advanced-charts.tsx (1106) split plan

### Goals
- Keep components/analytics-advanced-charts.tsx as a stable import path.
- Split each chart into its own file and share common helpers.
- Preserve named exports for all chart components.

### Folder layout
```txt
components/
  analytics-advanced-charts.tsx
  analytics-advanced-charts/
    index.ts
    types.ts
    utils.ts
    charts/
      ChartCirclePacking.tsx
      ChartPolarBar.tsx
      ChartRadar.tsx
      ChartSankey.tsx
      ChartStream.tsx
      ChartSwarmPlot.tsx
      ChartTreeMap.tsx
      ChartRadialBar.tsx
```

### Subfile responsibilities
- components/analytics-advanced-charts.tsx: thin re-export layer for existing imports.
- components/analytics-advanced-charts/index.ts: re-export all chart components and types.
- components/analytics-advanced-charts/types.ts: chart prop interfaces and CirclePackingNode.
- components/analytics-advanced-charts/utils.ts: sanitizeCirclePackingNode and shared helpers.
- components/analytics-advanced-charts/charts/ChartCirclePacking.tsx: circle packing chart.
- components/analytics-advanced-charts/charts/ChartPolarBar.tsx: polar bar chart and tooltip content.
- components/analytics-advanced-charts/charts/ChartRadar.tsx: radar chart.
- components/analytics-advanced-charts/charts/ChartSankey.tsx: sankey chart.
- components/analytics-advanced-charts/charts/ChartStream.tsx: stream chart.
- components/analytics-advanced-charts/charts/ChartSwarmPlot.tsx: swarm plot chart.
- components/analytics-advanced-charts/charts/ChartTreeMap.tsx: treemap chart.
- components/analytics-advanced-charts/charts/ChartRadialBar.tsx: radial bar chart.

### Import wiring (keep behavior unchanged)
- components/analytics-advanced-charts.tsx:
  ```ts
  export * from "./analytics-advanced-charts"
  ```
- components/analytics-advanced-charts/index.ts:
  ```ts
  export { ChartCirclePacking } from "./charts/ChartCirclePacking"
  export { ChartPolarBar } from "./charts/ChartPolarBar"
  export { ChartRadar } from "./charts/ChartRadar"
  export { ChartSankey } from "./charts/ChartSankey"
  export { ChartStream } from "./charts/ChartStream"
  export { ChartSwarmPlot } from "./charts/ChartSwarmPlot"
  export { ChartTreeMap } from "./charts/ChartTreeMap"
  export { ChartRadialBar } from "./charts/ChartRadialBar"
  export type { ChartCirclePackingProps, ChartPolarBarProps, ChartRadarProps, ChartSankeyProps, ChartStreamProps, ChartSwarmPlotProps, ChartTreeMapProps, ChartRadialBarProps } from "./types"
  ```

### Notes
- Keep "use client" at the top of each chart file to preserve client-only rendering.

# Big files SUBSCRIPTION CARD split plan

## components/dashboard/subscription-card.tsx (1021) split plan

### Goals
- Keep components/dashboard/subscription-card.tsx as a stable import path.
- Extract plan metadata, types, and card UI into smaller files.
- Preserve named exports so existing imports keep working.

### Folder layout
```txt
components/
  dashboard/
    subscription-card.tsx
    subscription-card/
      index.ts
      types.ts
      plan-info.ts
      PlanCard.tsx
      SubscriptionCard.tsx
```

### Subfile responsibilities
- components/dashboard/subscription-card.tsx: thin re-export layer for existing imports.
- components/dashboard/subscription-card/index.ts: re-export types and components from this folder.
- components/dashboard/subscription-card/types.ts: SubscriptionStatus, PlanType.
- components/dashboard/subscription-card/plan-info.ts: planIcons and PLAN_INFO constants.
- components/dashboard/subscription-card/PlanCard.tsx: PlanCard UI component.
- components/dashboard/subscription-card/SubscriptionCard.tsx: card composition and layout.

### Import wiring (keep behavior unchanged)
- components/dashboard/subscription-card.tsx:
  ```ts
  export * from "./subscription-card"
  ```
- components/dashboard/subscription-card/index.ts:
  ```ts
  export { SubscriptionCard } from "./SubscriptionCard"
  export { PlanCard } from "./PlanCard"
  export type { SubscriptionStatus, PlanType } from "./types"
  export { PLAN_INFO, planIcons } from "./plan-info"
  ```

### Notes
- If you want to share planIcons/PLAN_INFO with the dialog component, move them to a shared folder and re-export from both places.

# Big files ALL MONTHS CATEGORY SPENDING split plan

## components/chart-all-months-category-spending.tsx (976) split plan

### Goals
- Keep components/chart-all-months-category-spending.tsx as a stable import path.
- Split constants, data shaping, and the chart UI into smaller files.
- Preserve named exports and props type.

### Folder layout
```txt
components/
  chart-all-months-category-spending.tsx
  chart-all-months-category-spending/
    index.ts
    types.ts
    constants.ts
    utils.ts
    ChartAllMonthsCategorySpending.tsx
```

### Subfile responsibilities
- components/chart-all-months-category-spending.tsx: thin re-export layer for existing imports.
- components/chart-all-months-category-spending/index.ts: re-export ChartAllMonthsCategorySpending and types.
- components/chart-all-months-category-spending/types.ts: ChartAllMonthsCategorySpendingProps.
- components/chart-all-months-category-spending/constants.ts: monthNames, monthNamesShort, ALL_MONTHS_QUERY.
- components/chart-all-months-category-spending/utils.ts: buildMonthTotals and any data normalization helpers.
- components/chart-all-months-category-spending/ChartAllMonthsCategorySpending.tsx: main chart component.

### Import wiring (keep behavior unchanged)
- components/chart-all-months-category-spending.tsx:
  ```ts
  export * from "./chart-all-months-category-spending"
  ```
- components/chart-all-months-category-spending/index.ts:
  ```ts
  export { ChartAllMonthsCategorySpending } from "./ChartAllMonthsCategorySpending"
  export type { ChartAllMonthsCategorySpendingProps } from "./types"
  ```

### Notes
- Keep "use client" at the top of ChartAllMonthsCategorySpending.tsx.

# Big files RECEIPTS UPLOAD API split plan

## app/api/receipts/upload/route.ts (936) split plan

### Goals
- Keep app/api/receipts/upload/route.ts as the API entry point.
- Move validation, normalization, prompt building, and parsing helpers into a local library.
- Preserve the POST handler signature and response behavior.

### Folder layout
```txt
app/api/receipts/upload/
  route.ts
  _lib/
    constants.ts
    types.ts
    file-validation.ts
    normalize.ts
    prompt.ts
    json-repair.ts
    parse.ts
    handler.ts
```

### Subfile responsibilities
- app/api/receipts/upload/route.ts: export POST from handler.ts.
- app/api/receipts/upload/_lib/constants.ts: MAX_RECEIPT_FILE_BYTES, RECEIPT_MODEL.
- app/api/receipts/upload/_lib/types.ts: ExtractedReceipt and related types.
- app/api/receipts/upload/_lib/file-validation.ts: isSupportedReceiptImage/isSupportedReceiptPdf.
- app/api/receipts/upload/_lib/normalize.ts: parseNumber, normalizeDate/Time, todayIsoDate/nowIsoTime.
- app/api/receipts/upload/_lib/prompt.ts: buildReceiptSchemaPrompt.
- app/api/receipts/upload/_lib/json-repair.ts: normalizeJsonCandidate, insertMissingCommas helpers, buildJsonCandidates.
- app/api/receipts/upload/_lib/parse.ts: tryParseReceiptJson.
- app/api/receipts/upload/_lib/handler.ts: POST handler implementation.

### Import wiring (keep behavior unchanged)
- app/api/receipts/upload/route.ts:
  ```ts
  export { POST } from "./_lib/handler"
  ```

### Notes
- Keep any Next.js route-specific exports (runtime, dynamic) in route.ts if present.

# Big files CHART CARD SIZES split plan

## lib/chart-card-sizes.config.ts (862) split plan

### Goals
- Keep lib/chart-card-sizes.config.ts as a stable import path.
- Split types, constants, and helpers into smaller files.
- Preserve ChartId type and getChartCardSize export.

### Folder layout
```txt
lib/
  chart-card-sizes.config.ts
  chart-card-sizes/
    index.ts
    types.ts
    config.ts
    getChartCardSize.ts
```

### Subfile responsibilities
- lib/chart-card-sizes.config.ts: thin re-export layer.
- lib/chart-card-sizes/index.ts: re-export ChartId, ChartCardSizeConfig, CHART_CARD_SIZES, getChartCardSize.
- lib/chart-card-sizes/types.ts: ChartCardSizeConfig, ChartId.
- lib/chart-card-sizes/config.ts: CHART_CARD_SIZES constant.
- lib/chart-card-sizes/getChartCardSize.ts: getChartCardSize helper.

### Import wiring (keep behavior unchanged)
- lib/chart-card-sizes.config.ts:
  ```ts
  export * from "./chart-card-sizes"
  ```

### Notes
- Keep the config file as the canonical import to avoid churn.

# Big files RECEIPT FRIDGE ANIMATION split plan

## components/receipt-fridge-animation.tsx (860) split plan

### Goals
- Keep components/receipt-fridge-animation.tsx as a stable import path.
- Split animation subcomponents into smaller files for readability.
- Preserve the ReceiptFridgeAnimation export.

### Folder layout
```txt
components/
  receipt-fridge-animation.tsx
  receipt-fridge-animation/
    index.ts
    constants.ts
    ReceiptFridgeAnimation.tsx
    FridgeDoor.tsx
    FridgeInterior.tsx
    ReceiptContent.tsx
    ChartSparkles.tsx
    DonutChart.tsx
    BarsChart.tsx
    StackedChart.tsx
```

### Subfile responsibilities
- components/receipt-fridge-animation.tsx: thin re-export layer.
- components/receipt-fridge-animation/index.ts: re-export ReceiptFridgeAnimation and types.
- components/receipt-fridge-animation/constants.ts: Phase type, PHASE_STEPS, CYCLE_DURATION.
- components/receipt-fridge-animation/ReceiptFridgeAnimation.tsx: animation orchestrator.
- components/receipt-fridge-animation/FridgeDoor.tsx: door SVG and animation.
- components/receipt-fridge-animation/FridgeInterior.tsx: interior layout.
- components/receipt-fridge-animation/ReceiptContent.tsx: receipt body UI.
- components/receipt-fridge-animation/ChartSparkles.tsx: sparkle overlay.
- components/receipt-fridge-animation/DonutChart.tsx: donut mini chart.
- components/receipt-fridge-animation/BarsChart.tsx: bars mini chart.
- components/receipt-fridge-animation/StackedChart.tsx: stacked mini chart.

### Import wiring (keep behavior unchanged)
- components/receipt-fridge-animation.tsx:
  ```ts
  export * from "./receipt-fridge-animation"
  ```

### Notes
- Keep "use client" at the top of each component if required by hooks/animation.

# Big files FRIDGE DATA TABLE split plan

## components/fridge/data-table-fridge.tsx (826) split plan

### Goals
- Keep components/fridge/data-table-fridge.tsx as a stable import path.
- Split schema/columns, DnD helpers, and table rendering into smaller files.
- Preserve DataTableFridge export and schema.

### Folder layout
```txt
components/
  fridge/
    data-table-fridge.tsx
    data-table-fridge/
      index.ts
      types.ts
      schema.ts
      columns.ts
      DragHandle.tsx
      DraggableRow.tsx
      DataTableFridge.tsx
```

### Subfile responsibilities
- components/fridge/data-table-fridge.tsx: thin re-export layer.
- components/fridge/data-table-fridge/index.ts: re-export DataTableFridge and schema.
- components/fridge/data-table-fridge/types.ts: props and row types.
- components/fridge/data-table-fridge/schema.ts: schema definition.
- components/fridge/data-table-fridge/columns.ts: columns configuration.
- components/fridge/data-table-fridge/DragHandle.tsx: drag handle UI.
- components/fridge/data-table-fridge/DraggableRow.tsx: DnD row wrapper.
- components/fridge/data-table-fridge/DataTableFridge.tsx: main table component.

### Import wiring (keep behavior unchanged)
- components/fridge/data-table-fridge.tsx:
  ```ts
  export * from "./data-table-fridge"
  ```

### Notes
- Re-export schema from index.ts to keep existing imports intact.

# Big files RECEIPTS PROCESSING split plan

## lib/receipts/processing.ts (777) split plan

### Goals
- Keep lib/receipts/processing.ts as a stable import path.
- Split types, constants, prompt, normalization, and parsing into smaller files.
- Preserve enqueueReceiptProcessing export and helper behavior.

### Folder layout
```txt
lib/receipts/
  processing.ts
  processing/
    index.ts
    types.ts
    constants.ts
    normalize.ts
    prompt.ts
    json-repair.ts
    parse.ts
    enqueue.ts
```

### Subfile responsibilities
- lib/receipts/processing.ts: thin re-export layer.
- lib/receipts/processing/index.ts: re-export enqueueReceiptProcessing and types.
- lib/receipts/processing/types.ts: EnqueueParams, ReceiptFileRow, ReceiptCategoryRow, ExtractedReceipt.
- lib/receipts/processing/constants.ts: RECEIPT_MODEL, inFlightReceiptIds.
- lib/receipts/processing/normalize.ts: parseNumber, normalizeDate/Time, todayIsoDate/nowIsoTime.
- lib/receipts/processing/prompt.ts: buildReceiptSchemaPrompt.
- lib/receipts/processing/json-repair.ts: normalizeJsonCandidate, insertMissingCommas helpers, buildJsonCandidates.
- lib/receipts/processing/parse.ts: tryParseReceiptJson.
- lib/receipts/processing/enqueue.ts: enqueueReceiptProcessing implementation.

### Import wiring (keep behavior unchanged)
- lib/receipts/processing.ts:
  ```ts
  export * from "./processing"
  ```

### Notes
- Keep shared helpers in normalize/json-repair to reduce duplication with the upload route if desired.

# Big files DAY OF WEEK SPENDING CHART split plan

## components/chart-day-of-week-spending.tsx (776) split plan

### Goals
- Keep components/chart-day-of-week-spending.tsx as a stable import path.
- Split constants, data processing, and chart UI into smaller files.
- Preserve ChartDayOfWeekSpending export and props type.

### Folder layout
```txt
components/
  chart-day-of-week-spending.tsx
  chart-day-of-week-spending/
    index.ts
    types.ts
    constants.ts
    data.ts
    ChartDayOfWeekSpending.tsx
```

### Subfile responsibilities
- components/chart-day-of-week-spending.tsx: thin re-export layer.
- components/chart-day-of-week-spending/index.ts: re-export ChartDayOfWeekSpending and types.
- components/chart-day-of-week-spending/types.ts: ChartDayOfWeekSpendingProps.
- components/chart-day-of-week-spending/constants.ts: dayNames, dayNamesShort.
- components/chart-day-of-week-spending/data.ts: processedData, category list, and visibility helpers.
- components/chart-day-of-week-spending/ChartDayOfWeekSpending.tsx: main chart component.

### Import wiring (keep behavior unchanged)
- components/chart-day-of-week-spending.tsx:
  ```ts
  export * from "./chart-day-of-week-spending"
  ```

### Notes
- Keep "use client" at the top of ChartDayOfWeekSpending.tsx.

# Big files REPORTS DATA TABLE split plan

## components/reports-data-table.tsx (759) split plan

### Goals
- Keep components/reports-data-table.tsx as a stable import path.
- Split schema/columns, row rendering, and table logic into smaller files.
- Preserve ReportsDataTable export and schema.

### Folder layout
```txt
components/
  reports-data-table.tsx
  reports-data-table/
    index.ts
    types.ts
    schema.ts
    columns.ts
    TransactionRow.tsx
    ReportsDataTable.tsx
```

### Subfile responsibilities
- components/reports-data-table.tsx: thin re-export layer.
- components/reports-data-table/index.ts: re-export ReportsDataTable and schema.
- components/reports-data-table/types.ts: StatementTransaction, NormalizedStatementTransaction.
- components/reports-data-table/schema.ts: reportSchema.
- components/reports-data-table/columns.ts: createColumns helpers.
- components/reports-data-table/TransactionRow.tsx: row renderer.
- components/reports-data-table/ReportsDataTable.tsx: main component.

### Import wiring (keep behavior unchanged)
- components/reports-data-table.tsx:
  ```ts
  export * from "./reports-data-table"
  ```

### Notes
- Re-export any helper types used outside this module.

# Big files CSV PARSER split plan

## lib/parsing/parseCsvToRows.ts (758) split plan

### Goals
- Keep lib/parsing/parseCsvToRows.ts as a stable import path.
- Split constants and parsing helpers into smaller files.
- Deduplicate repeated export lines and keep one public entry.

### Folder layout
```txt
lib/parsing/
  parseCsvToRows.ts
  csv/
    index.ts
    types.ts
    constants.ts
    date.ts
    time.ts
    delimiter.ts
    preprocess.ts
    columns.ts
    coerce.ts
    map.ts
    parseCsvToRows.ts
```

### Subfile responsibilities
- lib/parsing/parseCsvToRows.ts: thin re-export layer.
- lib/parsing/csv/index.ts: re-export parseCsvToRows and types.
- lib/parsing/csv/types.ts: CsvDiagnostics, ParseCsvOptions, ParseCsvReturn.
- lib/parsing/csv/constants.ts: header keywords, delimiter candidates, regex constants.
- lib/parsing/csv/date.ts: excelSerialToDate, looksLikeDate, normalizeDate.
- lib/parsing/csv/time.ts: normalizeTime, extractTime.
- lib/parsing/csv/delimiter.ts: detectDelimiter.
- lib/parsing/csv/preprocess.ts: preprocessCsv.
- lib/parsing/csv/columns.ts: findDateColumn.
- lib/parsing/csv/coerce.ts: coerceNumber.
- lib/parsing/csv/map.ts: mapArraysToObjects.
- lib/parsing/csv/parseCsvToRows.ts: main parser implementation.

### Import wiring (keep behavior unchanged)
- lib/parsing/parseCsvToRows.ts:
  ```ts
  export * from "./csv"
  ```

### Notes
- Keep a single public parseCsvToRows export to avoid duplicate symbol warnings.

# Big files TRANSACTION CALENDAR CHART split plan

## components/chart-transaction-calendar.tsx (758) split plan

### Goals
- Keep components/chart-transaction-calendar.tsx as a stable import path.
- Split types, helper utilities, and chart UI into smaller files.
- Preserve ChartTransactionCalendar export and props type.

### Folder layout
```txt
components/
  chart-transaction-calendar.tsx
  chart-transaction-calendar/
    index.ts
    types.ts
    utils.ts
    ChartTransactionCalendar.tsx
```

### Subfile responsibilities
- components/chart-transaction-calendar.tsx: thin re-export layer.
- components/chart-transaction-calendar/index.ts: re-export ChartTransactionCalendar and types.
- components/chart-transaction-calendar/types.ts: ChartTransactionCalendarProps.
- components/chart-transaction-calendar/utils.ts: getRangeForFilter, formatFilterLabel.
- components/chart-transaction-calendar/ChartTransactionCalendar.tsx: main chart component.

### Import wiring (keep behavior unchanged)
- components/chart-transaction-calendar.tsx:
  ```ts
  export * from "./chart-transaction-calendar"
  ```

### Notes
- Keep "use client" at the top of ChartTransactionCalendar.tsx.

# Big files SIDEBAR UI split plan

## components/ui/sidebar.tsx (747) split plan

### Goals
- Keep components/ui/sidebar.tsx as a stable import path.
- Split context, provider, and UI subcomponents into focused files.
- Preserve named exports for Sidebar components.

### Folder layout
```txt
components/ui/
  sidebar.tsx
  sidebar/
    index.ts
    constants.ts
    context.tsx
    Provider.tsx
    Sidebar.tsx
    SidebarTrigger.tsx
    SidebarRail.tsx
    SidebarInset.tsx
    SidebarInput.tsx
    SidebarHeader.tsx
    SidebarFooter.tsx
    SidebarSeparator.tsx
    SidebarContent.tsx
    SidebarGroup.tsx
    SidebarMenu.tsx
```

### Subfile responsibilities
- components/ui/sidebar.tsx: thin re-export layer.
- components/ui/sidebar/index.ts: re-export all public sidebar components and hooks.
- components/ui/sidebar/constants.ts: SIDEBAR_* constants.
- components/ui/sidebar/context.tsx: SidebarContext and useSidebar.
- components/ui/sidebar/Provider.tsx: SidebarProvider component.
- components/ui/sidebar/Sidebar.tsx: Sidebar container component.
- components/ui/sidebar/SidebarTrigger.tsx: trigger button component.
- components/ui/sidebar/SidebarRail.tsx: rail UI component.
- components/ui/sidebar/SidebarInset.tsx: inset wrapper component.
- components/ui/sidebar/SidebarInput.tsx: input/search component.
- components/ui/sidebar/SidebarHeader.tsx: header section.
- components/ui/sidebar/SidebarFooter.tsx: footer section.
- components/ui/sidebar/SidebarSeparator.tsx: separator.
- components/ui/sidebar/SidebarContent.tsx: scrollable content wrapper.
- components/ui/sidebar/SidebarGroup.tsx: group/label/action/content components.
- components/ui/sidebar/SidebarMenu.tsx: menu, menu items, submenu, and variants.

### Import wiring (keep behavior unchanged)
- components/ui/sidebar.tsx:
  ```ts
  export * from "./sidebar"
  ```
- components/ui/sidebar/index.ts:
  ```ts
  export { SidebarProvider } from "./Provider"
  export { Sidebar } from "./Sidebar"
  export { SidebarTrigger } from "./SidebarTrigger"
  export { SidebarRail } from "./SidebarRail"
  export { SidebarInset } from "./SidebarInset"
  export { SidebarInput } from "./SidebarInput"
  export { SidebarHeader } from "./SidebarHeader"
  export { SidebarFooter } from "./SidebarFooter"
  export { SidebarSeparator } from "./SidebarSeparator"
  export { SidebarContent } from "./SidebarContent"
  export { SidebarGroup, SidebarGroupLabel, SidebarGroupAction, SidebarGroupContent } from "./SidebarGroup"
  export { SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarMenuAction, SidebarMenuBadge, SidebarMenuSkeleton, SidebarMenuSub, SidebarMenuSubItem, SidebarMenuSubButton } from "./SidebarMenu"
  export { useSidebar } from "./context"
  ```

### Notes
- Keep "use client" at the top of any file using hooks or context.

# Big files DAY OF WEEK CATEGORY CHART split plan

## components/chart-day-of-week-category.tsx (740) split plan

### Goals
- Keep components/chart-day-of-week-category.tsx as a stable import path.
- Split constants, URL/data helpers, and chart UI into smaller files.
- Preserve ChartDayOfWeekCategory export and props type.

### Folder layout
```txt
components/
  chart-day-of-week-category.tsx
  chart-day-of-week-category/
    index.ts
    types.ts
    constants.ts
    utils.ts
    ChartDayOfWeekCategory.tsx
```

### Subfile responsibilities
- components/chart-day-of-week-category.tsx: thin re-export layer.
- components/chart-day-of-week-category/index.ts: re-export ChartDayOfWeekCategory and types.
- components/chart-day-of-week-category/types.ts: ChartDayOfWeekCategoryProps and DayOfWeekData.
- components/chart-day-of-week-category/constants.ts: DAY_NAMES.
- components/chart-day-of-week-category/utils.ts: buildDayOfWeekUrl and any data shaping helpers.
- components/chart-day-of-week-category/ChartDayOfWeekCategory.tsx: main chart component.

### Import wiring (keep behavior unchanged)
- components/chart-day-of-week-category.tsx:
  ```ts
  export * from "./chart-day-of-week-category"
  ```

### Notes
- Keep "use client" at the top of ChartDayOfWeekCategory.tsx.

# Big files CHARTS FUNCTIONALITY TEST split plan

## __tests__/core/chartsFunctionality.test.ts (737) split plan

### Goals
- Keep __tests__/core/chartsFunctionality.test.ts as the test entry point (or re-export).
- Split fixtures and helpers from the test cases for clarity.
- Preserve test behavior and Jest discovery.

### Folder layout
```txt
__tests__/core/
  chartsFunctionality.test.ts
  chartsFunctionality/
    fixtures.ts
    utils.ts
    api-endpoints.test.ts
    hardcoded-ignores.test.ts
    operational.test.ts
```

### Subfile responsibilities
- __tests__/core/chartsFunctionality.test.ts: optional re-export runner (or keep as a wrapper that imports the split tests).
- __tests__/core/chartsFunctionality/fixtures.ts: CHART_DOCUMENTATION, EXPECTED_API_ENDPOINTS, HARDCODED_IGNORE_PATTERNS.
- __tests__/core/chartsFunctionality/utils.ts: readFileContent, extractApiEndpoints, checkHardcodedIgnores, getAllChartFiles.
- __tests__/core/chartsFunctionality/api-endpoints.test.ts: API endpoint consistency tests.
- __tests__/core/chartsFunctionality/hardcoded-ignores.test.ts: hardcoded ignore detection tests.
- __tests__/core/chartsFunctionality/operational.test.ts: chart presence and operational checks.

### Import wiring (keep behavior unchanged)
- __tests__/core/chartsFunctionality.test.ts:
  ```ts
  import "./chartsFunctionality/api-endpoints.test"
  import "./chartsFunctionality/hardcoded-ignores.test"
  import "./chartsFunctionality/operational.test"
  ```

### Notes
- Keep fixtures and utils in plain TS to avoid Jest config changes.

# Big files CHARTS SHOWCASE split plan

## components/charts-showcase.tsx (722) split plan

### Goals
- Keep components/charts-showcase.tsx as a stable import path.
- Split animation components and chart card into smaller files.
- Preserve ChartsShowcase export.

### Folder layout
```txt
components/
  charts-showcase.tsx
  charts-showcase/
    index.ts
    constants.ts
    LineChartAnimation.tsx
    BarChartAnimation.tsx
    PieChartAnimation.tsx
    ScatterChartAnimation.tsx
    AreaChartAnimation.tsx
    HeatMapAnimation.tsx
    ChartCard.tsx
    ChartsShowcase.tsx
```

### Subfile responsibilities
- components/charts-showcase.tsx: thin re-export layer.
- components/charts-showcase/index.ts: re-export ChartsShowcase and helpers.
- components/charts-showcase/constants.ts: orangeColors and any shared constants.
- components/charts-showcase/LineChartAnimation.tsx: line animation.
- components/charts-showcase/BarChartAnimation.tsx: bar animation.
- components/charts-showcase/PieChartAnimation.tsx: pie animation.
- components/charts-showcase/ScatterChartAnimation.tsx: scatter animation.
- components/charts-showcase/AreaChartAnimation.tsx: area animation.
- components/charts-showcase/HeatMapAnimation.tsx: heatmap animation.
- components/charts-showcase/ChartCard.tsx: card wrapper.
- components/charts-showcase/ChartsShowcase.tsx: section composition.

### Import wiring (keep behavior unchanged)
- components/charts-showcase.tsx:
  ```ts
  export * from "./charts-showcase"
  ```

### Notes
- Keep "use client" at the top of ChartsShowcase.tsx and any animated subcomponents.
