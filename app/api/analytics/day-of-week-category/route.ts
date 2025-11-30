// app/api/analytics/day-of-week-category/route.ts
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
      console.log("[Day of Week Category API] User ID:", userId);
    } catch (authError: any) {
      console.error("[Day of Week Category API] Auth error:", authError.message);
      return NextResponse.json(
        { error: "Authentication required. Set DEMO_USER_ID in .env.local" },
        { status: 401 },
      );
    }

    const { searchParams } = request.nextUrl;
    const filter = searchParams.get("filter");
    const dayOfWeek = searchParams.get("dayOfWeek"); // 0-6 (Monday = 0, Tuesday = 1, ..., Sunday = 6)
    
    const { startDate, endDate } = getDateRange(filter);

    // First, fetch all days of week within the date filter range to populate the selector
    // PostgreSQL DOW: 0=Sunday, 1=Monday, etc.
    // We convert to Monday-first: 0=Monday, 1=Tuesday, ..., 6=Sunday
    let queryForDays = `
      SELECT DISTINCT (EXTRACT(DOW FROM t.tx_date)::int + 6) % 7 AS day_of_week
      FROM transactions t
      WHERE t.user_id = $1
        AND t.amount < 0
    `;

    const paramsForDays: any[] = [userId];

    if (startDate && endDate) {
      queryForDays += ` AND t.tx_date >= $2 AND t.tx_date <= $3`;
      paramsForDays.push(startDate, endDate);
    }

    queryForDays += ` ORDER BY day_of_week`;

    const dayRows = await neonQuery<{ day_of_week: number }>(queryForDays, paramsForDays);
    const availableDays = dayRows.map((row) => row.day_of_week);

    // Now fetch category data - if dayOfWeek is selected, filter to that day; otherwise use date filter
    // Convert to Monday-first system: 0=Monday, 1=Tuesday, ..., 6=Sunday
    let query = `
      SELECT 
        COALESCE(c.name, 'Other') AS category,
        (EXTRACT(DOW FROM t.tx_date)::int + 6) % 7 AS day_of_week,
        SUM(ABS(t.amount)) AS total
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.id
      WHERE t.user_id = $1
        AND t.amount < 0
    `;

    const params: any[] = [userId];

    // Apply day of week filter if provided
    // dayOfWeek is in Monday-first format (0=Monday, 6=Sunday)
    // Convert back to PostgreSQL DOW format for filtering: (dayOfWeek + 1) % 7
    if (dayOfWeek !== null && dayOfWeek !== undefined && dayOfWeek !== "") {
      const dayNum = parseInt(dayOfWeek, 10);
      if (!isNaN(dayNum) && dayNum >= 0 && dayNum <= 6) {
        // Convert Monday-first (0-6) back to PostgreSQL DOW (0=Sunday, 1=Monday, etc.)
        // Monday (0) -> PostgreSQL Monday (1)
        // Tuesday (1) -> PostgreSQL Tuesday (2)
        // ...
        // Sunday (6) -> PostgreSQL Sunday (0)
        const pgDOW = (dayNum + 1) % 7;
        query += ` AND EXTRACT(DOW FROM t.tx_date)::int = $2`;
        params.push(pgDOW);
        
        // Still apply date filter if provided
        if (startDate && endDate) {
          query += ` AND t.tx_date >= $3 AND t.tx_date <= $4`;
          params.push(startDate, endDate);
        }
      } else if (startDate && endDate) {
        query += ` AND t.tx_date >= $2 AND t.tx_date <= $3`;
        params.push(startDate, endDate);
      }
    } else if (startDate && endDate) {
      query += ` AND t.tx_date >= $2 AND t.tx_date <= $3`;
      params.push(startDate, endDate);
    }

    // If filtering to a specific day, order by total DESC only; otherwise order by day then total
    if (dayOfWeek !== null && dayOfWeek !== undefined && dayOfWeek !== "") {
      query += `
        GROUP BY COALESCE(c.name, 'Other'), EXTRACT(DOW FROM t.tx_date)::int
        ORDER BY total DESC
      `;
    } else {
      query += `
        GROUP BY COALESCE(c.name, 'Other'), EXTRACT(DOW FROM t.tx_date)::int
        ORDER BY day_of_week, total DESC
      `;
    }

    const rows = await neonQuery<{
      category: string | null;
      day_of_week: number;
      total: number | string | null;
    }>(query, params);

    // Format data
    const formatted = rows.map((row) => ({
      category: (row.category || "Other").trim() || "Other",
      dayOfWeek: row.day_of_week,
      total: typeof row.total === "string" ? parseFloat(row.total) || 0 : row.total || 0,
    }));

    // Data is already sorted by total DESC if a specific day was selected
    const filteredData = formatted;

    console.log(`[Day of Week Category API] Returning ${filteredData.length} category-day entries`);
    console.log(`[Day of Week Category API] Available days:`, availableDays);

    return NextResponse.json({
      data: filteredData,
      availableDays,
    });
  } catch (error: any) {
    console.error("[Day of Week Category API] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch day of week category data" },
      { status: 500 },
    );
  }
};
