import { computeMonthsElapsed, buildBudgetRows } from '@/lib/charts/budgets-aggregations'

describe('computeMonthsElapsed', () => {
  it('returns ~1 for last30days', () => {
    expect(computeMonthsElapsed('last30days')).toBeCloseTo(0.986, 1)
  })
  it('returns ~3 for last3months', () => {
    expect(computeMonthsElapsed('last3months')).toBeCloseTo(2.99, 1)
  })
  it('returns ~6 for last6months', () => {
    expect(computeMonthsElapsed('last6months')).toBeCloseTo(5.98, 1)
  })
  it('returns 0 for null', () => {
    expect(computeMonthsElapsed(null)).toBe(0)
  })
  it('returns positive value for custom range', () => {
    expect(computeMonthsElapsed('custom:2025-01-01:2025-03-31')).toBeGreaterThan(2.5)
  })
})

describe('buildBudgetRows', () => {
  const rawRows = [
    { category_id: '1', name: 'Groceries', color: '#10b981', monthly_cap: '300', month: '2025-01-01', month_spend: '350' },
    { category_id: '1', name: 'Groceries', color: '#10b981', monthly_cap: '300', month: '2025-02-01', month_spend: '250' },
    { category_id: '2', name: 'Dining',    color: '#f97316', monthly_cap: null,   month: '2025-01-01', month_spend: '120' },
  ]
  const monthsElapsed = 3

  it('separates budgeted categories from suggestions', () => {
    const { categories, suggestions } = buildBudgetRows(rawRows, monthsElapsed, new Map())
    expect(categories).toHaveLength(1)
    expect(categories[0].name).toBe('Groceries')
    expect(suggestions).toHaveLength(1)
    expect(suggestions[0].name).toBe('Dining')
  })
  it('computes correct avgMonthly for Groceries', () => {
    const { categories } = buildBudgetRows(rawRows, monthsElapsed, new Map())
    expect(categories[0].avgMonthly).toBeCloseTo(200, 1)
  })
  it('computes overByMonthly correctly', () => {
    const { categories } = buildBudgetRows(rawRows, monthsElapsed, new Map())
    expect(categories[0].overByMonthly).toBeCloseTo(-100, 1)
  })
  it('counts months over budget correctly', () => {
    const { categories } = buildBudgetRows(rawRows, monthsElapsed, new Map())
    expect(categories[0].overBudgetMonths).toBe(1)
  })
  it('assigns status "warning" when avgMonthly is 80-100% of cap', () => {
    const rows = [{ category_id: '3', name: 'Transport', color: '#6366f1', monthly_cap: '200', month: '2025-01-01', month_spend: '170' }]
    const { categories } = buildBudgetRows(rows, 1, new Map())
    expect(categories[0].status).toBe('warning')
  })
  it('assigns status "over" when avgMonthly exceeds cap', () => {
    const rows = [{ category_id: '3', name: 'Transport', color: '#6366f1', monthly_cap: '200', month: '2025-01-01', month_spend: '250' }]
    const { categories } = buildBudgetRows(rows, 1, new Map())
    expect(categories[0].status).toBe('over')
  })
  it('excludes suggestions with zero spend', () => {
    const rows = [{ category_id: '4', name: 'Empty', color: '#aaa', monthly_cap: null, month: null, month_spend: null }]
    const { suggestions } = buildBudgetRows(rows, 3, new Map())
    expect(suggestions).toHaveLength(0)
  })
})
