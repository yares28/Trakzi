// app/api/admin/backfill-all-categories/route.ts
// Admin endpoint to backfill new default categories for ALL users
// This is useful when you add new default categories and want to update all existing users

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { DEFAULT_CATEGORIES } from "@/lib/categories"
import { neonInsert, neonQuery } from "@/lib/neonClient"

// Default category colors (same as user-sync.ts)
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
    "Other": "#6b7280",
}

// List of admin user IDs who can call this endpoint
// TODO: Add your admin user IDs here
const ADMIN_USER_IDS: string[] = [
    // Add your Clerk user IDs here, e.g.:
    // "user_2abc123xyz"
]

/**
 * POST /api/admin/backfill-all-categories
 * Backfills missing default categories for ALL users in the database
 * 
 * Query params:
 * - dryRun=true: Only report what would be added, don't actually add
 * - limit=N: Process only N users (for testing)
 */
export const POST = async (request: NextRequest) => {
    try {
        // Check if user is authenticated and is an admin
        const { userId } = await auth()

        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        // Check if admin (skip in development for testing)
        const isDevelopment = process.env.NODE_ENV === "development"
        if (!isDevelopment && !ADMIN_USER_IDS.includes(userId)) {
            return NextResponse.json({ error: "Forbidden - Admin access required" }, { status: 403 })
        }

        const { searchParams } = request.nextUrl
        const dryRun = searchParams.get("dryRun") === "true"
        const limit = parseInt(searchParams.get("limit") || "0", 10)

        // Get all user IDs
        let userQuery = `SELECT DISTINCT id FROM users`
        if (limit > 0) {
            userQuery += ` LIMIT ${limit}`
        }

        const users = await neonQuery<{ id: string }>(userQuery, [])

        const results = {
            totalUsers: users.length,
            usersProcessed: 0,
            usersUpdated: 0,
            totalCategoriesAdded: 0,
            errors: [] as string[],
            details: [] as { userId: string; added: string[] }[],
        }

        for (const user of users) {
            try {
                // Get existing categories for this user
                const existingCategories = await neonQuery<{ name: string }>(
                    `SELECT LOWER(name) as name FROM categories WHERE user_id = $1`,
                    [user.id]
                )

                const existingNamesSet = new Set(
                    existingCategories.map(c => c.name.toLowerCase())
                )

                // Find which default categories are missing
                const missingCategories = DEFAULT_CATEGORIES.filter(
                    name => !existingNamesSet.has(name.toLowerCase())
                )

                results.usersProcessed++

                if (missingCategories.length === 0) {
                    continue
                }

                if (!dryRun) {
                    // Insert missing categories
                    const newRows = missingCategories.map(name => ({
                        user_id: user.id,
                        name,
                        color: CATEGORY_COLORS[name] || '#6b7280',
                        is_default: true,
                        created_at: new Date(),
                        updated_at: new Date(),
                    }))

                    await neonInsert("categories", newRows, { returnRepresentation: false })
                }

                results.usersUpdated++
                results.totalCategoriesAdded += missingCategories.length
                results.details.push({
                    userId: user.id,
                    added: missingCategories,
                })
            } catch (userError) {
                results.errors.push(`User ${user.id}: ${userError instanceof Error ? userError.message : String(userError)}`)
            }
        }

        return NextResponse.json({
            success: true,
            dryRun,
            message: dryRun
                ? `Would add categories for ${results.usersUpdated} users (dry run)`
                : `Added categories for ${results.usersUpdated} users`,
            ...results,
        })
    } catch (error) {
        console.error("[Admin Backfill Categories API] Error:", error)
        return NextResponse.json(
            { error: "Failed to backfill categories", details: error instanceof Error ? error.message : String(error) },
            { status: 500 }
        )
    }
}

/**
 * GET /api/admin/backfill-all-categories
 * Shows stats about what would be backfilled (always a dry run)
 */
export const GET = async () => {
    try {
        const { userId } = await auth()

        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        // Check if admin (skip in development)
        const isDevelopment = process.env.NODE_ENV === "development"
        if (!isDevelopment && !ADMIN_USER_IDS.includes(userId)) {
            return NextResponse.json({ error: "Forbidden - Admin access required" }, { status: 403 })
        }

        // Get user count
        const userCount = await neonQuery<{ count: string }>(
            `SELECT COUNT(DISTINCT id) as count FROM users`,
            []
        )

        // Get categories stats
        const categoryStats = await neonQuery<{ user_count: string; avg_categories: string }>(
            `SELECT 
                COUNT(DISTINCT user_id) as user_count,
                ROUND(AVG(category_count), 1) as avg_categories
            FROM (
                SELECT user_id, COUNT(*) as category_count 
                FROM categories 
                GROUP BY user_id
            ) subq`,
            []
        )

        return NextResponse.json({
            totalUsers: parseInt(userCount[0]?.count || "0", 10),
            usersWithCategories: parseInt(categoryStats[0]?.user_count || "0", 10),
            avgCategoriesPerUser: parseFloat(categoryStats[0]?.avg_categories || "0"),
            defaultCategoryCount: DEFAULT_CATEGORIES.length,
            defaultCategories: DEFAULT_CATEGORIES,
            instructions: [
                "POST to this endpoint to backfill missing default categories for all users",
                "Add ?dryRun=true to see what would be added without making changes",
                "Add ?limit=N to process only N users (for testing)",
            ],
        })
    } catch (error) {
        console.error("[Admin Backfill Categories API] Error:", error)
        return NextResponse.json(
            { error: "Failed to get stats", details: error instanceof Error ? error.message : String(error) },
            { status: 500 }
        )
    }
}
