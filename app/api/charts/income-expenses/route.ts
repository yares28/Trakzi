// app/api/charts/income-expenses/route.ts
// Server-side aggregated endpoint for income vs expenses charts
// Returns daily aggregated data instead of raw transactions

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
        const { startDate, endDate } = getDateRange(filter);

        // Build query with optional date filter
        let dateClause = "";
        const params: any[] = [userId];
        if (startDate && endDate) {
            dateClause = ` AND tx_date >= $2 AND tx_date <= $3`;
            params.push(startDate, endDate);
        }

        // Aggregate income and expenses by day
        const query = `
      SELECT 
        DATE(tx_date) as date,
        SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END) as desktop,
        SUM(CASE WHEN amount < 0 THEN ABS(amount) ELSE 0 END) as mobile
      FROM transactions
      WHERE user_id = $1${dateClause}
      GROUP BY DATE(tx_date)
      ORDER BY date ASC
    `;

        const data = await neonQuery<{
            date: string | Date;
            desktop: string | number;
            mobile: string | number;
        }>(query, params);

        // Format response for chart consumption
        const chartData = data.map(row => ({
            date: typeof row.date === 'string'
                ? row.date.split('T')[0]
                : row.date.toISOString().split('T')[0],
            desktop: Number(row.desktop) || 0, // Income
            mobile: Number(row.mobile) || 0,   // Expenses
        }));

        return NextResponse.json(chartData, {
            headers: {
                'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
            },
        });

    } catch (error: any) {
        console.error("[Income Expenses API] Error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to fetch income/expenses data" },
            { status: 500 }
        );
    }
};
