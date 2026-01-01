// app/api/analytics/monthly-category-duplicate/route.ts
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
      console.error("[Monthly Category Duplicate API] Auth error:", authError.message);
      return NextResponse.json(
        { error: "Authentication required. Please sign in to access analytics." },
        { status: 401 },
      );
    }

    const { searchParams } = request.nextUrl;
    const filter = searchParams.get("filter");
    const month = searchParams.get("month"); // 1-12 (January = 1, February = 2, etc.)
    const months = searchParams.get("months"); // Comma-separated list of months for batch requests (e.g., "1,2,3")
    
    const { startDate, endDate } = getDateRange(filter);

    // Always return all 12 months (1-12) for the selector, regardless of date filter
    // This allows users to select any month, even if there's no data in the filtered range
    const availableMonths = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

    // Handle batch requests (multiple months at once)
    if (months) {
      const monthList = months.split(',').map(m => parseInt(m.trim(), 10)).filter(m => !isNaN(m) && m >= 1 && m <= 12);
      
      if (monthList.length > 0) {
        // Batch query: fetch all requested months in a single query
        // Use IN clause instead of ANY for better compatibility
        const monthPlaceholders = monthList.map((_, i) => `$${i + 2}`).join(', ');
        let batchQuery = `
          SELECT 
            COALESCE(c.name, 'Other') AS category,
            EXTRACT(MONTH FROM t.tx_date)::int AS month,
            SUM(ABS(t.amount)) AS total
          FROM transactions t
          LEFT JOIN categories c ON t.category_id = c.id
          WHERE t.user_id = $1
            AND t.amount < 0
            AND EXTRACT(MONTH FROM t.tx_date)::int IN (${monthPlaceholders})
        `;
        
        const batchParams: any[] = [userId, ...monthList];
        
        if (startDate && endDate) {
          const dateParamStart = 2 + monthList.length;
          batchQuery += ` AND t.tx_date >= $${dateParamStart} AND t.tx_date <= $${dateParamStart + 1}`;
          batchParams.push(startDate, endDate);
        }
        
        batchQuery += `
          GROUP BY COALESCE(c.name, 'Other'), EXTRACT(MONTH FROM t.tx_date)::int
          ORDER BY month, total DESC
        `;
        
        
        const batchRows = await neonQuery<{
          category: string | null;
          month: number;
          total: number | string | null;
        }>(batchQuery, batchParams);
        
        // Group results by month
        const resultsByMonth = new Map<number, Array<{ category: string; total: number }>>();
        monthList.forEach(m => resultsByMonth.set(m, []));
        
        batchRows.forEach((row) => {
          const category = (row.category || "Other").trim() || "Other";
          const total = typeof row.total === "string" ? parseFloat(row.total) || 0 : row.total || 0;
          const monthNum = row.month;
          
          if (resultsByMonth.has(monthNum)) {
            const existing = resultsByMonth.get(monthNum)!;
            const existingIndex = existing.findIndex(item => item.category === category);
            if (existingIndex >= 0) {
              existing[existingIndex].total += total;
            } else {
              existing.push({ category, total });
            }
          }
        });
        
        // Format results for each month
        const batchResults: Record<number, Array<{ category: string; month: number; total: number }>> = {};
        resultsByMonth.forEach((data, monthNum) => {
          batchResults[monthNum] = data
            .map(item => ({ category: item.category, month: monthNum, total: item.total }))
            .sort((a, b) => b.total - a.total);
        });
        
        return NextResponse.json({
          data: batchResults,
          availableMonths,
        }, {
          headers: {
            'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
          },
        });
      }
    }

    // Now fetch category data - if month is selected, filter to that month; otherwise use date filter
    // Group by month number only (1-12), not year-month
    let query = `
      SELECT 
        COALESCE(c.name, 'Other') AS category,
        EXTRACT(MONTH FROM t.tx_date)::int AS month,
        SUM(ABS(t.amount)) AS total
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.id
      WHERE t.user_id = $1
        AND t.amount < 0
    `;

    const params: any[] = [userId];

    // Apply month filter if provided
    // When month is selected, we should filter by month AND respect the date filter
    // This ensures we only show data for that month within the filtered date range
    if (month !== null && month !== undefined && month !== "") {
      const monthNum = parseInt(month, 10);
      if (!isNaN(monthNum) && monthNum >= 1 && monthNum <= 12) {
        // Always apply date filter if provided, even when month is selected
        // This ensures consistency with other charts that respect the date filter
        if (startDate && endDate) {
          query += ` AND EXTRACT(MONTH FROM t.tx_date)::int = $2 AND t.tx_date >= $3 AND t.tx_date <= $4`;
          params.push(monthNum, startDate, endDate);
        } else {
          // If no date filter, show all years for that month (original behavior)
          query += ` AND EXTRACT(MONTH FROM t.tx_date)::int = $2`;
          params.push(monthNum);
        }
      } else if (startDate && endDate) {
        query += ` AND t.tx_date >= $2 AND t.tx_date <= $3`;
        params.push(startDate, endDate);
      }
    } else if (startDate && endDate) {
      query += ` AND t.tx_date >= $2 AND t.tx_date <= $3`;
      params.push(startDate, endDate);
    }

    // If filtering to a specific month, order by total DESC only; otherwise order by month then total
    if (month !== null && month !== undefined && month !== "") {
      query += `
        GROUP BY COALESCE(c.name, 'Other'), EXTRACT(MONTH FROM t.tx_date)::int
        ORDER BY total DESC
      `;
    } else {
      query += `
        GROUP BY COALESCE(c.name, 'Other'), EXTRACT(MONTH FROM t.tx_date)::int
        ORDER BY month, total DESC
      `;
    }

    
    const rows = await neonQuery<{
      category: string | null;
      month: number;
      total: number | string | null;
    }>(query, params);


    // Format data - SQL already groups by category and month
    // When a specific month is selected:
    //   - If date filter is applied: SQL filters by month AND date range, each category has one row
    //   - If no date filter: SQL filters by month only (across all years), each category might have multiple rows (one per year)
    // We need to aggregate only if there could be multiple rows per category
    const categoryTotals = new Map<string, number>();
    rows.forEach((row) => {
      const category = (row.category || "Other").trim() || "Other";
      const total = typeof row.total === "string" ? parseFloat(row.total) || 0 : row.total || 0;
      // If month is selected but no date filter, we might have multiple rows per category (different years)
      // If date filter is applied, each category should have one row, but aggregating is safe
      const current = categoryTotals.get(category) || 0;
      categoryTotals.set(category, current + total);
    });
    
    const totalSum = Array.from(categoryTotals.values()).reduce((sum, val) => sum + val, 0);

    // Convert to array and sort by total
    const formatted = Array.from(categoryTotals.entries())
      .map(([category, total]) => ({
        category,
        month: month ? parseInt(month, 10) : 0,
        total,
      }))
      .sort((a, b) => b.total - a.total);


    return NextResponse.json({
      data: formatted,
      availableMonths,
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
      },
    });
  } catch (error: any) {
    console.error("[Monthly Category Duplicate API] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch monthly category data" },
      { status: 500 },
    );
  }
};

