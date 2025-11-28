# Charts Documentation

This document lists all charts used in the application, their locations, and the card names they display in each page.

## Dashboard Page (`app/dashboard/page.tsx`)

1. **ChartAreaInteractive** (`components/chart-area-interactive.tsx`)
   - Card Name: "Income & Expenses Tracking"
   - Description: Your cash flow for the last 3 months

2. **ChartCategoryFlow** (`components/chart-category-flow.tsx`)
   - Card Name: "Spending Category Rankings"
   - Description: Track how your spending priorities shift over time

3. **ChartSpendingFunnel** (`components/chart-spending-funnel.tsx`)
   - Card Name: "Money Flow"
   - Description: Visualize how your income flows through expenses to savings

4. **ChartExpensesPie** (`components/chart-expenses-pie.tsx`)
   - Card Name: "Expense Breakdown"
   - Description: Distribution of your monthly expenses across categories

5. **ChartTreeMap** (`components/chart-treemap.tsx`)
   - Card Name: "Net Worth Allocation"
   - Description: Breakdown of your total assets - Click on a category to see transactions

## Analytics Page (`app/analytics/page.tsx`)

1. **ChartAreaInteractive** (`components/chart-area-interactive.tsx`)
   - Card Name: "Income & Expenses Tracking"
   - Description: Your cash flow for the last 3 months

2. **ChartCategoryFlow** (`components/chart-category-flow.tsx`)
   - Card Name: "Spending Category Rankings"
   - Description: Track how your spending priorities shift over time

3. **ChartSpendingFunnel** (`components/chart-spending-funnel.tsx`)
   - Card Name: "Money Flow"
   - Description: Visualize how your income flows through expenses to savings

4. **ChartExpensesPie** (`components/chart-expenses-pie.tsx`)
   - Card Name: "Expense Breakdown"
   - Description: Distribution of your monthly expenses across categories

5. **ChartCirclePacking** (`components/chart-circle-packing.tsx`)
   - Card Name: "Budget Distribution"
   - Description: Visualizes how your budget is allocated across categories

6. **ChartPolarBar** (`components/chart-polar-bar.tsx`)
   - Card Name: "Household Spend Mix"
   - Description: Track monthly expenses across key categories

7. **ChartRadar** (`components/chart-radar.tsx`)
   - Card Name: "Financial Health Score"
   - Description: Assessment of your financial wellness

8. **ChartSwarmPlot** (`components/chart-swarm-plot.tsx`)
   - Card Name: "Transaction History"
   - Description: Recent transactions by category

9. **ChartSankey** (`components/chart-sankey.tsx`)
    - Card Name: "Cash Flow Sankey"
    - Description: Follow revenue as it moves through the org

10. **ChartTransactionCalendar** (`components/chart-transaction-calendar.tsx`)
    - Card Name: "Daily Transaction Activity"
    - Description: Your spending patterns throughout the year - darker means more transactions
    - Technology: ECharts calendar heatmap
    - Features: Year selector dropdown with "YTD" option (last 365 days) and specific year selection
    - Data Source: Fetches from `/api/transactions/daily`

11. **SpendingActivityRings** (Custom component in `app/analytics/page.tsx`)
    - Card Name: "Spending Activity Rings"
    - Description: Top spending categories from your Neon transactions

## Savings Page (`app/savings/page.tsx`)

1. **ChartSavingsAccumulation** (`components/chart-savings-accumulation.tsx`)
   - Card Name: "Savings Accumulation"
   - Description: Track your savings growth based on income and expenses

## Reports Page (`app/reports/page.tsx`)

- No charts on this page

## Fridge Page (`app/fridge/page.tsx`)

1. **ChartAreaInteractiveFridge** (`components/fridge/chart-area-interactive-fridge.tsx`)
   - Card Name: "Expenses Tracking"
   - Description: Your expenses for the last 3 months

2. **ChartCategoryFlowFridge** (`components/fridge/chart-category-flow-fridge.tsx`)
   - Card Name: "Spending Category Rankings"
   - Description: Track how your spending priorities shift over time

3. **ChartExpensesPieFridge** (`components/fridge/chart-expenses-pie-fridge.tsx`)
   - Card Name: "Expense Breakdown"
   - Description: Distribution of your monthly expenses across categories

## Chart Component Files

All chart components are located in the `components/` directory:

- `chart-area-interactive.tsx` - Interactive area chart for income and expenses
- `chart-category-flow.tsx` - Area bump chart for category rankings over time
- `chart-expenses-pie.tsx` - Pie chart for expense breakdown
- `chart-spending-funnel.tsx` - Funnel chart for money flow
- `chart-savings-accumulation.tsx` - Area chart for savings over time
- `chart-circle-packing.tsx` - Circle packing chart for budget distribution
- `chart-polar-bar.tsx` - Polar bar chart for household spend mix
- `chart-radar.tsx` - Radar chart for financial health score
- `chart-sankey.tsx` - Sankey diagram for cash flow
- `chart-swarm-plot.tsx` - Swarm plot for transaction history
- `chart-treemap.tsx` - Treemap for net worth allocation
- `chart-transaction-calendar.tsx` - ECharts calendar heatmap for daily transaction activity (year-by-year with year selector and YTD option)

