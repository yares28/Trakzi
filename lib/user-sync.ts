// lib/user-sync.ts
// Syncs Clerk users with the database

import { currentUser } from '@clerk/nextjs/server'
import { neonQuery, neonInsert } from '@/lib/neonClient'
import { DEFAULT_CATEGORIES as DEFAULT_TRANSACTION_CATEGORIES } from '@/lib/categories'
import { ensureReceiptCategories } from '@/lib/receipts/receipt-categories-db'

// Default category colors for transaction categories
const CATEGORY_COLORS: Record<string, string> = {
    "Groceries": "#10b981",
    "Restaurants": "#f97316",
    "Bars": "#a855f7",
    "Rent": "#6366f1",
    "Mortgage": "#3b82f6",
    "Utilities": "#0ea5e9",
    "Fuel": "#84cc16",
    "Transport": "#14b8a6",
    "Insurance": "#f43f5e",
    "Taxes & Fees": "#dc2626",
    "Shopping": "#ec4899",
    "Entertainment": "#8b5cf6",
    "Education": "#06b6d4",
    "Health & Fitness": "#22c55e",
    "Subscriptions": "#6366f1",
    "Travel": "#0891b2",
    "Services": "#64748b",
    "Income": "#22c55e",
    "Transfers": "#94a3b8",
    "Refunds": "#10b981",
    "Savings": "#3b82f6",
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
        // Update user info if needed (email or name changed)
        const updateQuery = `
            UPDATE users 
            SET email = $1::text, name = $2::text
            WHERE id = $3::text
        `
        await neonQuery(updateQuery, [email, name, existingUsers[0].id])

        return existingUsers[0].id
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
