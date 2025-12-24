// app/api/charts/transactions/route.ts
// Server-side endpoint that returns transactions for chart rendering
// This is separate from the main /api/transactions to allow full data for charts
// while keeping the main API paginated for security

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
            dateClause = ` AND t.tx_date >= $2 AND t.tx_date <= $3`;
            params.push(startDate, endDate);
        }

        // Fetch all transactions for chart rendering
        // This returns fields needed for charts to reduce payload size
        const query = `
            SELECT 
                t.id,
                DATE(t.tx_date) as date,
                t.amount,
                t.description,
                COALESCE(c.name, 'Other') as category
            FROM transactions t
            LEFT JOIN categories c ON t.category_id = c.id
            WHERE t.user_id = $1${dateClause}
            ORDER BY t.tx_date DESC
        `;

        const data = await neonQuery<{
            id: number;
            date: string | Date;
            amount: string | number;
            description: string | null;
            category: string;
        }>(query, params);

        // Format response with fields for charts
        const transactions = data.map(row => ({
            id: row.id,
            date: typeof row.date === 'string'
                ? row.date.split('T')[0]
                : row.date.toISOString().split('T')[0],
            amount: Number(row.amount) || 0,
            description: row.description || '',
            category: row.category || 'Other',
            balance: null as number | null,
        }));

        return NextResponse.json(transactions, {
            headers: {
                'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
            },
        });

    } catch (error: any) {
        console.error("[Charts Transactions API] Error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to fetch transactions for charts" },
            { status: 500 }
        );
    }
};
