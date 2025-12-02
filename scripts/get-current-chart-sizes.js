// Script to get current chart sizes from GridStack and localStorage
// Run this in the browser console on the analytics page

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
      console.log('GridStack Internal State:');
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
  
  console.log('\nDOM Attribute Sizes:');
  console.log(JSON.stringify(domSizes, null, 2));
  
  // Method 3: Get from localStorage
  const saved = localStorage.getItem(CHART_SIZES_STORAGE_KEY);
  let localStorageSizes = {};
  if (saved) {
    localStorageSizes = JSON.parse(saved);
    console.log('\nLocalStorage Sizes:');
    console.log(JSON.stringify(localStorageSizes, null, 2));
  }
  
  // Combine: GridStack > DOM > localStorage
  const allSizes = { ...localStorageSizes, ...domSizes, ...gridStackSizes };
  
  // Extract just w and h for DEFAULT_CHART_SIZES
  const defaultSizes = {};
  Object.keys(allSizes).forEach(chartId => {
    defaultSizes[chartId] = { 
      w: allSizes[chartId].w || 12, 
      h: allSizes[chartId].h || 6 
    };
  });
  
  console.log('\n=== FINAL DEFAULT SIZES (copy this) ===');
  console.log(JSON.stringify(defaultSizes, null, 2));
  
  // Also output as code format
  console.log('\n=== CODE FORMAT ===');
  const codeFormat = Object.keys(defaultSizes).map(id => {
    return `  "${id}": { w: ${defaultSizes[id].w}, h: ${defaultSizes[id].h} },`;
  }).join('\n');
  console.log(codeFormat);
  
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
      sizes[chartId] = { w, h };
    }
  });
  console.log(JSON.stringify(sizes, null, 2));
}

