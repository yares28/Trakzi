// app/api/analytics/category-bubble/route.ts
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
      console.log("[Category Bubble API] User ID:", userId);
    } catch (authError: any) {
      console.error("[Category Bubble API] Auth error:", authError.message);
      return NextResponse.json(
        { error: "Authentication required. Set DEMO_USER_ID in .env.local" },
        { status: 401 },
      );
    }

    const { searchParams } = request.nextUrl;
    const filter = searchParams.get("filter");
    const { startDate, endDate } = getDateRange(filter);

    let query = `
      SELECT 
        COALESCE(c.name, 'Other') AS category,
        SUM(ABS(t.amount)) AS total
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
      GROUP BY COALESCE(c.name, 'Other')
      ORDER BY total DESC
    `;

    const rows = await neonQuery<{
      category: string | null;
      total: number | string | null;
    }>(query, params);

    const formatted = rows.map((row) => ({
      category: (row.category || "Other").trim() || "Other",
      total: typeof row.total === "string" ? parseFloat(row.total) || 0 : row.total || 0,
    }));

    console.log(`[Category Bubble API] Returning ${formatted.length} categories`);

    return NextResponse.json(formatted);
  } catch (error: any) {
    console.error("[Category Bubble API] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch category bubble data" },
      { status: 500 },
    );
  }
};





