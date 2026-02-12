// lib/user-sync.ts
// Syncs Clerk users with the database

import { currentUser } from '@clerk/nextjs/server'
import { neonQuery, neonInsert } from '@/lib/neonClient'

// Whitelist of tables allowed for dynamic cleanup queries
const ALLOWED_CLEANUP_TABLES = new Set([
    'subscriptions', 'categories', 'receipt_categories',
    'transactions', 'statements', 'receipts', 'budgets',
])
import { DEFAULT_CATEGORIES as DEFAULT_TRANSACTION_CATEGORIES } from '@/lib/categories'
import { ensureReceiptCategories } from '@/lib/receipts/receipt-categories-db'

// Default category colors for transaction categories
const CATEGORY_COLORS: Record<string, string> = {
    // Food & Drink
    "Groceries": "#10b981",
    "Restaurants": "#f97316",
    "Coffee": "#a16207",
    "Bars": "#a855f7",
    "Takeaway/Delivery": "#ea580c",
    // Housing
    "Rent": "#6366f1",
    "Mortgage": "#3b82f6",
    "Home Maintenance": "#4f46e5",
    "Home Supplies": "#7c3aed",
    // Bills & Utilities
    "Electricity": "#fbbf24",
    "Gas": "#f59e0b",
    "Water": "#06b6d4",
    "Internet": "#0ea5e9",
    "Mobile": "#0284c7",
    "Utilities": "#0369a1",
    // Transportation
    "Fuel": "#84cc16",
    "Public Transport": "#14b8a6",
    "Taxi/Rideshare": "#22d3d3",
    "Parking/Tolls": "#64748b",
    "Car Maintenance": "#475569",
    "Car Certificate": "#f59e0b",
    "Car Loan": "#ef4444",
    "Transport": "#14b8a6",
    // Health & Fitness
    "Health & Fitness": "#059669",
    "Pharmacy": "#22c55e",
    "Medical/Healthcare": "#16a34a",
    "Fitness": "#059669",
    // Shopping
    "Shopping": "#ec4899",
    "Clothing": "#db2777",
    "Electronics": "#be185d",
    "Home Goods": "#9d174d",
    "Gifts": "#f472b6",
    // Finance & Insurance
    "Bank Fees": "#dc2626",
    "Taxes & Fees": "#b91c1c",
    "Insurance": "#f43f5e",
    "Donation": "#e11d48",
    // Income
    "Income": "#22c55e",
    "Refunds": "#10b981",
    "Salary": "#22c55e",
    "Bonus": "#16a34a",
    "Freelance": "#15803d",
    "Cashback": "#059669",
    "Top-ups": "#047857",
    // Savings & Investments
    "Savings": "#3b82f6",
    "Investments": "#2563eb",
    "Transfers": "#94a3b8",
    "Loan": "#1d4ed8",
    "Credit": "#1e40af",
    "Wealth": "#1e3a8a",
    // Entertainment & Lifestyle
    "Entertainment": "#8b5cf6",
    "Education": "#06b6d4",
    "Subscriptions": "#6366f1",
    "Travel": "#0891b2",
    "Services": "#64748b",
    // Other
    "Cash": "#78716c",
    "Deposit": "#8b5cf6",
    "Other": "#6b7280",
}

/**
 * Seeds default transaction categories for a new user
 * These categories are marked as is_default=true and cannot be deleted
 */
async function seedDefaultCategories(userId: string): Promise<void> {
    // Check if user already has categories
    const existingCategories = await neonQuery<{ count: string }>(
        `SELECT COUNT(*) as count FROM categories WHERE user_id = $1`,
        [userId]
    )

    const count = parseInt(existingCategories[0]?.count || '0')
    if (count > 0) {
        // User already has categories, skip seeding
        return
    }

    // Insert default transaction categories
    const categoryRows = DEFAULT_TRANSACTION_CATEGORIES.map((name, index) => ({
        user_id: userId,
        name: name,
        color: CATEGORY_COLORS[name] || '#6b7280',
        is_default: true,
        created_at: new Date(),
        updated_at: new Date(),
    }))

    if (categoryRows.length > 0) {
        await neonInsert('categories', categoryRows, { returnRepresentation: false })
    }

    // Also seed receipt categories (for fridge page)
    await ensureReceiptCategories(userId)
}

/**
 * Ensures the current Clerk user exists in the database
 * Creates the user record if it doesn't exist
 * Returns the database user_id (which should match Clerk userId)
 * 
 * @returns The user_id from the database
 * @throws Error if user is not authenticated
 */
export async function ensureUserExists(): Promise<string> {
    const clerkUser = await currentUser()

    if (!clerkUser) {
        throw new Error("Unauthorized - Please sign in")
    }

    const clerkUserId = clerkUser.id
    const email = clerkUser.emailAddresses[0]?.emailAddress || ''
    const name = clerkUser.firstName || clerkUser.fullName || clerkUser.username || 'User'

    // Check if user exists in database by clerk_id (if column exists) or email
    // First, try to find by clerk_id
    let userQuery = `
        SELECT id 
        FROM users 
        WHERE id = $1::text
        LIMIT 1
    `

    let existingUsers = await neonQuery<{ id: string }>(userQuery, [clerkUserId])

    // If not found, try by email
    if (existingUsers.length === 0) {
        userQuery = `
            SELECT id 
            FROM users 
            WHERE email = $1::text
            LIMIT 1
        `
        existingUsers = await neonQuery<{ id: string }>(userQuery, [email])
    }

    // If user exists, return their ID
    if (existingUsers.length > 0) {
        const existingUser = existingUsers[0]

        // Handle Case: User recreated account (same email, new Clerk ID)
        // This happens if user deletes Clerk account but DB record remains
        // Solution: Delete old account data and let them start fresh
        if (existingUser.id !== clerkUserId) {
            console.log(`[User Sync] ID mismatch for ${email}. Deleting old account ${existingUser.id} to create fresh`)

            // Delete all dependent records first, then the user
            // Wrap each in try-catch to handle tables that may not exist or have issues
            const oldId = existingUser.id
            const tablesToClean = [
                'subscriptions',
                'categories',
                'receipt_categories',
                'transactions',
                'statements',
                'receipts',
                'budgets',
            ]

            for (const table of tablesToClean) {
                // Validate table name against whitelist before interpolating into SQL
                if (!ALLOWED_CLEANUP_TABLES.has(table)) {
                    console.error(`[User Sync] Invalid table name: ${table}`)
                    continue
                }
                try {
                    await neonQuery(`DELETE FROM ${table} WHERE user_id = $1::text`, [oldId])
                    console.log(`[User Sync] Cleaned ${table} for old user ${oldId}`)
                } catch (e: any) {
                    // Table may not exist or have different schema - continue cleanup
                    console.log(`[User Sync] Skipping ${table} cleanup: ${e.message?.slice(0, 50) || 'unknown error'}`)
                }
            }

            // Finally delete the user record
            try {
                await neonQuery(`DELETE FROM users WHERE id = $1::text`, [oldId])
                console.log(`[User Sync] Deleted old user record ${oldId}`)
            } catch (e: any) {
                console.error(`[User Sync] Failed to delete old user ${oldId}: ${e.message}`)
                // If we can't delete the old user, we can't proceed with creating a new one
                throw new Error(`Failed to clean up old account. Please contact support.`)
            }

            console.log(`[User Sync] Successfully cleaned up old account ${oldId}. Creating new account.`)
            // Fall through to create new user below
        } else {
            // Same ID, just update info
            const updateQuery = `
                UPDATE users 
                SET email = $1::text, name = $2::text
                WHERE id = $3::text
            `
            await neonQuery(updateQuery, [email, name, existingUser.id])
            return existingUser.id
        }
    }

    // User doesn't exist, create them
    // Note: Clerk uses string IDs like "user_xxxxx"
    // If your schema uses UUID for user_id, you'll need to update it to use text
    // OR create a mapping table

    const insertQuery = `
        INSERT INTO users (id, email, name, created_at, updated_at)
        VALUES ($1::text, $2::text, $3::text, NOW(), NOW())
        RETURNING id
    `

    try {
        const result = await neonQuery<{ id: string }>(insertQuery, [clerkUserId, email, name])
        if (result.length === 0) {
            throw new Error('Failed to create user - no ID returned')
        }

        const newUserId = result[0].id

        // Seed default categories for new user
        await seedDefaultCategories(newUserId)

        return newUserId
    } catch (error: any) {
        // If insert fails due to type mismatch (UUID vs text), provide helpful error
        if (error.message?.includes('uuid') ||
            error.message?.includes('invalid input syntax') ||
            error.message?.includes('type uuid')) {
            throw new Error(
                'Database schema mismatch: The users.id column expects UUID type, but Clerk uses text IDs (e.g., "user_xxxxx"). ' +
                'Please update your database schema:\n' +
                'Option 1: Change users.id to TEXT type\n' +
                'Option 2: Add a clerk_id TEXT column and keep id as UUID\n' +
                'See CLERK_SETUP_CHECKLIST.md for migration instructions.'
            )
        }
        throw error
    }
}

/**
 * Get the current user's database ID, ensuring they exist
 * This is a convenience wrapper around ensureUserExists
 */
export async function getCurrentUserId(): Promise<string> {
    return ensureUserExists()
}
