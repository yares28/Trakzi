// app/api/transactions/route.ts
import { NextResponse } from "next/server";
import { neonQuery } from "@/lib/neonClient";
import { getCurrentUserId } from "@/lib/auth";

function getDateRange(filter: string | null): { startDate: string | null; endDate: string | null } {
    if (!filter) {
        return { startDate: null, endDate: null };
    }

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    switch (filter) {
        case "last7days": {
            const startDate = new Date(today);
            startDate.setDate(startDate.getDate() - 7);
            return {
                startDate: startDate.toISOString().split('T')[0],
                endDate: today.toISOString().split('T')[0]
            };
        }
        case "last30days": {
            const startDate = new Date(today);
            startDate.setDate(startDate.getDate() - 30);
            return {
                startDate: startDate.toISOString().split('T')[0],
                endDate: today.toISOString().split('T')[0]
            };
        }
        case "last3months": {
            const startDate = new Date(today);
            startDate.setMonth(startDate.getMonth() - 3);
            return {
                startDate: startDate.toISOString().split('T')[0],
                endDate: today.toISOString().split('T')[0]
            };
        }
        case "last6months": {
            const startDate = new Date(today);
            startDate.setMonth(startDate.getMonth() - 6);
            return {
                startDate: startDate.toISOString().split('T')[0],
                endDate: today.toISOString().split('T')[0]
            };
        }
        case "lastyear": {
            const startDate = new Date(today);
            startDate.setFullYear(startDate.getFullYear() - 1);
            return {
                startDate: startDate.toISOString().split('T')[0],
                endDate: today.toISOString().split('T')[0]
            };
        }
        default: {
            // Assume it's a year string (e.g., "2024")
            const year = parseInt(filter);
            if (!isNaN(year)) {
                return {
                    startDate: `${year}-01-01`,
                    endDate: `${year}-12-31`
                };
            }
            return { startDate: null, endDate: null };
        }
    }
}

export const GET = async (request: Request) => {
    try {
        let userId: string;
        try {
            userId = await getCurrentUserId();
            console.log("[Transactions API] User ID:", userId);
        } catch (authError: any) {
            console.error("[Transactions API] Auth error:", authError.message);
            console.error("[Transactions API] Make sure DEMO_USER_ID is set in .env.local");
            return NextResponse.json(
                { error: "Authentication required. Set DEMO_USER_ID in .env.local" },
                { status: 401 }
            );
        }
        
        // Get filter from query params
        const { searchParams } = new URL(request.url);
        const filter = searchParams.get("filter");
        
        // Get date range based on filter
        const { startDate, endDate } = getDateRange(filter);
        
        // Build query with optional date filtering and LEFT JOIN to get category name
        let query = `SELECT 
                        t.id, 
                        t.tx_date, 
                        t.description, 
                        t.amount, 
                        t.balance, 
                        t.category_id, 
                        t.raw_csv_row,
                        c.name as category_name
                     FROM transactions t
                     LEFT JOIN categories c ON t.category_id = c.id
                     WHERE t.user_id = $1`;
        const params: any[] = [userId];
        
        if (startDate && endDate) {
            query += ` AND t.tx_date >= $2 AND t.tx_date <= $3`;
            params.push(startDate, endDate);
        }
        
        query += ` ORDER BY t.tx_date DESC`;
        
        console.log("[Transactions API] Query:", query);
        console.log("[Transactions API] Params:", params);
        
        // Fetch user transactions ordered by date
        // Convert tx_date (date) to ISO string format
        let transactions: Array<{
            id: number;
            tx_date: Date | string;
            description: string;
            amount: number;
            balance: number | null;
            category_id: number | null;
            raw_csv_row: string | null;
            category_name: string | null;
        }>;
        
        try {
            // First, check if there are any transactions for this user at all
            const countQuery = `SELECT COUNT(*) as count FROM transactions WHERE user_id = $1`;
            const countResult = await neonQuery<{ count: string | number }>(countQuery, [userId]);
            const totalCount = typeof countResult[0]?.count === 'string' 
                ? parseInt(countResult[0].count) 
                : (countResult[0]?.count as number) || 0;
            console.log(`[Transactions API] Total transactions for user ${userId}: ${totalCount}`);
            
            if (totalCount === 0) {
                console.warn(`[Transactions API] No transactions found for user_id: ${userId}`);
                console.warn(`[Transactions API] This might mean:`);
                console.warn(`  - DEMO_USER_ID doesn't match the user_id in transactions table`);
                console.warn(`  - Transactions exist but with different user_id`);
                console.warn(`  - To debug, run: SELECT DISTINCT user_id FROM transactions;`);
            }
            
            transactions = await neonQuery<{
                id: number;
                tx_date: Date | string;
                description: string;
                amount: number;
                balance: number | null;
                category_id: number | null;
                raw_csv_row: string | null;
                category_name: string | null;
            }>(query, params);
            console.log(`[Transactions API] Query returned ${transactions.length} transactions`);
            if (transactions.length > 0) {
                console.log(`[Transactions API] First transaction:`, transactions[0]);
            }
        } catch (queryError: any) {
            console.error("[Transactions API] Query error:", queryError.message);
            console.error("[Transactions API] Query was:", query);
            console.error("[Transactions API] Params were:", params);
            console.error("[Transactions API] This might indicate:");
            console.error("  - The transactions table doesn't exist (run backend/schema.sql)");
            console.error("  - The user_id doesn't match any records");
            console.error("  - Database connection issue");
            console.error("  - Check if DEMO_USER_ID matches user_id in transactions table");
            throw queryError;
        }
        
        // Parse category from category_name, raw_csv_row, or default to "Other"
        const transactionsWithCategory = transactions.map(tx => {
            let category: string = "Other";
            
            // Priority 1: Use category name from categories table
            if (tx.category_name) {
                category = tx.category_name;
            }
            // Priority 2: Try to get category from raw_csv_row
            else if (tx.raw_csv_row) {
                try {
                    const parsed = JSON.parse(tx.raw_csv_row);
                    if (parsed.category) {
                        category = parsed.category;
                    }
                } catch (e) {
                    // Ignore parse errors
                }
            }
            
            // Convert date to ISO string format
            let dateStr: string;
            if (tx.tx_date instanceof Date) {
                dateStr = tx.tx_date.toISOString().split('T')[0];
            } else if (typeof tx.tx_date === 'string') {
                // If it's already a string, use it directly (might be YYYY-MM-DD)
                dateStr = tx.tx_date.split('T')[0];
            } else {
                // Fallback: try to parse
                dateStr = new Date(tx.tx_date as any).toISOString().split('T')[0];
            }
            
            return {
                id: tx.id,
                date: dateStr,
                description: tx.description,
                amount: Number(tx.amount),
                balance: tx.balance ? Number(tx.balance) : null,
                category: category
            };
        });
        
        console.log("[Transactions API] Returning transactions:", transactionsWithCategory.length);
        console.log("[Transactions API] First transaction sample:", transactionsWithCategory[0]);
        return NextResponse.json(transactionsWithCategory, {
            headers: {
                'Content-Type': 'application/json',
            }
        });
    } catch (error: any) {
        console.error("[Transactions API] Error:", error);
        console.error("[Transactions API] Error stack:", error.stack);
        return NextResponse.json(
            { error: error.message || "Failed to fetch transactions" },
            { status: 500 }
        );
    }
};

