// app/api/categories/backfill/route.ts
// Backfills new default categories for existing users without deleting their current categories

import { NextResponse } from "next/server"
import { getCurrentUserId } from "@/lib/auth"
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

/**
 * POST /api/categories/backfill
 * Adds any missing default categories for the current user
 * Does NOT delete existing categories - only adds new ones
 */
export const POST = async () => {
    try {
        const userId = await getCurrentUserId()

        // Get existing categories for this user
        const existingCategories = await neonQuery<{ name: string }>(
            `SELECT LOWER(name) as name FROM categories WHERE user_id = $1`,
            [userId]
        )

        const existingNamesSet = new Set(
            existingCategories.map(c => c.name.toLowerCase())
        )

        // Find which default categories are missing
        const missingCategories = DEFAULT_CATEGORIES.filter(
            name => !existingNamesSet.has(name.toLowerCase())
        )

        if (missingCategories.length === 0) {
            return NextResponse.json({
                success: true,
                message: "All default categories already exist",
                added: 0,
                categories: []
            })
        }

        // Insert missing categories
        const newRows = missingCategories.map(name => ({
            user_id: userId,
            name,
            color: CATEGORY_COLORS[name] || '#6b7280',
            is_default: true,
            created_at: new Date(),
            updated_at: new Date(),
        }))

        await neonInsert("categories", newRows, { returnRepresentation: false })

        return NextResponse.json({
            success: true,
            message: `Added ${missingCategories.length} new categories`,
            added: missingCategories.length,
            categories: missingCategories
        })
    } catch (error) {
        console.error("[Categories Backfill API] Error:", error)
        return NextResponse.json(
            { error: "Failed to backfill categories", details: error instanceof Error ? error.message : String(error) },
            { status: 500 }
        )
    }
}

/**
 * GET /api/categories/backfill
 * Shows which categories would be added (dry run)
 */
export const GET = async () => {
    try {
        const userId = await getCurrentUserId()

        // Get existing categories for this user
        const existingCategories = await neonQuery<{ name: string }>(
            `SELECT LOWER(name) as name FROM categories WHERE user_id = $1`,
            [userId]
        )

        const existingNamesSet = new Set(
            existingCategories.map(c => c.name.toLowerCase())
        )

        // Find which default categories are missing
        const missingCategories = DEFAULT_CATEGORIES.filter(
            name => !existingNamesSet.has(name.toLowerCase())
        )

        return NextResponse.json({
            existingCount: existingCategories.length,
            defaultCount: DEFAULT_CATEGORIES.length,
            missingCount: missingCategories.length,
            missingCategories,
            message: missingCategories.length > 0 
                ? `POST to this endpoint to add ${missingCategories.length} missing categories`
                : "All default categories already exist"
        })
    } catch (error) {
        console.error("[Categories Backfill API] Error:", error)
        return NextResponse.json(
            { error: "Failed to check categories", details: error instanceof Error ? error.message : String(error) },
            { status: 500 }
        )
    }
}
