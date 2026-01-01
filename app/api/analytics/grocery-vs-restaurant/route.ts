// app/api/analytics/grocery-vs-restaurant/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth";
import { neonQuery } from "@/lib/neonClient";

function getDateRange(filter: string | null): { startDate: string | null; endDate: string | null } {
    if (!filter) {
        return { startDate: null, endDate: null };
    }

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const formatDate = (date: Date) => date.toISOString().split("T")[0];

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
            console.error("[Grocery vs Restaurant API] Auth error:", authError.message);
            return NextResponse.json(
                { error: "Authentication required. Please sign in to access analytics." },
                { status: 401 },
            );
        }

        const { searchParams } = request.nextUrl;
        const filter = searchParams.get("filter");
        const { startDate, endDate } = getDateRange(filter);

        // Query for Grocery and Restaurant category spending by month from transactions
        // Groups by month and category type
        let query = `
      SELECT 
        EXTRACT(MONTH FROM t.tx_date)::INTEGER AS month,
        EXTRACT(YEAR FROM t.tx_date)::INTEGER AS year,
        CASE 
          WHEN LOWER(c.name) LIKE '%grocery%' OR LOWER(c.name) LIKE '%groceries%' OR LOWER(c.name) LIKE '%supermarket%' THEN 'Groceries'
          WHEN LOWER(c.name) LIKE '%restaurant%' OR LOWER(c.name) LIKE '%dining%' OR LOWER(c.name) LIKE '%food%' OR LOWER(c.name) LIKE '%eating out%' THEN 'Restaurants'
          ELSE NULL
        END AS category_group,
        SUM(ABS(t.amount)) AS total
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.id
      WHERE t.user_id = $1
        AND t.amount < 0
        AND (
          LOWER(c.name) LIKE '%grocery%' 
          OR LOWER(c.name) LIKE '%groceries%' 
          OR LOWER(c.name) LIKE '%supermarket%'
          OR LOWER(c.name) LIKE '%restaurant%' 
          OR LOWER(c.name) LIKE '%dining%' 
          OR LOWER(c.name) LIKE '%food%'
          OR LOWER(c.name) LIKE '%eating out%'
        )
    `;

        const params: any[] = [userId];

        if (startDate && endDate) {
            query += ` AND t.tx_date >= $2 AND t.tx_date <= $3`;
            params.push(startDate, endDate);
        }

        query += `
      GROUP BY EXTRACT(YEAR FROM t.tx_date), EXTRACT(MONTH FROM t.tx_date), category_group
      ORDER BY year, month
    `;

        const rows = await neonQuery<{
            month: number;
            year: number;
            category_group: string | null;
            total: number | string | null;
        }>(query, params);

        // Transform data into monthly format for stacked bar chart
        // Each row should have: { month: "Jan 2024", Groceries: 500, Restaurants: 200 }
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

        const monthlyData = new Map<string, { month: string; Groceries: number; Restaurants: number }>();

        rows.forEach(row => {
            if (!row.category_group) return;

            const monthKey = `${row.year}-${String(row.month).padStart(2, '0')}`;
            const monthLabel = `${monthNames[row.month - 1]} ${row.year}`;

            if (!monthlyData.has(monthKey)) {
                monthlyData.set(monthKey, {
                    month: monthLabel,
                    Groceries: 0,
                    Restaurants: 0,
                });
            }

            const entry = monthlyData.get(monthKey)!;
            const value = typeof row.total === "string" ? parseFloat(row.total) || 0 : row.total || 0;

            if (row.category_group === "Groceries") {
                entry.Groceries = value;
            } else if (row.category_group === "Restaurants") {
                entry.Restaurants = value;
            }
        });

        // Convert to array and sort by date
        const data = Array.from(monthlyData.entries())
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(([_, value]) => value);

        return NextResponse.json({ data });
    } catch (error: any) {
        console.error("[Grocery vs Restaurant API] Error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to fetch grocery vs restaurant data" },
            { status: 500 },
        );
    }
};
