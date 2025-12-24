// app/api/charts/category-totals/route.ts
// Server-side aggregated endpoint for category-based charts
// Returns spending totals by category instead of raw transactions

import { NextResponse } from "next/server";
import { neonQuery } from "@/lib/neonClient";
import { getCurrentUserIdOrNull } from "@/lib/auth";

function getDateRange(filter: string | null): { startDate: string | null; endDate: string | null } {
    if (!filter) {
        return { startDate: null, endDate: null };
    }

    const now = new Date();
    const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

    const formatDate = (date: Date): string => {
        const year = date.getUTCFullYear();
        const month = String(date.getUTCMonth() + 1).padStart(2, '0');
        const day = String(date.getUTCDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    switch (filter) {
        case "last7days": {
            const startDate = new Date(today);
            startDate.setUTCDate(startDate.getUTCDate() - 7);
            return { startDate: formatDate(startDate), endDate: formatDate(today) };
        }
        case "last30days": {
            const startDate = new Date(today);
            startDate.setUTCDate(startDate.getUTCDate() - 30);
            return { startDate: formatDate(startDate), endDate: formatDate(today) };
        }
        case "last3months": {
            const startDate = new Date(today);
            startDate.setUTCMonth(startDate.getUTCMonth() - 3);
            return { startDate: formatDate(startDate), endDate: formatDate(today) };
        }
        case "last6months": {
            const startDate = new Date(today);
            startDate.setUTCMonth(startDate.getUTCMonth() - 6);
            return { startDate: formatDate(startDate), endDate: formatDate(today) };
        }
        case "lastyear": {
            const startDate = new Date(today);
            startDate.setUTCFullYear(startDate.getUTCFullYear() - 1);
            return { startDate: formatDate(startDate), endDate: formatDate(today) };
        }
        default: {
            const year = parseInt(filter);
            if (!isNaN(year)) {
                return { startDate: `${year}-01-01`, endDate: `${year}-12-31` };
            }
            return { startDate: null, endDate: null };
        }
    }
}

export const GET = async (request: Request) => {
    try {
        let userId: string | null = await getCurrentUserIdOrNull();

        if (!userId) {
            if (process.env.NODE_ENV === 'development' && process.env.DEMO_USER_ID) {
                userId = process.env.DEMO_USER_ID;
            } else {
                return NextResponse.json(
                    { error: "Unauthorized - Please sign in" },
                    { status: 401 }
                );
            }
        }

        const { searchParams } = new URL(request.url);
        const filter = searchParams.get("filter");
        const type = searchParams.get("type") || "expenses"; // "expenses", "income", or "all"
        const { startDate, endDate } = getDateRange(filter);

        // Build query with optional date filter
        let dateClause = "";
        const params: any[] = [userId];
        if (startDate && endDate) {
            dateClause = ` AND t.tx_date >= $2 AND t.tx_date <= $3`;
            params.push(startDate, endDate);
        }

        // Filter by transaction type
        let amountFilter = "";
        if (type === "expenses") {
            amountFilter = " AND t.amount < 0";
        } else if (type === "income") {
            amountFilter = " AND t.amount > 0";
        }

        // Aggregate spending by category
        const query = `
      SELECT 
        COALESCE(c.name, 'Other') as category,
        SUM(ABS(t.amount)) as total,
        COUNT(*) as count
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.id
      WHERE t.user_id = $1${dateClause}${amountFilter}
      GROUP BY COALESCE(c.name, 'Other')
      ORDER BY total DESC
    `;

        const data = await neonQuery<{
            category: string;
            total: string | number;
            count: string | number;
        }>(query, params);

        // Format response
        const categoryTotals = data.map(row => ({
            category: row.category || 'Other',
            total: Number(row.total) || 0,
            count: Number(row.count) || 0,
        }));

        // Also return daily breakdown per category for trend charts
        const dailyQuery = `
      SELECT 
        DATE(t.tx_date) as date,
        COALESCE(c.name, 'Other') as category,
        SUM(ABS(t.amount)) as total
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.id
      WHERE t.user_id = $1${dateClause}${amountFilter}
      GROUP BY DATE(t.tx_date), COALESCE(c.name, 'Other')
      ORDER BY date ASC, category ASC
    `;

        const dailyData = await neonQuery<{
            date: string | Date;
            category: string;
            total: string | number;
        }>(dailyQuery, params);

        // Format daily data grouped by category
        const dailyByCategory: Record<string, Array<{ date: string; value: number }>> = {};

        for (const row of dailyData) {
            const category = row.category || 'Other';
            const date = typeof row.date === 'string'
                ? row.date.split('T')[0]
                : row.date.toISOString().split('T')[0];
            const value = Number(row.total) || 0;

            if (!dailyByCategory[category]) {
                dailyByCategory[category] = [];
            }
            dailyByCategory[category].push({ date, value });
        }

        return NextResponse.json({
            totals: categoryTotals,
            daily: dailyByCategory,
        }, {
            headers: {
                'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
            },
        });

    } catch (error: any) {
        console.error("[Category Totals API] Error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to fetch category totals" },
            { status: 500 }
        );
    }
};
