// Run this in browser console on analytics page to get ALL current chart sizes
// This will show you the actual rendered sizes so you can tell me what defaults you want

const CHART_SIZES_STORAGE_KEY = 'analytics-chart-sizes';

// Get all chart IDs in order
const chartIds = [
  "incomeExpensesTracking1",
  "incomeExpensesTracking2", 
  "spendingCategoryRankings",
  "netWorthAllocation",
  "moneyFlow",
  "expenseBreakdown",
  "categoryBubbleMap",
  "householdSpendMix",
  "financialHealthScore",
  "spendingActivityRings",
  "spendingStreamgraph",
  "transactionHistory",
  "dayOfWeekSpending",
  "allMonthsCategorySpending",
  "singleMonthCategorySpending",
  "dayOfWeekCategory",
  "budgetDistribution"
];

// Chart titles mapping
const chartTitles = {
  "incomeExpensesTracking1": "Income & Expenses Tracking (1)",
  "incomeExpensesTracking2": "Income & Expenses Tracking (2)",
  "spendingCategoryRankings": "Spending Category Rankings",
  "netWorthAllocation": "Net Worth Allocation",
  "moneyFlow": "Money Flow",
  "expenseBreakdown": "Expense Breakdown",
  "categoryBubbleMap": "Category Bubble Map",
  "householdSpendMix": "Household Spend Mix",
  "financialHealthScore": "Financial Health Score",
  "spendingActivityRings": "Spending Activity Rings",
  "spendingStreamgraph": "Spending Streamgraph",
  "transactionHistory": "Transaction History",
  "dayOfWeekSpending": "Day of Week Spending by Category",
  "allMonthsCategorySpending": "All Months Category Spending",
  "singleMonthCategorySpending": "Single Month Category Spending",
  "dayOfWeekCategory": "Day of Week Category Spending",
  "budgetDistribution": "Budget Distribution"
};

console.log('=== CURRENT CHART SIZES ===\n');

// Method 1: Get from GridStack (most accurate)
let gridStackSizes = {};
const gridStackContainer = document.querySelector('.grid-stack');
if (gridStackContainer && window.GridStack) {
  const gridStackInstance = gridStackContainer.gridstack;
  if (gridStackInstance) {
    const nodes = gridStackInstance.engine.nodes;
    nodes.forEach(node => {
      const chartId = node.el?.getAttribute('data-chart-id');
      if (chartId && node.w && node.h) {
        gridStackSizes[chartId] = { w: node.w, h: node.h };
      }
    });
  }
}

// Method 2: Get from DOM
let domSizes = {};
const gridItems = document.querySelectorAll('.grid-stack-item');
gridItems.forEach(item => {
  const chartId = item.getAttribute('data-chart-id');
  if (chartId) {
    const w = parseInt(item.getAttribute('data-gs-w') || item.getAttribute('gs-w') || '0');
    const h = parseInt(item.getAttribute('data-gs-h') || item.getAttribute('gs-h') || '0');
    if (w > 0 && h > 0) {
      domSizes[chartId] = { w, h };
    }
  }
});

// Method 3: Get from localStorage
let localStorageSizes = {};
try {
  const saved = localStorage.getItem(CHART_SIZES_STORAGE_KEY);
  if (saved) {
    localStorageSizes = JSON.parse(saved);
  }
} catch (e) {}

// Combine: GridStack > DOM > localStorage
const allSizes = { ...localStorageSizes, ...domSizes, ...gridStackSizes };

// Output formatted list
chartIds.forEach((chartId, index) => {
  const title = chartTitles[chartId] || chartId;
  const size = allSizes[chartId] || { w: 12, h: 6 };
  console.log(`${index + 1}. ${title}`);
  console.log(`   Chart ID: ${chartId}`);
  console.log(`   Current Size: width=${size.w}, height=${size.h}`);
  console.log(`   Format: { w: ${size.w}, h: ${size.h} }`);
  console.log('');
});

console.log('\n=== COPY THIS FOR DEFAULTS ===');
const defaultSizesObj = {};
chartIds.forEach(chartId => {
  const size = allSizes[chartId] || { w: 12, h: 6 };
  defaultSizesObj[chartId] = { w: size.w, h: size.h };
});
console.log(JSON.stringify(defaultSizesObj, null, 2));






