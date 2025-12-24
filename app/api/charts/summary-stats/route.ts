// app/api/charts/summary-stats/route.ts
// Server-side aggregated endpoint for SectionCards stats
// Returns pre-calculated income, expenses, savings rate, and trends

import { NextResponse } from "next/server";
import { neonQuery } from "@/lib/neonClient";
import { getCurrentUserIdOrNull } from "@/lib/auth";

interface DailyStats {
    date: string;
    income: number;
    expenses: number;
    balance: number | null;
}

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

        // Build date filter clause
        let dateClause = "";
        const params: any[] = [userId];
        if (startDate && endDate) {
            dateClause = ` AND tx_date >= $2 AND tx_date <= $3`;
            params.push(startDate, endDate);
        }

        // Query 1: Get aggregated totals and daily breakdown
        const dailyQuery = `
      SELECT 
        DATE(tx_date) as date,
        SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END) as income,
        SUM(CASE WHEN amount < 0 THEN ABS(amount) ELSE 0 END) as expenses,
        MAX(balance) as balance
      FROM transactions
      WHERE user_id = $1${dateClause}
      GROUP BY DATE(tx_date)
      ORDER BY date ASC
    `;

        const dailyData = await neonQuery<{
            date: string | Date;
            income: string | number;
            expenses: string | number;
            balance: string | number | null;
        }>(dailyQuery, params);

        // Process daily data
        const dailyStats: DailyStats[] = dailyData.map(row => ({
            date: typeof row.date === 'string' ? row.date.split('T')[0] : row.date.toISOString().split('T')[0],
            income: Number(row.income) || 0,
            expenses: Number(row.expenses) || 0,
            balance: row.balance !== null ? Number(row.balance) : null,
        }));

        // Calculate totals
        const totalIncome = dailyStats.reduce((sum, day) => sum + day.income, 0);
        const totalExpenses = dailyStats.reduce((sum, day) => sum + day.expenses, 0);
        const savingsRate = totalIncome > 0
            ? ((totalIncome - totalExpenses) / totalIncome) * 100
            : 0;

        // Get most recent balance as net worth
        const netWorth = dailyStats.length > 0 && dailyStats[dailyStats.length - 1].balance !== null
            ? dailyStats[dailyStats.length - 1].balance!
            : totalIncome - totalExpenses;

        // Query 2: Get previous period stats for comparison (3 months ago vs 6 months ago)
        const prevParams: any[] = [userId];
        const now = new Date();
        const threeMonthsAgo = new Date(now);
        threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
        const sixMonthsAgo = new Date(threeMonthsAgo);
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 3);

        const formatDateStr = (d: Date) => d.toISOString().split('T')[0];
        prevParams.push(formatDateStr(sixMonthsAgo), formatDateStr(threeMonthsAgo));

        const prevQuery = `
      SELECT 
        SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END) as income,
        SUM(CASE WHEN amount < 0 THEN ABS(amount) ELSE 0 END) as expenses
      FROM transactions
      WHERE user_id = $1 AND tx_date >= $2 AND tx_date < $3
    `;

        const prevData = await neonQuery<{
            income: string | number;
            expenses: string | number;
        }>(prevQuery, prevParams);

        const previousIncome = Number(prevData[0]?.income) || 0;
        const previousExpenses = Number(prevData[0]?.expenses) || 0;
        const previousSavingsRate = previousIncome > 0
            ? ((previousIncome - previousExpenses) / previousIncome) * 100
            : 0;

        // Calculate percentage changes
        const incomeChange = previousIncome > 0
            ? ((totalIncome - previousIncome) / previousIncome) * 100
            : totalIncome > 0 ? 100 : 0;

        const expensesChange = previousExpenses > 0
            ? ((totalExpenses - previousExpenses) / previousExpenses) * 100
            : totalExpenses > 0 ? 100 : 0;

        const savingsRateChange = savingsRate - previousSavingsRate;

        // Build trend arrays for sparklines
        let cumulativeIncome = 0;
        const incomeTrend = dailyStats.map(day => {
            cumulativeIncome += day.income;
            return { date: day.date, value: cumulativeIncome };
        });

        let cumulativeExpenses = 0;
        const expensesTrend = dailyStats.map(day => {
            cumulativeExpenses += day.expenses;
            return { date: day.date, value: cumulativeExpenses };
        });

        let runningBalance = 0;
        const netWorthTrend = dailyStats.map(day => {
            if (day.balance !== null) {
                runningBalance = day.balance;
            } else {
                runningBalance += day.income - day.expenses;
            }
            return { date: day.date, value: runningBalance };
        });

        // Transaction count and timespan
        const countQuery = `
      SELECT COUNT(*) as count, MIN(tx_date) as min_date, MAX(tx_date) as max_date
      FROM transactions
      WHERE user_id = $1${dateClause}
    `;

        const countData = await neonQuery<{
            count: string | number;
            min_date: string | Date | null;
            max_date: string | Date | null;
        }>(countQuery, params);

        const transactionCount = Number(countData[0]?.count) || 0;

        // Calculate timespan
        let transactionTimeSpan = "No data";
        if (countData[0]?.min_date && countData[0]?.max_date) {
            const minDate = new Date(countData[0].min_date);
            const maxDate = new Date(countData[0].max_date);
            const diffMs = maxDate.getTime() - minDate.getTime();
            const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

            if (diffDays >= 365) {
                const years = Math.floor(diffDays / 365);
                const months = Math.floor((diffDays % 365) / 30);
                transactionTimeSpan = months > 0
                    ? `${years} year${years > 1 ? 's' : ''} and ${months} month${months > 1 ? 's' : ''}`
                    : `${years} year${years > 1 ? 's' : ''}`;
            } else if (diffDays >= 30) {
                const months = Math.floor(diffDays / 30);
                const days = diffDays % 30;
                transactionTimeSpan = days > 0
                    ? `${months} month${months > 1 ? 's' : ''} and ${days} day${days > 1 ? 's' : ''}`
                    : `${months} month${months > 1 ? 's' : ''}`;
            } else {
                transactionTimeSpan = `${diffDays} day${diffDays !== 1 ? 's' : ''}`;
            }
        }

        // Monthly transaction counts for trend
        const monthlyQuery = `
      SELECT 
        TO_CHAR(tx_date, 'YYYY-MM') as month,
        COUNT(*) as count
      FROM transactions
      WHERE user_id = $1${dateClause}
      GROUP BY TO_CHAR(tx_date, 'YYYY-MM')
      ORDER BY month ASC
    `;

        const monthlyData = await neonQuery<{
            month: string;
            count: string | number;
        }>(monthlyQuery, params);

        const transactionTrend = monthlyData.map(row => ({
            date: row.month,
            value: Number(row.count) || 0,
        }));

        return NextResponse.json({
            totalIncome,
            totalExpenses,
            savingsRate,
            netWorth,
            incomeChange,
            expensesChange,
            savingsRateChange,
            netWorthChange: 0, // Would need previous net worth to calculate
            incomeTrend,
            expensesTrend,
            netWorthTrend,
            transactionCount,
            transactionTimeSpan,
            transactionTrend,
        }, {
            headers: {
                'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
            },
        });

    } catch (error: any) {
        console.error("[Summary Stats API] Error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to fetch summary stats" },
            { status: 500 }
        );
    }
};
