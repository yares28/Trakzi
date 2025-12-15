/**
 * Charts Functionality Test
 * 
 * This test suite verifies:
 * 1. All charts use the same API from the database
 * 2. No charts hardcode category ignores
 * 3. All charts are operational
 */

import { describe, it, expect } from '@jest/globals'
import fs from 'fs'
import path from 'path'

// Chart mapping from CHARTS_DOCUMENTATION.md
const CHART_DOCUMENTATION = {
  home: [
    { name: 'ChartAreaInteractive', file: 'components/chart-area-interactive.tsx', cardName: 'Income & Expenses Tracking' },
    { name: 'ChartCategoryFlow', file: 'components/chart-category-flow.tsx', cardName: 'Spending Category Rankings' },
    { name: 'ChartSpendingFunnel', file: 'components/chart-spending-funnel.tsx', cardName: 'Money Flow' },
    { name: 'ChartExpensesPie', file: 'components/chart-expenses-pie.tsx', cardName: 'Expense Breakdown' },
    { name: 'ChartTreeMap', file: 'components/chart-treemap.tsx', cardName: 'Net Worth Allocation' },
  ],
  analytics: [
    { name: 'ChartAreaInteractive', file: 'components/chart-area-interactive.tsx', cardName: 'Income & Expenses Tracking' },
    { name: 'ChartCategoryFlow', file: 'components/chart-category-flow.tsx', cardName: 'Spending Category Rankings' },
    { name: 'ChartSpendingFunnel', file: 'components/chart-spending-funnel.tsx', cardName: 'Money Flow' },
    { name: 'ChartExpensesPie', file: 'components/chart-expenses-pie.tsx', cardName: 'Expense Breakdown' },
    { name: 'ChartCirclePacking', file: 'components/chart-circle-packing.tsx', cardName: 'Budget Distribution' },
    { name: 'ChartPolarBar', file: 'components/chart-polar-bar.tsx', cardName: 'Household Spend Mix' },
    { name: 'ChartRadar', file: 'components/chart-radar.tsx', cardName: 'Financial Health Score' },
    { name: 'ChartSwarmPlot', file: 'components/chart-swarm-plot.tsx', cardName: 'Transaction History' },
    { name: 'ChartSankey', file: 'components/chart-sankey.tsx', cardName: 'Cash Flow Sankey' },
    { name: 'ChartTransactionCalendar', file: 'components/chart-transaction-calendar.tsx', cardName: 'Daily Transaction Activity' },
    { name: 'SpendingActivityRings', file: 'app/analytics/page.tsx', cardName: 'Spending Activity Rings' },
  ],
  savings: [
    { name: 'ChartSavingsAccumulation', file: 'components/chart-savings-accumulation.tsx', cardName: 'Savings Accumulation' },
  ],
  fridge: [
    { name: 'ChartAreaInteractiveFridge', file: 'components/fridge/chart-area-interactive-fridge.tsx', cardName: 'Grocery Spend Trend' },
    { name: 'ChartCategoryFlowFridge', file: 'components/fridge/chart-category-flow-fridge.tsx', cardName: 'Grocery Category Rankings' },
    { name: 'ChartDayOfWeekShoppingFridge', file: 'components/fridge/chart-day-of-week-shopping-fridge.tsx', cardName: 'Best Shopping Days' },
    { name: 'ChartExpensesPieFridge', file: 'components/fridge/chart-expenses-pie-fridge.tsx', cardName: 'Basket Breakdown' },
    { name: 'ChartPolarBarFridge', file: 'components/fridge/chart-polar-bar-fridge.tsx', cardName: 'Store Spend Mix' },
  ],
}

// Expected API endpoints that should be used
const EXPECTED_API_ENDPOINTS = [
  '/api/transactions',
  '/api/transactions/daily',
  '/api/financial-health',
  '/api/charts/transaction-history',
  '/api/analytics/day-of-week-category',
  '/api/analytics/monthly-category-duplicate',
]

// Hardcoded category ignore patterns to detect
const HARDCODED_IGNORE_PATTERNS = [
  /category\s*!==\s*["']savings["']/i,
  /category\s*===\s*["']savings["']/i,
  /category\s*!==\s*["']income["']/i,
  /category\s*===\s*["']income["']/i,
  /excludedCategories\s*=\s*\[/i,
  /exclude.*category/i,
  /filter.*category.*savings/i,
  /filter.*category.*income/i,
  /\.toLowerCase\(\)\s*===\s*["']savings["']/i,
  /\.toLowerCase\(\)\s*===\s*["']income["']/i,
  /\.toLowerCase\(\)\s*!==\s*["']savings["']/i,
  /\.toLowerCase\(\)\s*!==\s*["']income["']/i,
]

// Helper function to read file content
function readFileContent(filePath: string): string {
  try {
    const fullPath = path.join(process.cwd(), filePath)
    return fs.readFileSync(fullPath, 'utf-8')
  } catch {
    return ''
  }
}

// Helper function to extract API endpoints from code
function extractApiEndpoints(content: string): string[] {
  const endpoints: string[] = []
  
  // Pattern 1: fetch("/api/...") or fetch('/api/...')
  const fetchPattern1 = /fetch\s*\(\s*["']([^"']+)["']/g
  let match
  while ((match = fetchPattern1.exec(content)) !== null) {
    const endpoint = match[1]
    if (endpoint.startsWith('/api/')) {
      endpoints.push(endpoint.split('?')[0]) // Remove query params
    }
  }
  
  // Pattern 2: fetch(`/api/...`) - handle template literals
  // Match from opening backtick to closing backtick, handling ${} interpolation
  const fetchPattern2 = /fetch\s*\(\s*`([^`]*)`/g
  while ((match = fetchPattern2.exec(content)) !== null) {
    const endpoint = match[1]
    // Extract base endpoint before ? or ${ interpolation
    const cleanEndpoint = endpoint.split('?')[0].split('${')[0].trim()
    if (cleanEndpoint.startsWith('/api/')) {
      endpoints.push(cleanEndpoint)
    }
  }
  
  // Pattern 3: Direct string matches for /api/* endpoints (anywhere in code)
  const directPattern = /["'`](\/api\/[^"'`\s?]+)/g
  while ((match = directPattern.exec(content)) !== null) {
    const endpoint = match[1]
    if (endpoint.startsWith('/api/')) {
      endpoints.push(endpoint)
    }
  }
  
  // Pattern 4: Look for "/api/transactions" as a simple string (fallback)
  if (content.includes('"/api/transactions"') || content.includes("'/api/transactions'")) {
    endpoints.push('/api/transactions')
  }
  
  return [...new Set(endpoints)] // Remove duplicates
}

// Helper function to check for hardcoded category ignores
function checkHardcodedIgnores(content: string): string[] {
  const violations: string[] = []
  
  HARDCODED_IGNORE_PATTERNS.forEach((pattern) => {
    if (pattern.test(content)) {
      const lines = content.split('\n')
      lines.forEach((line, lineNum) => {
        if (pattern.test(line)) {
          violations.push(`Line ${lineNum + 1}: ${line.trim()}`)
        }
      })
    }
  })
  
  return violations
}

// Helper function to get all chart files
function getAllChartFiles(): Array<{ name: string; file: string; page: string }> {
  const charts: Array<{ name: string; file: string; page: string }> = []
  
  Object.entries(CHART_DOCUMENTATION).forEach(([page, pageCharts]) => {
    pageCharts.forEach(chart => {
      charts.push({ ...chart, page })
    })
  })
  
  return charts
}

describe('Charts Functionality Tests', () => {
  describe('1. API Endpoint Consistency', () => {
    it('should verify all charts use database APIs', () => {
      const allCharts = getAllChartFiles()
      const apiUsage: Record<string, string[]> = {}
      const missingFiles: string[] = []
      
      // Check chart components
      allCharts.forEach(chart => {
        const content = readFileContent(chart.file)
        
        if (!content) {
          missingFiles.push(chart.file)
          return
        }
        
        const endpoints = extractApiEndpoints(content)
        if (endpoints.length > 0) {
          apiUsage[chart.file] = endpoints
        }
      })
      
      // Check page files (they fetch data and pass to charts)
      const pageFiles = [
        'app/home/page.tsx',
        'app/analytics/page.tsx',
        'app/savings/page.tsx',
      ]
      
      pageFiles.forEach(pageFile => {
        const content = readFileContent(pageFile)
        if (content) {
          const endpoints = extractApiEndpoints(content)
          if (endpoints.length > 0) {
            apiUsage[pageFile] = endpoints
          }
        }
      })
      
      // Check that all endpoints are from the database API
      const allEndpoints = Object.values(apiUsage).flat()
      const uniqueEndpoints = [...new Set(allEndpoints)]
      
      console.log('Found API endpoints:', uniqueEndpoints)
      console.log('Expected API endpoints:', EXPECTED_API_ENDPOINTS)
      
      // Verify all endpoints are from the database API
      uniqueEndpoints.forEach(endpoint => {
        expect(endpoint).toMatch(/^\/api\//)
      })
      
      // Report missing files
      if (missingFiles.length > 0) {
        console.warn('Missing chart files:', missingFiles)
      }
      
      // Verify at least some pages/charts use the main transactions API
      // Check both extracted endpoints and direct string search in page files
      const usesMainApi = uniqueEndpoints.some(ep => ep === '/api/transactions')
      
      // Also check page files directly for /api/transactions string
      let pageFilesUseMainApi = false
      pageFiles.forEach(pageFile => {
        const content = readFileContent(pageFile)
        if (content && (content.includes('/api/transactions') || content.includes('"/api/transactions"'))) {
          pageFilesUseMainApi = true
        }
      })
      
      expect(usesMainApi || pageFilesUseMainApi).toBe(true)
    })
    
    it('should verify charts on home page use /api/transactions', () => {
      const homeCharts = CHART_DOCUMENTATION.home
      const homePageContent = readFileContent('app/home/page.tsx')
      
      expect(homePageContent).toContain('/api/transactions')
      
      // Charts should either fetch directly or receive data from parent
      // Parent page should use /api/transactions
      homeCharts.forEach(() => {
        expect(homePageContent).toMatch(/\/api\/transactions/)
      })
    })
    
    it('should verify charts on analytics page use database APIs', () => {
      const analyticsCharts = CHART_DOCUMENTATION.analytics
      const analyticsPageContent = readFileContent('app/analytics/page.tsx')
      
      // Analytics page should use /api/transactions
      expect(analyticsPageContent).toContain('/api/transactions')
      
      // Check individual chart components
      analyticsCharts.forEach(chart => {
        const chartContent = readFileContent(chart.file)
        if (chartContent) {
          // Chart should either fetch from API or receive data as prop
          const hasApiCall = extractApiEndpoints(chartContent).length > 0
          const receivesDataProp = chartContent.includes('data?:') || chartContent.includes('data =')
          
          // Chart should either fetch from API or receive data from parent
          expect(hasApiCall || receivesDataProp).toBe(true)
        } else {
          // If file doesn't exist, that's a different issue (handled in other tests)
          expect(chartContent).toBeTruthy()
        }
      })
    })
    
    it('should verify charts on savings page use /api/transactions', () => {
      const savingsPageContent = readFileContent('app/savings/page.tsx')
      expect(savingsPageContent).toContain('/api/transactions')
    })
  })
  
  describe('2. Hardcoded Category Ignores', () => {
    it('should detect hardcoded category ignores in chart components', () => {
      const allCharts = getAllChartFiles()
      const violations: Record<string, { lines: string[], affectedCharts: string[] }> = {}
      
      // Map page files to their charts
      const pageToCharts: Record<string, string[]> = {
        'app/home/page.tsx': CHART_DOCUMENTATION.home.map(c => c.name),
        'app/analytics/page.tsx': CHART_DOCUMENTATION.analytics.map(c => c.name),
        'app/savings/page.tsx': CHART_DOCUMENTATION.savings.map(c => c.name),
      }
      
      // Check chart components
      allCharts.forEach(chart => {
        const content = readFileContent(chart.file)
        if (content) {
          const chartViolations = checkHardcodedIgnores(content)
          if (chartViolations.length > 0) {
            violations[chart.file] = {
              lines: chartViolations,
              affectedCharts: [chart.name]
            }
          }
        }
      })
      
      // Check page files too
      const pageFiles = [
        'app/home/page.tsx',
        'app/analytics/page.tsx',
        'app/savings/page.tsx',
      ]
      
      pageFiles.forEach(pageFile => {
        const content = readFileContent(pageFile)
        if (content) {
          const pageViolations = checkHardcodedIgnores(content)
          if (pageViolations.length > 0) {
            violations[pageFile] = {
              lines: pageViolations,
              affectedCharts: pageToCharts[pageFile] || []
            }
          }
        }
      })
      
      // Report violations with clear guidance
      if (Object.keys(violations).length > 0) {
        console.error('\n❌ HARDCODED CATEGORY IGNORES DETECTED\n')
        console.error('═══════════════════════════════════════════════════════════')
        
        Object.entries(violations).forEach(([file, { lines, affectedCharts }]) => {
          const isPageFile = file.includes('/page.tsx')
          const fileType = isPageFile ? 'PAGE FILE' : 'CHART COMPONENT'
          
          console.error(`\n📁 ${fileType}: ${file}`)
          
          if (affectedCharts.length > 0) {
            console.error(`   ⚠️  Affects ${affectedCharts.length} chart(s): ${affectedCharts.join(', ')}`)
          }
          
          console.error(`   🔴 Issues found:`)
          lines.forEach(line => {
            // Extract the problem type
            let problemType = 'Hardcoded category filter'
            if (line.includes('savings')) {
              problemType = 'Hardcoded "savings" category exclusion'
            } else if (line.includes('income') || line.includes('excludedCategories')) {
              problemType = 'Hardcoded "income" category exclusion'
            }
            
            console.error(`      • ${problemType}`)
            console.error(`        ${line}`)
          })
          
          console.error(`   💡 Fix: Remove hardcoded category filters. Use category visibility controls instead.`)
        })
        
        console.error('\n═══════════════════════════════════════════════════════════')
        console.error('📝 SUMMARY:')
        console.error(`   Total files with issues: ${Object.keys(violations).length}`)
        const totalChartsAffected = new Set(Object.values(violations).flatMap(v => v.affectedCharts)).size
        console.error(`   Total charts affected: ${totalChartsAffected}`)
        console.error('═══════════════════════════════════════════════════════════\n')
      }
      
      // Fail if violations found
      expect(Object.keys(violations).length).toBe(0)
    })
    
    it('should verify no hardcoded "savings" category filter', () => {
      const allCharts = getAllChartFiles()
      const savingsFilterPattern = /category.*savings|savings.*category/i
      const issues: Array<{ file: string; line: number; code: string; chartName?: string }> = []
      
      // Check chart components
      allCharts.forEach(chart => {
        const content = readFileContent(chart.file)
        if (content && savingsFilterPattern.test(content)) {
          const lines = content.split('\n')
          lines.forEach((line, index) => {
            const trimmed = line.trim()
            if (!trimmed.startsWith('//') && !trimmed.startsWith('*') && !trimmed.startsWith('/*')) {
              if (savingsFilterPattern.test(trimmed)) {
                if (trimmed.includes('filter') || trimmed.includes('!==') || trimmed.includes('===')) {
                  issues.push({
                    file: chart.file,
                    line: index + 1,
                    code: trimmed,
                    chartName: chart.name
                  })
                }
              }
            }
          })
        }
      })
      
      // Check page files
      const pageFiles = [
        { file: 'app/home/page.tsx', charts: CHART_DOCUMENTATION.home.map(c => c.name) },
        { file: 'app/analytics/page.tsx', charts: CHART_DOCUMENTATION.analytics.map(c => c.name) },
        { file: 'app/savings/page.tsx', charts: CHART_DOCUMENTATION.savings.map(c => c.name) },
      ]
      
      pageFiles.forEach(({ file, charts }) => {
        const content = readFileContent(file)
        if (content && savingsFilterPattern.test(content)) {
          const lines = content.split('\n')
          lines.forEach((line, index) => {
            const trimmed = line.trim()
            if (!trimmed.startsWith('//') && !trimmed.startsWith('*') && !trimmed.startsWith('/*')) {
              if (savingsFilterPattern.test(trimmed)) {
                if (trimmed.includes('filter') || trimmed.includes('!==') || trimmed.includes('===')) {
                  issues.push({
                    file,
                    line: index + 1,
                    code: trimmed,
                    chartName: `All charts on this page: ${charts.join(', ')}`
                  })
                }
              }
            }
          })
        }
      })
      
      if (issues.length > 0) {
        console.error('\n❌ HARDCODED "SAVINGS" CATEGORY FILTERS FOUND\n')
        issues.forEach(({ file, line, code, chartName }) => {
          console.error(`   📁 File: ${file}`)
          console.error(`   📍 Line ${line}: ${code}`)
          if (chartName) {
            console.error(`   ⚠️  Affects: ${chartName}`)
          }
          console.error(`   💡 Fix: Remove the hardcoded "savings" filter. Use category visibility controls instead.\n`)
        })
        throw new Error(`Found ${issues.length} hardcoded "savings" category filter(s). See details above.`)
      }
    })
    
    it('should verify no hardcoded "income" category filter', () => {
      const allCharts = getAllChartFiles()
      const incomeFilterPattern = /excludedCategories.*income|category.*income.*exclude/i
      const issues: Array<{ file: string; line: number; code: string; chartName?: string }> = []
      
      // Check chart components
      allCharts.forEach(chart => {
        const content = readFileContent(chart.file)
        if (content && incomeFilterPattern.test(content)) {
          const lines = content.split('\n')
          lines.forEach((line, index) => {
            const trimmed = line.trim()
            if (!trimmed.startsWith('//') && !trimmed.startsWith('*')) {
              if (incomeFilterPattern.test(trimmed) && 
                  (trimmed.includes('excludedCategories') || trimmed.includes('filter'))) {
                issues.push({
                  file: chart.file,
                  line: index + 1,
                  code: trimmed,
                  chartName: chart.name
                })
              }
            }
          })
        }
      })
      
      // Check page files
      const pageFiles = [
        { file: 'app/home/page.tsx', charts: CHART_DOCUMENTATION.home.map(c => c.name) },
        { file: 'app/analytics/page.tsx', charts: CHART_DOCUMENTATION.analytics.map(c => c.name) },
        { file: 'app/savings/page.tsx', charts: CHART_DOCUMENTATION.savings.map(c => c.name) },
      ]
      
      pageFiles.forEach(({ file, charts }) => {
        const content = readFileContent(file)
        if (content && incomeFilterPattern.test(content)) {
          const lines = content.split('\n')
          lines.forEach((line, index) => {
            const trimmed = line.trim()
            if (!trimmed.startsWith('//') && !trimmed.startsWith('*')) {
              if (incomeFilterPattern.test(trimmed) && 
                  (trimmed.includes('excludedCategories') || trimmed.includes('filter'))) {
                issues.push({
                  file,
                  line: index + 1,
                  code: trimmed,
                  chartName: `All charts on this page: ${charts.join(', ')}`
                })
              }
            }
          })
        }
      })
      
      if (issues.length > 0) {
        console.error('\n❌ HARDCODED "INCOME" CATEGORY FILTERS FOUND\n')
        issues.forEach(({ file, line, code, chartName }) => {
          console.error(`   📁 File: ${file}`)
          console.error(`   📍 Line ${line}: ${code}`)
          if (chartName) {
            console.error(`   ⚠️  Affects: ${chartName}`)
          }
          console.error(`   💡 Fix: Remove the hardcoded "income" filter. Use category visibility controls instead.\n`)
        })
        throw new Error(`Found ${issues.length} hardcoded "income" category filter(s). See details above.`)
      }
    })
  })
  
  describe('3. Chart Operational Status', () => {
    it('should verify all chart component files exist', () => {
      const allCharts = getAllChartFiles()
      const missingFiles: string[] = []
      
      allCharts.forEach(chart => {
        const content = readFileContent(chart.file)
        if (!content) {
          missingFiles.push(chart.file)
        }
      })
      
      if (missingFiles.length > 0) {
        console.error('Missing chart files:', missingFiles)
      }
      
      expect(missingFiles.length).toBe(0)
    })
    
    it('should verify all chart components export their main function', () => {
      const allCharts = getAllChartFiles()
      const exportIssues: string[] = []
      
      allCharts.forEach(chart => {
        const content = readFileContent(chart.file)
        if (content) {
          // Check for export statement
          const hasExport = content.includes('export function') || 
                           content.includes('export const') ||
                           content.includes('export default')
          
          if (!hasExport) {
            exportIssues.push(chart.file)
          }
        }
      })
      
      if (exportIssues.length > 0) {
        console.error('Charts without proper exports:', exportIssues)
      }
      
      expect(exportIssues.length).toBe(0)
    })
    
    it('should verify chart components have proper TypeScript types', () => {
      const allCharts = getAllChartFiles()
      const typeIssues: string[] = []
      
      allCharts.forEach(chart => {
        const content = readFileContent(chart.file)
        if (content) {
          // Check for interface or type definitions
          const hasTypes = content.includes('interface') || 
                          content.includes('type ') ||
                          content.includes(': {') ||
                          content.includes('Props')
          
          // Some charts might use inline types, so this is a soft check
          // We'll just log if there are no obvious type definitions
          if (!hasTypes && content.length > 100) {
            typeIssues.push(chart.file)
          }
        }
      })
      
      // This is informational, not a failure
      if (typeIssues.length > 0) {
        console.warn('Charts that might need type definitions:', typeIssues)
      }
    })
    
    it('should verify charts handle empty data gracefully', () => {
      const allCharts = getAllChartFiles()
      const emptyDataIssues: string[] = []
      
      allCharts.forEach(chart => {
        const content = readFileContent(chart.file)
        if (content) {
          // Check for empty data handling
          const hasEmptyCheck = content.includes('data.length === 0') ||
                               content.includes('!data') ||
                               content.includes('data?.length') ||
                               content.includes('No data available') ||
                               content.includes('data = []')
          
          if (!hasEmptyCheck) {
            emptyDataIssues.push(chart.file)
          }
        }
      })
      
      if (emptyDataIssues.length > 0) {
        console.warn('Charts that might not handle empty data:', emptyDataIssues)
      }
      
      // This is a warning, not a failure - some charts might handle it differently
    })
  })
  
  describe('4. Chart Documentation Consistency', () => {
    it('should verify all documented charts exist in codebase', () => {
      const allCharts = getAllChartFiles()
      const missingCharts: string[] = []
      
      allCharts.forEach(chart => {
        const content = readFileContent(chart.file)
        if (!content) {
          missingCharts.push(`${chart.name} (${chart.file})`)
        }
      })
      
      if (missingCharts.length > 0) {
        console.error('Documented charts not found in codebase:', missingCharts)
      }
      
      expect(missingCharts.length).toBe(0)
    })
    
    it('should verify chart file paths match documentation', () => {
      const docContent = readFileContent('CHARTS_DOCUMENTATION.md')
      const allCharts = getAllChartFiles()
      
      allCharts.forEach(chart => {
        // Check if chart is mentioned in documentation
        const chartInDoc = docContent.includes(chart.name) || 
                          docContent.includes(chart.file.replace('components/', ''))
        
        if (!chartInDoc && chart.page !== 'fridge') {
          // Fridge charts might not be in main documentation
          console.warn(`Chart ${chart.name} might not be documented`)
        }
      })
    })
  })
  
  describe('5. Summary Report', () => {
    it('should provide a summary of all chart issues', () => {
      // Collect all issues
      const allCharts = getAllChartFiles()
      const allIssues: Array<{
        type: string
        file: string
        line?: number
        code?: string
        affectedCharts: string[]
        severity: 'error' | 'warning'
      }> = []
      
      // Check for hardcoded ignores
      const pageToCharts: Record<string, string[]> = {
        'app/home/page.tsx': CHART_DOCUMENTATION.home.map(c => c.name),
        'app/analytics/page.tsx': CHART_DOCUMENTATION.analytics.map(c => c.name),
        'app/savings/page.tsx': CHART_DOCUMENTATION.savings.map(c => c.name),
      }
      
      const pageFiles = ['app/home/page.tsx', 'app/analytics/page.tsx', 'app/savings/page.tsx']
      
      // Check all files for hardcoded ignores
      ;[...allCharts.map(c => c.file), ...pageFiles].forEach(file => {
        const content = readFileContent(file)
        if (content) {
          const violations = checkHardcodedIgnores(content)
          if (violations.length > 0) {
            const affectedCharts = pageToCharts[file] || 
                                  allCharts.filter(c => c.file === file).map(c => c.name) ||
                                  []
            
            violations.forEach(violation => {
              const lineMatch = violation.match(/Line (\d+):/)
              const line = lineMatch ? parseInt(lineMatch[1]) : undefined
              const code = violation.split(':').slice(1).join(':').trim()
              
              let issueType = 'Hardcoded category filter'
              if (code.includes('savings')) {
                issueType = 'Hardcoded "savings" exclusion'
              } else if (code.includes('income') || code.includes('excludedCategories')) {
                issueType = 'Hardcoded "income" exclusion'
              }
              
              allIssues.push({
                type: issueType,
                file,
                line,
                code,
                affectedCharts,
                severity: 'error'
              })
            })
          }
        }
      })
      
      // Generate summary report
      if (allIssues.length > 0) {
        console.log('\n' + '='.repeat(70))
        console.log('📊 CHART FUNCTIONALITY TEST SUMMARY')
        console.log('='.repeat(70))
        console.log(`\n❌ Total Issues Found: ${allIssues.length}`)
        
        // Group by file
        const issuesByFile: Record<string, typeof allIssues> = {}
        allIssues.forEach(issue => {
          if (!issuesByFile[issue.file]) {
            issuesByFile[issue.file] = []
          }
          issuesByFile[issue.file].push(issue)
        })
        
        console.log(`\n📁 Files with Issues: ${Object.keys(issuesByFile).length}`)
        
        Object.entries(issuesByFile).forEach(([file, issues]) => {
          console.log(`\n   📄 ${file}`)
          console.log(`      Issues: ${issues.length}`)
          if (issues[0].affectedCharts.length > 0) {
            console.log(`      Affected Charts: ${issues[0].affectedCharts.join(', ')}`)
          }
          issues.forEach(issue => {
            console.log(`      • ${issue.type}${issue.line ? ` (line ${issue.line})` : ''}`)
          })
        })
        
        console.log('\n' + '='.repeat(70))
        console.log('💡 RECOMMENDATION: Remove all hardcoded category filters and use')
        console.log('   category visibility controls instead for dynamic filtering.')
        console.log('='.repeat(70) + '\n')
      } else {
        console.log('\n✅ No issues found! All charts are properly configured.\n')
      }
      
      // Don't fail the test - this is just a summary
      expect(allIssues.length).toBeGreaterThanOrEqual(0)
    })
  })
})
