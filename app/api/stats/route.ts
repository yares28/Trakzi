// app/api/stats/route.ts
import { NextResponse } from "next/server";
import { neonQuery } from "@/lib/neonClient";
import { getCurrentUserId } from "@/lib/auth";

function getDateRange(filter: string | null): { startDate: string | null; endDate: string | null; previousStartDate: string | null; previousEndDate: string | null } {
    if (!filter) {
        // Default to all-time stats (no date filter) - consistent with transactions API
        // This ensures stats show all transactions when no filter is set
        // For comparison, we'll use an empty previous period (all changes will be 0 or 100%)
        return {
            startDate: null,
            endDate: null,
            previousStartDate: null,
            previousEndDate: null
        };
    }

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const formatDate = (date: Date) => date.toISOString().split('T')[0];
    
    let startDate: Date;
    let endDate: Date = today;
    
    switch (filter) {
        case "last7days": {
            startDate = new Date(today);
            startDate.setDate(startDate.getDate() - 7);
            const previousStartDate = new Date(startDate);
            previousStartDate.setDate(previousStartDate.getDate() - 7);
            return {
                startDate: formatDate(startDate),
                endDate: formatDate(endDate),
                previousStartDate: formatDate(previousStartDate),
                previousEndDate: formatDate(new Date(startDate.getTime() - 1))
            };
        }
        case "last30days": {
            startDate = new Date(today);
            startDate.setDate(startDate.getDate() - 30);
            const previousStartDate = new Date(startDate);
            previousStartDate.setDate(previousStartDate.getDate() - 30);
            return {
                startDate: formatDate(startDate),
                endDate: formatDate(endDate),
                previousStartDate: formatDate(previousStartDate),
                previousEndDate: formatDate(new Date(startDate.getTime() - 1))
            };
        }
        case "last3months": {
            startDate = new Date(today);
            startDate.setMonth(startDate.getMonth() - 3);
            const previousStartDate = new Date(startDate);
            previousStartDate.setMonth(previousStartDate.getMonth() - 3);
            return {
                startDate: formatDate(startDate),
                endDate: formatDate(endDate),
                previousStartDate: formatDate(previousStartDate),
                previousEndDate: formatDate(new Date(startDate.getTime() - 1))
            };
        }
        case "last6months": {
            startDate = new Date(today);
            startDate.setMonth(startDate.getMonth() - 6);
            const previousStartDate = new Date(startDate);
            previousStartDate.setMonth(previousStartDate.getMonth() - 6);
            return {
                startDate: formatDate(startDate),
                endDate: formatDate(endDate),
                previousStartDate: formatDate(previousStartDate),
                previousEndDate: formatDate(new Date(startDate.getTime() - 1))
            };
        }
        case "lastyear": {
            startDate = new Date(today);
            startDate.setFullYear(startDate.getFullYear() - 1);
            const previousStartDate = new Date(startDate);
            previousStartDate.setFullYear(previousStartDate.getFullYear() - 1);
            return {
                startDate: formatDate(startDate),
                endDate: formatDate(endDate),
                previousStartDate: formatDate(previousStartDate),
                previousEndDate: formatDate(new Date(startDate.getTime() - 1))
            };
        }
        default: {
            // Assume it's a year string (e.g., "2024")
            const year = parseInt(filter);
            if (!isNaN(year)) {
                const previousYear = year - 1;
                return {
                    startDate: `${year}-01-01`,
                    endDate: `${year}-12-31`,
                    previousStartDate: `${previousYear}-01-01`,
                    previousEndDate: `${previousYear}-12-31`
                };
            }
            // Fallback to current month
            const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
            const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
            const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            const previousMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
            return {
                startDate: formatDate(currentMonthStart),
                endDate: formatDate(currentMonthEnd),
                previousStartDate: formatDate(previousMonthStart),
                previousEndDate: formatDate(previousMonthEnd)
            };
        }
    }
}

export const GET = async (request: Request) => {
    try {
        let userId: string;
        try {
            userId = await getCurrentUserId();
        } catch (authError: any) {
            // If auth fails, return empty stats instead of error
            console.warn("Auth error in stats API:", authError.message);
            return NextResponse.json({
                totalIncome: 0,
                totalExpenses: 0,
                savingsRate: 0,
                netWorth: 0,
                incomeChange: 0,
                expensesChange: 0,
                savingsRateChange: 0,
                netWorthChange: 0
            });
        }
        
        // Get filter from query params
        const { searchParams } = new URL(request.url);
        const filter = searchParams.get("filter");
        
        // Get date ranges based on filter
        const { startDate, endDate, previousStartDate, previousEndDate } = getDateRange(filter);
        
        // Optimized query using SQL aggregations instead of fetching all rows
        // This is much faster as it does calculations in the database
        let currentPeriodQuery: string;
        const currentParams: any[] = [userId];
        
        if (startDate && endDate) {
            currentPeriodQuery = `
                SELECT 
                    COALESCE(SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END), 0) as total_income,
                    COALESCE(SUM(CASE WHEN amount < 0 THEN ABS(amount) ELSE 0 END), 0) as total_expenses
                FROM transactions 
                WHERE user_id = $1 AND tx_date >= $2 AND tx_date <= $3
            `;
            currentParams.push(startDate, endDate);
        } else {
            currentPeriodQuery = `
                SELECT 
                    COALESCE(SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END), 0) as total_income,
                    COALESCE(SUM(CASE WHEN amount < 0 THEN ABS(amount) ELSE 0 END), 0) as total_expenses
                FROM transactions 
                WHERE user_id = $1
            `;
        }
        
        // Fetch aggregated stats for current period
        const currentStats = await neonQuery<{
            total_income: number | string;
            total_expenses: number | string;
        }>(currentPeriodQuery, currentParams);
        
        const currentResult = currentStats[0] || { total_income: 0, total_expenses: 0 };
        
        // Helper function to safely convert to number
        const toNumber = (value: any): number => {
            if (value === null || value === undefined) return 0;
            const num = typeof value === 'string' ? parseFloat(value) : Number(value);
            return isNaN(num) ? 0 : num;
        };
        
        const currentIncome = toNumber(currentResult.total_income);
        const currentExpenses = toNumber(currentResult.total_expenses);
        // Net worth is calculated as income minus expenses
        const netWorth = currentIncome - currentExpenses;
        
        // Get previous period stats if we have a filter
        let previousIncome = 0;
        let previousExpenses = 0;
        let previousNetWorth = 0;
        
        if (previousStartDate && previousEndDate) {
            const previousPeriodQuery = `
                SELECT 
                    COALESCE(SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END), 0) as total_income,
                    COALESCE(SUM(CASE WHEN amount < 0 THEN ABS(amount) ELSE 0 END), 0) as total_expenses
                FROM transactions 
                WHERE user_id = $1 AND tx_date >= $2 AND tx_date <= $3
            `;
            
            const previousStats = await neonQuery<{
                total_income: number | string;
                total_expenses: number | string;
            }>(previousPeriodQuery, [userId, previousStartDate, previousEndDate]);
            
            const previousResult = previousStats[0] || { total_income: 0, total_expenses: 0 };
            previousIncome = toNumber(previousResult.total_income);
            previousExpenses = toNumber(previousResult.total_expenses);
            // Previous net worth is also calculated as income minus expenses
            previousNetWorth = previousIncome - previousExpenses;
        }
        
        // Calculate savings rate
        const currentSavingsRate = currentIncome > 0 
            ? ((currentIncome - currentExpenses) / currentIncome) * 100 
            : 0;
        
        const previousSavingsRate = previousIncome > 0 
            ? ((previousIncome - previousExpenses) / previousIncome) * 100 
            : 0;
        
        // Net worth = income - expenses (calculated above)
        
        // Calculate percentage changes
        const incomeChange = previousIncome > 0 
            ? ((currentIncome - previousIncome) / previousIncome) * 100 
            : (currentIncome > 0 ? 100 : 0);
        
        const expensesChange = previousExpenses > 0 
            ? ((currentExpenses - previousExpenses) / previousExpenses) * 100 
            : (currentExpenses > 0 ? 100 : 0);
        
        const savingsRateChange = previousSavingsRate !== 0 
            ? currentSavingsRate - previousSavingsRate 
            : (currentSavingsRate > 0 ? 100 : 0);
        
        const netWorthChange = previousNetWorth > 0 
            ? ((netWorth - previousNetWorth) / previousNetWorth) * 100 
            : (netWorth > 0 ? 100 : 0);
        
        const result = {
            totalIncome: currentIncome,
            totalExpenses: currentExpenses,
            savingsRate: currentSavingsRate,
            netWorth: netWorth,
            incomeChange: incomeChange,
            expensesChange: expensesChange,
            savingsRateChange: savingsRateChange,
            netWorthChange: netWorthChange
        };
        
        console.log("[Stats API] Calculated stats:", result);
        
        // Add caching headers for better performance
        // Cache for 30 seconds, revalidate in background
        return NextResponse.json(result, {
            headers: {
                'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
            },
        });
    } catch (error: any) {
        console.error("Stats API error:", error);
        console.error("Stats API error stack:", error.stack);
        console.error("Stats API error details:", {
            message: error.message,
            name: error.name,
            cause: error.cause
        });
        return NextResponse.json(
            { 
                error: error.message || "Failed to fetch stats",
                details: process.env.NODE_ENV === 'development' ? error.stack : undefined
            },
            { status: 500 }
        );
    }
};

