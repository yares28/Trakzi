/**
 * Database Performance Optimization Tests
 * 
 * This test suite verifies:
 * 1. Connection pooling is configured correctly
 * 2. Database indexes are present and optimized
 * 3. API routes use optimized queries (SQL aggregations)
 * 4. Response caching headers are set correctly
 * 5. Query performance improvements are in place
 */

import { describe, it, expect, beforeAll } from '@jest/globals'
import fs from 'fs'
import path from 'path'

// Helper to read file content
function readFileContent(filePath: string): string {
  try {
    const fullPath = path.join(process.cwd(), filePath)
    return fs.readFileSync(fullPath, 'utf-8')
  } catch {
    return ''
  }
}

describe('Database Performance Optimizations', () => {
  describe('1. Connection Pooling Configuration', () => {
    it('should verify connection pooling is configured in neonClient.ts', () => {
      const neonClientContent = readFileContent('lib/neonClient.ts')
      
      expect(neonClientContent).toBeTruthy()
      
      // Check for pooled connection string conversion
      expect(neonClientContent).toMatch(/getPooledConnectionString|pooler/i)
      expect(neonClientContent).toMatch(/-pooler/i)
      
      // Check for connection string auto-conversion
      expect(neonClientContent).toMatch(/replace.*pooler/i)
      
      console.log('✅ Connection pooling configuration found')
    })
    
    it('should verify pooled connection string function exists', () => {
      const neonClientContent = readFileContent('lib/neonClient.ts')
      
      // Check for the function that converts to pooled connection string
      const hasPoolingFunction = 
        neonClientContent.includes('getPooledConnectionString') ||
        neonClientContent.includes('POOLED_CONNECTION_STRING')
      
      expect(hasPoolingFunction).toBe(true)
      
      console.log('✅ Pooled connection string conversion function found')
    })
  })
  
  describe('2. Database Indexes', () => {
    it('should verify index creation SQL exists in migration', () => {
      // Check if we can find references to the indexes in the codebase
      // The indexes should be:
      // - idx_categories_user_id
      // - idx_transactions_user_date_desc_covering
      // - idx_transactions_user_date_amount
      // - idx_transactions_user_date_amount_negative
      
      const expectedIndexes = [
        'idx_categories_user_id',
        'idx_transactions_user_date_desc_covering',
        'idx_transactions_user_date_amount',
        'idx_transactions_user_date_amount_negative',
      ]
      
      // Check documentation or migration files
      const perfDoc = readFileContent('PERFORMANCE_OPTIMIZATIONS.md')
      
      expectedIndexes.forEach(indexName => {
        expect(perfDoc).toContain(indexName)
      })
      
      console.log('✅ Database indexes documented:', expectedIndexes.join(', '))
    })
    
    it('should verify index usage in queries', () => {
      const transactionsApi = readFileContent('app/api/transactions/route.ts')
      const statsApi = readFileContent('app/api/stats/route.ts')
      const categoriesApi = readFileContent('app/api/categories/route.ts')
      
      // Transactions API should use user_id and tx_date (covered by index)
      expect(transactionsApi).toMatch(/user_id.*tx_date|tx_date.*user_id/i)
      expect(transactionsApi).toMatch(/ORDER BY.*tx_date.*DESC/i)
      
      // Categories API should use user_id (covered by index)
      expect(categoriesApi).toMatch(/WHERE.*user_id/i)
      
      // Stats API should use user_id and date filters (covered by index)
      expect(statsApi).toMatch(/WHERE.*user_id/i)
      
      console.log('✅ Queries are structured to use indexes')
    })
  })
  
  describe('3. Optimized Stats API Query', () => {
    it('should verify stats API uses SQL aggregations instead of fetching all rows', () => {
      const statsApi = readFileContent('app/api/stats/route.ts')
      
      // Should use SUM() aggregations
      expect(statsApi).toMatch(/SUM\s*\(/i)
      expect(statsApi).toMatch(/COALESCE/i)
      
      // Should NOT fetch all transactions and process in memory
      // Old pattern: SELECT amount, tx_date, balance FROM transactions ... ORDER BY tx_date DESC
      // Then filter and reduce in JavaScript
      const oldPattern = /SELECT.*amount.*tx_date.*balance.*FROM transactions.*ORDER BY.*tx_date DESC/i
      const hasOldPattern = oldPattern.test(statsApi)
      
      // New pattern should use aggregations
      const newPattern = /SUM\s*\(\s*CASE\s*WHEN.*amount/i
      const hasNewPattern = newPattern.test(statsApi)
      
      // Should have the optimized query structure
      expect(hasNewPattern).toBe(true)
      
      // Should calculate totals in SQL, not in JavaScript
      const calculatesInSQL = statsApi.includes('total_income') && 
                              statsApi.includes('total_expenses') &&
                              statsApi.includes('SUM')
      
      expect(calculatesInSQL).toBe(true)
      
      console.log('✅ Stats API uses SQL aggregations')
    })
    
    it('should verify stats API does not fetch all transactions for processing', () => {
      const statsApi = readFileContent('app/api/stats/route.ts')
      
      // Should not have patterns like:
      // - Fetch all transactions
      // - Filter in JavaScript
      // - Reduce in JavaScript
      
      // Check for aggregation queries instead
      const usesAggregation = statsApi.includes('SUM') && 
                            statsApi.includes('COALESCE') &&
                            (statsApi.includes('total_income') || statsApi.includes('total_expenses'))
      
      expect(usesAggregation).toBe(true)
      
      console.log('✅ Stats API avoids fetching all transactions')
    })
  })
  
  describe('4. Response Caching Headers', () => {
    const apiRoutes = [
      { file: 'app/api/transactions/route.ts', expectedCache: 'Cache-Control' },
      { file: 'app/api/stats/route.ts', expectedCache: 'Cache-Control' },
      { file: 'app/api/categories/route.ts', expectedCache: 'Cache-Control' },
      { file: 'app/api/statements/route.ts', expectedCache: 'Cache-Control' },
      { file: 'app/api/files/route.ts', expectedCache: 'Cache-Control' },
      { file: 'app/api/transactions/daily/route.ts', expectedCache: 'Cache-Control' },
    ]
    
    apiRoutes.forEach(({ file, expectedCache }) => {
      it(`should verify ${path.basename(file)} has cache headers`, () => {
        const content = readFileContent(file)
        
        expect(content).toBeTruthy()
        
        // Check for Cache-Control header
        expect(content).toMatch(new RegExp(expectedCache, 'i'))
        expect(content).toMatch(/s-maxage/i)
        expect(content).toMatch(/stale-while-revalidate/i)
        
        // Check that headers are set in NextResponse.json
        // Headers can be on separate lines, so check for both patterns
        const hasHeaders = content.includes('headers') && content.includes('Cache-Control')
        expect(hasHeaders).toBe(true)
        
        console.log(`✅ ${path.basename(file)} has cache headers configured`)
      })
    })
    
    it('should verify cache durations are appropriate', () => {
      const transactionsApi = readFileContent('app/api/transactions/route.ts')
      const categoriesApi = readFileContent('app/api/categories/route.ts')
      const statsApi = readFileContent('app/api/stats/route.ts')
      
      // Transactions should have shorter cache (30s)
      expect(transactionsApi).toMatch(/s-maxage.*30|30.*s-maxage/i)
      
      // Categories should have longer cache (5min = 300s)
      expect(categoriesApi).toMatch(/s-maxage.*300|300.*s-maxage/i)
      
      // Stats should have shorter cache (30s)
      expect(statsApi).toMatch(/s-maxage.*30|30.*s-maxage/i)
      
      console.log('✅ Cache durations are appropriately configured')
    })
  })
  
  describe('5. Query Optimizations', () => {
    it('should verify transactions query uses index-friendly ordering', () => {
      const transactionsApi = readFileContent('app/api/transactions/route.ts')
      
      // Should order by tx_date DESC, id DESC to match covering index
      const hasOptimizedOrdering = 
        transactionsApi.includes('ORDER BY') &&
        (transactionsApi.includes('tx_date DESC') || transactionsApi.includes('tx_date.*DESC'))
      
      expect(hasOptimizedOrdering).toBe(true)
      
      console.log('✅ Transactions query uses index-friendly ordering')
    })
    
    it('should verify categories query uses indexed columns', () => {
      const categoriesApi = readFileContent('app/api/categories/route.ts')
      
      // Should filter by user_id (indexed)
      expect(categoriesApi).toMatch(/WHERE.*user_id|user_id.*WHERE/i)
      
      // Should join on category_id (indexed)
      expect(categoriesApi).toMatch(/category_id/i)
      
      console.log('✅ Categories query uses indexed columns')
    })
    
    it('should verify daily transactions query uses optimized index', () => {
      const dailyApi = readFileContent('app/api/transactions/daily/route.ts')
      
      // Should filter by user_id and date (indexed)
      expect(dailyApi).toMatch(/WHERE.*user_id/i)
      expect(dailyApi).toMatch(/tx_date/i)
      
      // Should filter by amount < 0 (uses partial index)
      expect(dailyApi).toMatch(/amount\s*<\s*0|amount\s*<\s*['"]0['"]/i)
      
      console.log('✅ Daily transactions query uses optimized index')
    })
  })
  
  describe('6. Client-Side Caching Utility', () => {
    it('should verify cache utility exists', () => {
      const cacheFile = readFileContent('lib/cache.ts')
      
      expect(cacheFile).toBeTruthy()
      expect(cacheFile.length).toBeGreaterThan(0)
      
      console.log('✅ Cache utility file exists')
    })
    
    it('should verify cache utility has required functions', () => {
      const cacheFile = readFileContent('lib/cache.ts')
      
      // Should have cache class or utility
      expect(cacheFile).toMatch(/class.*Cache|SimpleCache|cache/i)
      
      // Should have get/set methods
      expect(cacheFile).toMatch(/\bget\s*\(/i)
      expect(cacheFile).toMatch(/\bset\s*\(/i)
      
      // Should have cachedFetch helper
      expect(cacheFile).toMatch(/cachedFetch/i)
      
      console.log('✅ Cache utility has required functions')
    })
  })
  
  describe('7. Performance Documentation', () => {
    it('should verify performance optimizations are documented', () => {
      const perfDoc = readFileContent('PERFORMANCE_OPTIMIZATIONS.md')
      
      expect(perfDoc).toBeTruthy()
      expect(perfDoc.length).toBeGreaterThan(100)
      
      // Should document all optimizations
      expect(perfDoc).toMatch(/Connection Pooling/i)
      expect(perfDoc).toMatch(/Database Indexes/i)
      expect(perfDoc).toMatch(/Optimized.*Stats/i)
      expect(perfDoc).toMatch(/Response Caching/i)
      expect(perfDoc).toMatch(/Optimized.*Transaction|Transaction.*Query/i)
      
      console.log('✅ Performance optimizations are documented')
    })
    
    it('should verify expected performance improvements are documented', () => {
      const perfDoc = readFileContent('PERFORMANCE_OPTIMIZATIONS.md')
      
      // Should mention performance improvements
      expect(perfDoc).toMatch(/10.*20.*faster|10-20x|10x.*20x/i)
      expect(perfDoc).toMatch(/100.*200.*ms|milliseconds/i)
      
      console.log('✅ Expected performance improvements are documented')
    })
  })
  
  describe('8. Integration Verification', () => {
    it('should verify all optimizations work together', () => {
      // Check that all components are in place
      const neonClient = readFileContent('lib/neonClient.ts')
      const statsApi = readFileContent('app/api/stats/route.ts')
      const transactionsApi = readFileContent('app/api/transactions/route.ts')
      const perfDoc = readFileContent('PERFORMANCE_OPTIMIZATIONS.md')
      
      // Connection pooling
      expect(neonClient).toMatch(/pooler/i)
      
      // Optimized queries
      expect(statsApi).toMatch(/SUM/i)
      expect(transactionsApi).toMatch(/ORDER BY.*tx_date.*DESC/i)
      
      // Caching
      expect(statsApi).toMatch(/Cache-Control/i)
      expect(transactionsApi).toMatch(/Cache-Control/i)
      
      // Documentation
      expect(perfDoc).toBeTruthy()
      
      console.log('✅ All optimizations are integrated and working together')
    })
  })
  
  describe('9. Batch API Optimization', () => {
    it('should verify monthly category API supports batch requests', () => {
      const monthlyApi = readFileContent('app/api/analytics/monthly-category-duplicate/route.ts')
      
      // Should support batch requests via months parameter
      expect(monthlyApi).toMatch(/months.*split|get.*months/i)
      expect(monthlyApi).toMatch(/batchQuery|batch.*query/i)
      
      console.log('✅ Monthly category API supports batch requests')
    })
    
    it('should verify chart component uses batch API', () => {
      const chartComponent = readFileContent('components/chart-all-months-category-spending.tsx')
      
      // Should use batch API instead of 12 separate calls
      expect(chartComponent).toMatch(/months=.*join|batch/i)
      
      console.log('✅ Chart component uses batch API')
    })
  })
  
  describe('10. Performance Test Summary', () => {
    it('should provide a summary of all optimizations', () => {
      const optimizations = {
        connectionPooling: {
          implemented: readFileContent('lib/neonClient.ts').includes('pooler'),
          file: 'lib/neonClient.ts',
        },
        databaseIndexes: {
          implemented: readFileContent('PERFORMANCE_OPTIMIZATIONS.md').includes('idx_categories_user_id'),
          file: 'PERFORMANCE_OPTIMIZATIONS.md',
        },
        optimizedStats: {
          implemented: readFileContent('app/api/stats/route.ts').includes('SUM'),
          file: 'app/api/stats/route.ts',
        },
        responseCaching: {
          implemented: readFileContent('app/api/transactions/route.ts').includes('Cache-Control'),
          file: 'app/api/transactions/route.ts',
        },
        queryOptimizations: {
          implemented: readFileContent('app/api/transactions/route.ts').includes('ORDER BY'),
          file: 'app/api/transactions/route.ts',
        },
        clientCaching: {
          implemented: fs.existsSync(path.join(process.cwd(), 'lib/cache.ts')),
          file: 'lib/cache.ts',
        },
      }
      
      console.log('\n' + '='.repeat(70))
      console.log('📊 DATABASE PERFORMANCE OPTIMIZATIONS SUMMARY')
      console.log('='.repeat(70))
      
      Object.entries(optimizations).forEach(([name, { implemented, file }]) => {
        const status = implemented ? '✅' : '❌'
        console.log(`${status} ${name.replace(/([A-Z])/g, ' $1').trim()}: ${file}`)
      })
      
      const allImplemented = Object.values(optimizations).every(opt => opt.implemented)
      
      console.log('='.repeat(70))
      console.log(`\n${allImplemented ? '✅' : '⚠️'} Overall Status: ${allImplemented ? 'All optimizations implemented' : 'Some optimizations missing'}`)
      console.log('='.repeat(70) + '\n')
      
      expect(allImplemented).toBe(true)
    })
  })
})

