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
        
        console.log("[Stats API] Filter:", filter);
        console.log("[Stats API] User ID:", userId);
        
        // Get date ranges based on filter
        const { startDate, endDate, previousStartDate, previousEndDate } = getDateRange(filter);
        
        console.log("[Stats API] Date range:", { startDate, endDate, previousStartDate, previousEndDate });
        
        // Build query with optional date filtering
        let query = `SELECT amount, tx_date, balance FROM transactions WHERE user_id = $1`;
        const params: any[] = [userId];
        
        if (startDate && endDate) {
            query += ` AND tx_date >= $2 AND tx_date <= $3`;
            params.push(startDate, endDate);
        }
        
        query += ` ORDER BY tx_date DESC`;
        
        console.log("[Stats API] Query:", query);
        console.log("[Stats API] Params:", params);
        
        // Fetch user transactions ordered by date
        const allUserTransactions = await neonQuery<{
            amount: number;
            tx_date: string;
            balance: number | null;
        }>(query, params);
        
        console.log(`[Stats API] Found ${allUserTransactions.length} transactions for current period`);
        if (allUserTransactions.length > 0) {
            console.log(`[Stats API] Sample transaction:`, {
                amount: allUserTransactions[0].amount,
                amountType: typeof allUserTransactions[0].amount,
                amountValue: allUserTransactions[0].amount
            });
        }
        
        // Get previous period transactions if we have a filter
        let previousTransactions: typeof allUserTransactions = [];
        if (previousStartDate && previousEndDate) {
            let prevQuery = `SELECT amount, tx_date, balance FROM transactions WHERE user_id = $1 AND tx_date >= $2 AND tx_date <= $3 ORDER BY tx_date DESC`;
            previousTransactions = await neonQuery<{
                amount: number;
                tx_date: string;
                balance: number | null;
            }>(prevQuery, [userId, previousStartDate, previousEndDate]);
            console.log(`[Stats API] Found ${previousTransactions.length} transactions for previous period`);
        }
        
        // Filter transactions by date range (already filtered in query, but keep for consistency)
        const normalizeDate = (value: string | Date) => {
            if (value instanceof Date) {
                return value.toISOString().split('T')[0];
            }
            if (typeof value === "string") {
                return value.split('T')[0];
            }
            return new Date(value as any).toISOString().split('T')[0];
        };

        const currentTransactions = allUserTransactions.filter(tx => {
            const txDate = normalizeDate(tx.tx_date);
            return !startDate || !endDate || (txDate >= startDate && txDate <= endDate);
        });
        
        console.log(`[Stats API] Current transactions after filter: ${currentTransactions.length}`);
        
        // Helper function to safely convert to number
        const toNumber = (value: any): number => {
            if (value === null || value === undefined) return 0;
            const num = typeof value === 'string' ? parseFloat(value) : Number(value);
            return isNaN(num) ? 0 : num;
        };
        
        // Calculate totals - ensure amounts are numbers
        const currentIncome = currentTransactions
            .filter(tx => {
                const amount = toNumber(tx.amount);
                return amount > 0;
            })
            .reduce((sum, tx) => sum + toNumber(tx.amount), 0);
        
        const currentExpenses = Math.abs(currentTransactions
            .filter(tx => {
                const amount = toNumber(tx.amount);
                return amount < 0;
            })
            .reduce((sum, tx) => sum + toNumber(tx.amount), 0));
        
        const previousIncome = previousTransactions
            .filter(tx => {
                const amount = toNumber(tx.amount);
                return amount > 0;
            })
            .reduce((sum, tx) => sum + toNumber(tx.amount), 0);
        
        const previousExpenses = Math.abs(previousTransactions
            .filter(tx => {
                const amount = toNumber(tx.amount);
                return amount < 0;
            })
            .reduce((sum, tx) => sum + toNumber(tx.amount), 0));
        
        console.log(`[Stats API] Calculated values:`, {
            currentIncome,
            currentExpenses,
            previousIncome,
            previousExpenses,
            currentTransactionsCount: currentTransactions.length
        });
        
        // Calculate savings rate
        const currentSavingsRate = currentIncome > 0 
            ? ((currentIncome - currentExpenses) / currentIncome) * 100 
            : 0;
        
        const previousSavingsRate = previousIncome > 0 
            ? ((previousIncome - previousExpenses) / previousIncome) * 100 
            : 0;
        
        // Calculate net worth (use latest transaction balance)
        // Transactions are already sorted by date desc, so first one is latest
        const netWorth = allUserTransactions.length > 0 && allUserTransactions[0].balance != null
            ? toNumber(allUserTransactions[0].balance) 
            : 0;
        
        // Get previous period's net worth (latest transaction balance in previous period)
        const previousNetWorth = previousTransactions.length > 0 && previousTransactions[0].balance != null
            ? toNumber(previousTransactions[0].balance) 
            : 0;
        
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
        
        return NextResponse.json(result);
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

