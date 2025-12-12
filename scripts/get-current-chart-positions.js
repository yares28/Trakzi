// Script to get current chart sizes AND positions from GridStack and localStorage
// Run this in the browser console on the analytics page
// This will output the full format including x and y positions for DEFAULT_CHART_SIZES

const CHART_SIZES_STORAGE_KEY = 'analytics-chart-sizes';

try {
  // Method 1: Get from GridStack internal state (most accurate)
  const gridStackContainer = document.querySelector('.grid-stack');
  let gridStackSizes = {};
  
  if (gridStackContainer && window.GridStack) {
    // Try to access GridStack instance
    const gridStackInstance = gridStackContainer.gridstack;
    if (gridStackInstance) {
      const nodes = gridStackInstance.engine.nodes;
      nodes.forEach(node => {
        const chartId = node.el?.getAttribute('data-chart-id');
        if (chartId && node.w && node.h) {
          gridStackSizes[chartId] = { 
            w: node.w, 
            h: node.h,
            x: node.x,
            y: node.y
          };
        }
      });
      console.log('GridStack Internal State (with positions):');
      console.log(JSON.stringify(gridStackSizes, null, 2));
    }
  }
  
  // Method 2: Get from DOM attributes
  const gridItems = document.querySelectorAll('.grid-stack-item');
  const domSizes = {};
  gridItems.forEach(item => {
    const chartId = item.getAttribute('data-chart-id');
    if (chartId) {
      const w = parseInt(item.getAttribute('data-gs-w') || item.getAttribute('gs-w') || '0');
      const h = parseInt(item.getAttribute('data-gs-h') || item.getAttribute('gs-h') || '0');
      const x = parseInt(item.getAttribute('data-gs-x') || item.getAttribute('gs-x') || '0');
      const y = parseInt(item.getAttribute('data-gs-y') || item.getAttribute('gs-y') || '0');
      if (w > 0 && h > 0) {
        domSizes[chartId] = { w, h, x, y };
      }
    }
  });
  
  console.log('\nDOM Attribute Sizes (with positions):');
  console.log(JSON.stringify(domSizes, null, 2));
  
  // Method 3: Get from localStorage
  const saved = localStorage.getItem(CHART_SIZES_STORAGE_KEY);
  let localStorageSizes = {};
  if (saved) {
    localStorageSizes = JSON.parse(saved);
    console.log('\nLocalStorage Sizes (with positions):');
    console.log(JSON.stringify(localStorageSizes, null, 2));
  }
  
  // Combine: GridStack > DOM > localStorage (GridStack is most accurate)
  const allSizes = { ...localStorageSizes, ...domSizes, ...gridStackSizes };
  
  // Extract w, h, x, y for DEFAULT_CHART_SIZES
  const defaultSizes = {};
  Object.keys(allSizes).forEach(chartId => {
    defaultSizes[chartId] = { 
      w: allSizes[chartId].w || 12, 
      h: allSizes[chartId].h || 6,
      x: allSizes[chartId].x ?? 0,
      y: allSizes[chartId].y ?? 0
    };
  });
  
  console.log('\n=== FINAL DEFAULT SIZES WITH POSITIONS (copy this) ===');
  console.log(JSON.stringify(defaultSizes, null, 2));
  
  // Also output as code format for easy copy-paste
  console.log('\n=== CODE FORMAT (ready to paste) ===');
  const codeFormat = Object.keys(defaultSizes)
    .sort() // Sort alphabetically for consistency
    .map(id => {
      const size = defaultSizes[id];
      return `    "${id}": { w: ${size.w}, h: ${size.h}, x: ${size.x}, y: ${size.y} },`;
    })
    .join('\n');
  console.log(codeFormat);
  
  // Also output in the exact order they appear in analyticsChartOrder
  const chartOrder = [
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
    "budgetDistribution",
  ];
  
  console.log('\n=== CODE FORMAT (in chart order) ===');
  const orderedCodeFormat = chartOrder
    .filter(id => defaultSizes[id]) // Only include charts that exist
    .map(id => {
      const size = defaultSizes[id];
      return `    "${id}": { w: ${size.w}, h: ${size.h}, x: ${size.x}, y: ${size.y} },`;
    })
    .join('\n');
  console.log(orderedCodeFormat);
  
} catch (error) {
  console.error('Error reading chart sizes:', error);
  console.log('\nFallback: Getting from DOM only...');
  
  const gridItems = document.querySelectorAll('.grid-stack-item');
  const sizes = {};
  gridItems.forEach(item => {
    const chartId = item.getAttribute('data-chart-id');
    if (chartId) {
      const w = parseInt(item.getAttribute('data-gs-w') || '12');
      const h = parseInt(item.getAttribute('data-gs-h') || '6');
      const x = parseInt(item.getAttribute('data-gs-x') || '0');
      const y = parseInt(item.getAttribute('data-gs-y') || '0');
      sizes[chartId] = { w, h, x, y };
    }
  });
  console.log(JSON.stringify(sizes, null, 2));
}



























