// app/api/transactions/daily/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth";
import { neonQuery } from "@/lib/neonClient";

function getDateRange(filter: string | null): { startDate: string | null; endDate: string | null } {
    if (!filter) {
        return { startDate: null, endDate: null };
    }

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const formatDate = (date: Date) => date.toISOString().split('T')[0];

    switch (filter) {
        case "last7days": {
            const startDate = new Date(today);
            startDate.setDate(startDate.getDate() - 7);
            return { startDate: formatDate(startDate), endDate: formatDate(today) };
        }
        case "last30days": {
            const startDate = new Date(today);
            startDate.setDate(startDate.getDate() - 30);
            return { startDate: formatDate(startDate), endDate: formatDate(today) };
        }
        case "last3months": {
            const startDate = new Date(today);
            startDate.setMonth(startDate.getMonth() - 3);
            return { startDate: formatDate(startDate), endDate: formatDate(today) };
        }
        case "last6months": {
            const startDate = new Date(today);
            startDate.setMonth(startDate.getMonth() - 6);
            return { startDate: formatDate(startDate), endDate: formatDate(today) };
        }
        case "lastyear": {
            const startDate = new Date(today);
            startDate.setFullYear(startDate.getFullYear() - 1);
            return { startDate: formatDate(startDate), endDate: formatDate(today) };
        }
        case "ytd": {
            // Year To Date: January 1st of current year to today
            const startDate = new Date(today.getFullYear(), 0, 1);
            return { startDate: formatDate(startDate), endDate: formatDate(today) };
        }
        default: {
            const year = parseInt(filter, 10);
            if (!isNaN(year)) {
                return {
                    startDate: `${year}-01-01`,
                    endDate: `${year}-12-31`,
                };
            }
            return { startDate: null, endDate: null };
        }
    }
}

export const GET = async (request: NextRequest) => {
    try {
        let userId: string;
        try {
            userId = await getCurrentUserId();
        } catch (authError: any) {
            console.error("[Daily Transactions API] Auth error:", authError.message);
            return NextResponse.json(
                { error: "Authentication required. Please sign in to access transactions." },
                { status: 401 }
            );
        }

        const { searchParams } = request.nextUrl;
        const filter = searchParams.get("filter");
        const { startDate, endDate } = getDateRange(filter);

        // Query to get daily expense sums grouped by date
        // Only include expenses (amount < 0) and sum absolute values per day
        let query = `
            SELECT 
                DATE(t.tx_date) as day,
                SUM(ABS(t.amount)) as value
            FROM transactions t
            LEFT JOIN categories c ON t.category_id = c.id
            WHERE t.user_id = $1
                AND t.amount < 0
        `;

        const params: any[] = [userId];

        if (startDate && endDate) {
            query += ` AND t.tx_date >= $2 AND t.tx_date <= $3`;
            params.push(startDate, endDate);
        }

        query += `
            GROUP BY DATE(t.tx_date)
            ORDER BY day ASC
        `;

        const dailyData = await neonQuery<{
            day: Date | string;
            value: number | string;
        }>(query, params);

        // Format the data for the calendar chart
        // Convert day to YYYY-MM-DD format and ensure value is a number
        const formattedData = dailyData.map((item) => {
            const day = item.day instanceof Date
                ? item.day.toISOString().split('T')[0]
                : typeof item.day === 'string'
                    ? item.day.split('T')[0]
                    : String(item.day).split('T')[0];

            const value = typeof item.value === 'string'
                ? parseFloat(item.value)
                : (item.value as number) || 0;

            return {
                day,
                value: Math.round(value * 100) / 100 // Round to 2 decimal places
            };
        }).filter(item => item.value > 0); // Filter out any zero values

        if (formattedData.length === 0) {
        }

        // Add caching headers for better performance
        // Cache for 1 minute, revalidate in background
        return NextResponse.json(formattedData, {
            headers: {
                'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
            },
        });
    } catch (error: any) {
        console.error("[Daily Transactions API] Error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to fetch daily transactions" },
            { status: 500 }
        );
    }
};

