/**
 * Test that verifies category changes during CSV import are reflected in the database
 * 
 * This test:
 * 1. Creates a CSV with initial categories
 * 2. Imports it to the database
 * 3. Modifies the CSV to change categories
 * 4. Imports the modified CSV
 * 5. Verifies that transactions in the database have the updated categories
 * 
 * @jest-environment node
 */

import { rowsToCanonicalCsv } from '@/lib/parsing/rowsToCanonicalCsv'
import { TxRow } from '@/lib/types/transactions'
import { neonQuery, neonInsert } from '@/lib/neonClient'
import { getCurrentUserId } from '@/lib/auth'
import Papa from 'papaparse'

// Mock the auth module to return a test user ID
jest.mock('@/lib/auth', () => ({
  getCurrentUserId: jest.fn(),
}))

describe('CSV Import Category Changes', () => {
  const TEST_USER_ID = process.env.DEMO_USER_ID || 'test-user-id-for-category-changes'
  const mockedGetCurrentUserId = getCurrentUserId as jest.MockedFunction<typeof getCurrentUserId>

  beforeAll(() => {
    mockedGetCurrentUserId.mockResolvedValue(TEST_USER_ID)
  })

  afterEach(async () => {
    // Clean up: Delete test transactions and statements created during tests
    try {
      // First, set category_id to NULL for test transactions to avoid foreign key constraint
      await neonQuery(
        `UPDATE transactions SET category_id = NULL WHERE user_id = $1 AND description LIKE 'Test Transaction%'`,
        [TEST_USER_ID]
      )
      // Delete transactions
      await neonQuery(
        `DELETE FROM transactions WHERE user_id = $1 AND description LIKE 'Test Transaction%'`,
        [TEST_USER_ID]
      )
      // Delete statements
      await neonQuery(
        `DELETE FROM statements WHERE user_id = $1 AND bank_name = 'Test Bank'`,
        [TEST_USER_ID]
      )
      // Delete test categories (now safe since we've removed the foreign key references)
      // Only delete if they're not used by other transactions
      await neonQuery(
        `DELETE FROM categories 
         WHERE user_id = $1 
         AND name IN ('Food', 'Transport', 'Groceries', 'Travel', 'Entertainment')
         AND NOT EXISTS (
           SELECT 1 FROM transactions 
           WHERE transactions.category_id = categories.id
         )`,
        [TEST_USER_ID]
      )
    } catch (error) {
      // Cleanup errors are acceptable - categories might be used by other tests/data
      console.warn('Cleanup error (may be expected):', error)
    }
  })

  it('should update categories in database when CSV categories are changed before import', async () => {
    // Step 1: Create initial CSV with categories
    const initialRows: TxRow[] = [
      {
        date: '2024-01-15',
        description: 'Test Transaction 1 - Grocery Store',
        amount: -50.00,
        balance: 950.00,
        category: 'Food',
      },
      {
        date: '2024-01-16',
        description: 'Test Transaction 2 - Gas Station',
        amount: -30.00,
        balance: 920.00,
        category: 'Transport',
      },
      {
        date: '2024-01-17',
        description: 'Test Transaction 3 - Restaurant',
        amount: -25.00,
        balance: 895.00,
        category: 'Food',
      },
    ]

    const initialCsv = rowsToCanonicalCsv(initialRows)
    expect(initialCsv).toContain('Food')
    expect(initialCsv).toContain('Transport')

    // Step 2: Import initial CSV via API endpoint
    // We need to simulate the import endpoint behavior
    // Since we can't easily call Next.js API routes in tests, we'll replicate the import logic
    const parsed = Papa.parse(initialCsv, {
      header: true,
      skipEmptyLines: true,
    })

    const rows: TxRow[] = (parsed.data as Record<string, unknown>[]).map((r) => ({
      date: String(r.date),
      description: String(r.description),
      amount: Number(r.amount),
      balance: r.balance != null ? Number(r.balance) : null,
      category: r.category ? String(r.category) : undefined,
    }))

    // Insert statement
    const [statement] = await neonInsert('statements', {
      user_id: TEST_USER_ID,
      bank_name: 'Test Bank',
      account_name: null,
      source_filename: 'test-initial.csv',
      raw_format: 'csv',
      file_id: null,
    })

    const statementId = (statement as unknown as { id: number }).id

    // Map category names to category_id
    const categoryNameToId = new Map<string, number | null>()
    const uniqueCategoryNames = Array.from(
      new Set(
        rows
          .map((r) => r.category)
          .filter((cat): cat is string => typeof cat === 'string' && cat.trim().length > 0)
      )
    )

    if (uniqueCategoryNames.length > 0) {
      // Fetch existing categories
      const placeholders = uniqueCategoryNames.map((_, i) => `$${i + 2}`).join(', ')
      const existingCategoriesQuery = `
        SELECT id, name 
        FROM categories 
        WHERE user_id = $1 AND name IN (${placeholders})
      `
      const existingCategories = await neonQuery<{ id: number; name: string }>(
        existingCategoriesQuery,
        [TEST_USER_ID, ...uniqueCategoryNames]
      )

      existingCategories.forEach((cat) => {
        categoryNameToId.set(cat.name, cat.id)
      })

      // Create missing categories
      const missingCategories = uniqueCategoryNames.filter((name) => !categoryNameToId.has(name))

      if (missingCategories.length > 0) {
        const newCategoryRows = missingCategories.map((name) => ({
          user_id: TEST_USER_ID,
          name: name.trim(),
          color: null,
        }))

        const insertedCategories = (await neonInsert(
          'categories',
          newCategoryRows,
          { returnRepresentation: true }
        )) as unknown as { id: number; name: string }[]

        insertedCategories.forEach((cat) => {
          categoryNameToId.set(cat.name, cat.id)
        })
      }
    }

    // Insert transactions
    const txRows = rows.map((r) => ({
      user_id: TEST_USER_ID,
      statement_id: statementId,
      tx_date: r.date,
      description: r.description,
      amount: r.amount,
      balance: r.balance,
      currency: 'EUR',
      category_id:
        r.category && categoryNameToId.has(r.category) ? categoryNameToId.get(r.category)! : null,
      raw_csv_row: JSON.stringify(r),
    }))

    await neonInsert('transactions', txRows, { returnRepresentation: false })

    // Step 3: Verify initial categories in database
    const initialCheckQuery = `
      SELECT t.id, t.description, t.category_id, c.name as category_name
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.id
      WHERE t.user_id = $1 AND t.description LIKE 'Test Transaction%'
      ORDER BY t.tx_date
    `
    const initialTransactions = await neonQuery<{
      id: number
      description: string
      category_id: number | null
      category_name: string | null
    }>(initialCheckQuery, [TEST_USER_ID])

    expect(initialTransactions.length).toBe(3)
    expect(initialTransactions[0].category_name).toBe('Food')
    expect(initialTransactions[1].category_name).toBe('Transport')
    expect(initialTransactions[2].category_name).toBe('Food')

    // Step 4: Create modified CSV with changed categories
    const modifiedRows: TxRow[] = [
      {
        date: '2024-01-15',
        description: 'Test Transaction 1 - Grocery Store',
        amount: -50.00,
        balance: 950.00,
        category: 'Groceries', // Changed from 'Food'
      },
      {
        date: '2024-01-16',
        description: 'Test Transaction 2 - Gas Station',
        amount: -30.00,
        balance: 920.00,
        category: 'Travel', // Changed from 'Transport'
      },
      {
        date: '2024-01-17',
        description: 'Test Transaction 3 - Restaurant',
        amount: -25.00,
        balance: 895.00,
        category: 'Entertainment', // Changed from 'Food'
      },
    ]

    const modifiedCsv = rowsToCanonicalCsv(modifiedRows)
    expect(modifiedCsv).toContain('Groceries')
    expect(modifiedCsv).toContain('Travel')
    expect(modifiedCsv).toContain('Entertainment')
    expect(modifiedCsv).not.toContain('Food')
    expect(modifiedCsv).not.toContain('Transport')

    // Step 5: Import modified CSV (simulating the import process)
    const parsedModified = Papa.parse(modifiedCsv, {
      header: true,
      skipEmptyLines: true,
    })

    const modifiedRowsParsed: TxRow[] = (parsedModified.data as Record<string, unknown>[]).map((r) => ({
      date: String(r.date),
      description: String(r.description),
      amount: Number(r.amount),
      balance: r.balance != null ? Number(r.balance) : null,
      category: r.category ? String(r.category) : undefined,
    }))

    // Insert new statement for the modified import
    const [modifiedStatement] = await neonInsert('statements', {
      user_id: TEST_USER_ID,
      bank_name: 'Test Bank',
      account_name: null,
      source_filename: 'test-modified.csv',
      raw_format: 'csv',
      file_id: null,
    })

    const modifiedStatementId = (modifiedStatement as unknown as { id: number }).id

    // Map new category names to category_id
    const modifiedCategoryNameToId = new Map<string, number | null>()
    const modifiedUniqueCategoryNames = Array.from(
      new Set(
        modifiedRowsParsed
          .map((r) => r.category)
          .filter((cat): cat is string => typeof cat === 'string' && cat.trim().length > 0)
      )
    )

    if (modifiedUniqueCategoryNames.length > 0) {
      // Fetch existing categories
      const placeholders = modifiedUniqueCategoryNames.map((_, i) => `$${i + 2}`).join(', ')
      const existingCategoriesQuery = `
        SELECT id, name 
        FROM categories 
        WHERE user_id = $1 AND name IN (${placeholders})
      `
      const existingCategories = await neonQuery<{ id: number; name: string }>(
        existingCategoriesQuery,
        [TEST_USER_ID, ...modifiedUniqueCategoryNames]
      )

      existingCategories.forEach((cat) => {
        modifiedCategoryNameToId.set(cat.name, cat.id)
      })

      // Create missing categories
      const missingCategories = modifiedUniqueCategoryNames.filter(
        (name) => !modifiedCategoryNameToId.has(name)
      )

      if (missingCategories.length > 0) {
        const newCategoryRows = missingCategories.map((name) => ({
          user_id: TEST_USER_ID,
          name: name.trim(),
          color: null,
        }))

        const insertedCategories = (await neonInsert(
          'categories',
          newCategoryRows,
          { returnRepresentation: true }
        )) as unknown as { id: number; name: string }[]

        insertedCategories.forEach((cat) => {
          modifiedCategoryNameToId.set(cat.name, cat.id)
        })
      }
    }

    // Insert modified transactions
    const modifiedTxRows = modifiedRowsParsed.map((r) => ({
      user_id: TEST_USER_ID,
      statement_id: modifiedStatementId,
      tx_date: r.date,
      description: r.description,
      amount: r.amount,
      balance: r.balance,
      currency: 'EUR',
      category_id:
        r.category && modifiedCategoryNameToId.has(r.category)
          ? modifiedCategoryNameToId.get(r.category)!
          : null,
      raw_csv_row: JSON.stringify(r),
    }))

    await neonInsert('transactions', modifiedTxRows, { returnRepresentation: false })

    // Step 6: Verify that the new transactions have the updated categories
    const finalCheckQuery = `
      SELECT t.id, t.description, t.category_id, c.name as category_name, t.statement_id
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.id
      WHERE t.user_id = $1 
        AND t.description LIKE 'Test Transaction%'
        AND t.statement_id = $2
      ORDER BY t.tx_date
    `
    const finalTransactions = await neonQuery<{
      id: number
      description: string
      category_id: number | null
      category_name: string | null
      statement_id: number
    }>(finalCheckQuery, [TEST_USER_ID, modifiedStatementId])

    expect(finalTransactions.length).toBe(3)
    expect(finalTransactions[0].category_name).toBe('Groceries')
    expect(finalTransactions[1].category_name).toBe('Travel')
    expect(finalTransactions[2].category_name).toBe('Entertainment')

    // Verify that categories were correctly created and linked
    expect(finalTransactions[0].category_id).not.toBeNull()
    expect(finalTransactions[1].category_id).not.toBeNull()
    expect(finalTransactions[2].category_id).not.toBeNull()

    // Verify that the new categories exist in the categories table
    const categoriesCheckQuery = `
      SELECT name 
      FROM categories 
      WHERE user_id = $1 AND name IN ('Groceries', 'Travel', 'Entertainment')
      ORDER BY name
    `
    const categories = await neonQuery<{ name: string }>(categoriesCheckQuery, [TEST_USER_ID])

    expect(categories.length).toBe(3)
    expect(categories.map((c) => c.name).sort()).toEqual(['Entertainment', 'Groceries', 'Travel'])
  })
})

