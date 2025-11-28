// app/api/transactions/daily-365/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth";
import { neonQuery } from "@/lib/neonClient";

export const GET = async (request: NextRequest) => {
    try {
        let userId: string;
        try {
            userId = await getCurrentUserId();
            console.log("[Daily 365 Transactions API] User ID:", userId);
        } catch (authError: any) {
            console.error("[Daily 365 Transactions API] Auth error:", authError.message);
            return NextResponse.json(
                { error: "Authentication required. Set DEMO_USER_ID in .env.local" },
                { status: 401 }
            );
        }

        // Calculate date range: last 365 days from today
        const today = new Date();
        const oneYearAgo = new Date(today);
        oneYearAgo.setDate(oneYearAgo.getDate() - 365);
        const startDate = oneYearAgo.toISOString().split('T')[0];
        const endDate = today.toISOString().split('T')[0];

        // Query to get daily expense sums grouped by date for last 365 days
        // Exclude Income, Transfers, and Savings categories
        // Only include expenses (amount < 0) and sum absolute values per day
        const query = `
            SELECT 
                DATE(t.tx_date) as day,
                SUM(ABS(t.amount)) as value
            FROM transactions t
            LEFT JOIN categories c ON t.category_id = c.id
            WHERE t.user_id = $1
                AND t.tx_date >= $2
                AND t.tx_date <= $3
                AND t.amount < 0
                AND (c.name IS NULL OR LOWER(c.name) NOT IN ('income', 'transfers', 'transfer', 'savings'))
            GROUP BY DATE(t.tx_date)
            ORDER BY day ASC
        `;

        const dailyData = await neonQuery<{
            day: Date | string;
            value: number | string;
        }>(query, [userId, startDate, endDate]);

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
        });

        console.log(`[Daily 365 Transactions API] Returning ${formattedData.length} days of data (${startDate} to ${endDate})`);

        return NextResponse.json(formattedData);
    } catch (error: any) {
        console.error("[Daily 365 Transactions API] Error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to fetch daily transactions" },
            { status: 500 }
        );
    }
};



