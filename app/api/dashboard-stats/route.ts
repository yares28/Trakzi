// app/api/dashboard-stats/route.ts
import { NextResponse } from "next/server";
import { neonQuery } from "@/lib/neonClient";
import { getCurrentUserId } from "@/lib/auth";

// Category classification for 50/30/20 rule
const NEEDS_CATEGORIES = [
    "groceries", "rent", "mortgage", "utilities", "transport", "fuel",
    "insurance", "health & fitness", "taxes & fees", "health care"
];

const WANTS_CATEGORIES = [
    "restaurants", "bars", "entertainment", "shopping", "subscriptions",
    "travel", "services", "education", "alcohol", "soda & cola",
    "energy drinks", "snacks"
];

const SAVINGS_CATEGORIES = ["savings", "transfers", "income", "refunds"];

// Healthy vs unhealthy food categories for fridge scoring
const HEALTHY_FOOD_CATEGORIES = [
    "fruits", "vegetables", "meat", "fish & seafood", "eggs",
    "plant-based protein", "dairy", "water", "juice", "coffee & tea"
];

const UNHEALTHY_FOOD_CATEGORIES = [
    "snacks", "soda & cola", "energy drinks", "alcohol", "frozen foods",
    "bread & bakery" // High carb processed foods
];

// Benchmark averages (based on typical spending patterns)
const CATEGORY_BENCHMARKS: Record<string, { avgPercent: number; description: string }> = {
    "groceries": { avgPercent: 12, description: "Food & groceries" },
    "restaurants": { avgPercent: 8, description: "Dining out" },
    "rent": { avgPercent: 30, description: "Housing" },
    "utilities": { avgPercent: 5, description: "Utilities" },
    "transport": { avgPercent: 10, description: "Transportation" },
    "entertainment": { avgPercent: 5, description: "Entertainment" },
    "shopping": { avgPercent: 8, description: "Shopping" },
    "subscriptions": { avgPercent: 3, description: "Subscriptions" },
    "health & fitness": { avgPercent: 4, description: "Health" },
};

function classifyCategory(categoryName: string): "needs" | "wants" | "savings" | "other" {
    const normalized = categoryName.toLowerCase().trim();
    if (NEEDS_CATEGORIES.some(c => normalized.includes(c))) return "needs";
    if (WANTS_CATEGORIES.some(c => normalized.includes(c))) return "wants";
    if (SAVINGS_CATEGORIES.some(c => normalized.includes(c))) return "savings";
    return "other";
}

function classifyFoodCategory(categoryName: string): "healthy" | "unhealthy" | "neutral" {
    const normalized = categoryName.toLowerCase().trim();
    if (HEALTHY_FOOD_CATEGORIES.some(c => normalized.includes(c))) return "healthy";
    if (UNHEALTHY_FOOD_CATEGORIES.some(c => normalized.includes(c))) return "unhealthy";
    return "neutral";
}

const toNumber = (value: any): number => {
    if (value === null || value === undefined) return 0;
    const num = typeof value === 'string' ? parseFloat(value) : Number(value);
    return isNaN(num) ? 0 : num;
};

export const GET = async () => {
    try {
        let userId: string;
        try {
            userId = await getCurrentUserId();
        } catch (authError: any) {
            console.warn("[Dashboard Stats API] Auth error:", authError.message);
            return NextResponse.json({
                analytics: {
                    transactionCount: 0,
                    score: 0,
                    needsPercent: 0,
                    wantsPercent: 0,
                    savingsPercent: 0,
                    breakdown: { needs: 0, wants: 0, savings: 0 }
                },
                fridge: {
                    transactionCount: 0,
                    score: 0,
                    healthyPercent: 0,
                    unhealthyPercent: 0,
                    breakdown: { healthy: 0, unhealthy: 0, neutral: 0 }
                },
                savings: {
                    transactionCount: 0,
                    savingsRate: 0,
                    score: 0,
                    totalIncome: 0,
                    totalExpenses: 0,
                    monthlyAvgSavings: 0
                },
                trends: {
                    transactionCount: 0,
                    score: 0,
                    categoryCount: 0,
                    monthCount: 0,
                    categoryAnalysis: []
                },
                comparison: {
                    userCount: 0,
                    analytics: { userRank: 0, avgScore: 0, percentile: 0 },
                    fridge: { userRank: 0, avgScore: 0, percentile: 0 },
                    savings: { userRank: 0, avgScore: 0, percentile: 0 },
                    trends: { userRank: 0, avgScore: 0, percentile: 0 },
                }
            });
        }

        // === ANALYTICS: 50/30/20 Rule Analysis ===

        // Get spending by category (excluding income)
        const categorySpendingResult = await neonQuery<{
            category_name: string;
            total_spent: number | string;
        }>(`
            SELECT 
                COALESCE(c.name, 'Other') as category_name,
                COALESCE(SUM(ABS(t.amount)), 0) as total_spent
            FROM transactions t
            LEFT JOIN categories c ON t.category_id = c.id
            WHERE t.user_id = $1 AND t.amount < 0
            GROUP BY c.name
        `, [userId]);

        let needsTotal = 0;
        let wantsTotal = 0;
        let savingsTotal = 0;
        let otherTotal = 0;

        categorySpendingResult.forEach(row => {
            const spent = toNumber(row.total_spent);
            const classification = classifyCategory(row.category_name);
            switch (classification) {
                case "needs": needsTotal += spent; break;
                case "wants": wantsTotal += spent; break;
                case "savings": savingsTotal += spent; break;
                default: otherTotal += spent;
            }
        });

        const totalSpending = needsTotal + wantsTotal + savingsTotal + otherTotal;
        const needsPercent = totalSpending > 0 ? Math.round((needsTotal / totalSpending) * 100) : 0;
        const wantsPercent = totalSpending > 0 ? Math.round((wantsTotal / totalSpending) * 100) : 0;
        const otherPercent = totalSpending > 0 ? Math.round((otherTotal / totalSpending) * 100) : 0;

        // Calculate analytics score based on how close to 50/30/20 rule
        // Perfect: Needs <= 50%, Wants <= 30%, Savings >= 20%
        let analyticsScore = 100;

        // Penalize if needs > 50%
        if (needsPercent > 50) {
            analyticsScore -= Math.min(30, (needsPercent - 50) * 2);
        }

        // Penalize if wants > 30%
        if (wantsPercent > 30) {
            analyticsScore -= Math.min(30, (wantsPercent - 30) * 2);
        }

        // Bonus for good balance
        if (needsPercent <= 50 && wantsPercent <= 30) {
            analyticsScore = Math.min(100, analyticsScore + 10);
        }

        analyticsScore = Math.max(0, Math.min(100, Math.round(analyticsScore)));

        // Transaction count
        const transactionCountResult = await neonQuery<{ count: string | number }>(
            `SELECT COUNT(*) as count FROM transactions WHERE user_id = $1`,
            [userId]
        );
        const transactionCount = toNumber(transactionCountResult[0]?.count);

        // === SAVINGS: Rate vs 20% Target ===

        const financialStatsResult = await neonQuery<{
            total_income: number | string;
            total_expenses: number | string;
        }>(`
            SELECT 
                COALESCE(SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END), 0) as total_income,
                COALESCE(SUM(CASE WHEN amount < 0 THEN ABS(amount) ELSE 0 END), 0) as total_expenses
            FROM transactions 
            WHERE user_id = $1
        `, [userId]);

        const totalIncome = toNumber(financialStatsResult[0]?.total_income);
        const totalExpenses = toNumber(financialStatsResult[0]?.total_expenses);
        const actualSavings = totalIncome - totalExpenses;
        const savingsRate = totalIncome > 0 ? Math.round((actualSavings / totalIncome) * 100) : 0;

        // Savings score: How well do they hit 20% target?
        // 20%+ = 100, 15-20% = 80-100, 10-15% = 60-80, 5-10% = 40-60, 0-5% = 20-40, negative = 0-20
        let savingsScore = 0;
        if (savingsRate >= 20) {
            savingsScore = 100;
        } else if (savingsRate >= 15) {
            savingsScore = 80 + ((savingsRate - 15) * 4);
        } else if (savingsRate >= 10) {
            savingsScore = 60 + ((savingsRate - 10) * 4);
        } else if (savingsRate >= 5) {
            savingsScore = 40 + ((savingsRate - 5) * 4);
        } else if (savingsRate >= 0) {
            savingsScore = 20 + (savingsRate * 4);
        } else {
            // Negative savings rate
            savingsScore = Math.max(0, 20 + savingsRate);
        }
        savingsScore = Math.round(Math.max(0, Math.min(100, savingsScore)));

        // Monthly average
        const monthCountResult = await neonQuery<{ count: string | number }>(
            `SELECT COUNT(DISTINCT DATE_TRUNC('month', tx_date)) as count FROM transactions WHERE user_id = $1`,
            [userId]
        );
        const monthCount = Math.max(1, toNumber(monthCountResult[0]?.count));
        const monthlyAvgSavings = Math.round(actualSavings / monthCount);

        // === PHASE 3: TREND CALCULATION ===
        // Compare current month savings rate to previous month
        const trendDataResult = await neonQuery<{
            month_key: string;
            income: number | string;
            expenses: number | string;
        }>(`
            SELECT 
                TO_CHAR(tx_date, 'YYYY-MM') as month_key,
                COALESCE(SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END), 0) as income,
                COALESCE(SUM(CASE WHEN amount < 0 THEN ABS(amount) ELSE 0 END), 0) as expenses
            FROM transactions 
            WHERE user_id = $1 
                AND tx_date >= DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '2 months'
            GROUP BY TO_CHAR(tx_date, 'YYYY-MM')
            ORDER BY month_key DESC
            LIMIT 2
        `, [userId]);

        // Calculate savings rates for current and previous month
        let currentMonthRate = 0;
        let previousMonthRate = 0;
        let trendDirection: "improving" | "stable" | "declining" = "stable";
        let trendChange = 0;

        if (trendDataResult.length > 0) {
            const currentMonth = trendDataResult[0];
            const currentIncome = toNumber(currentMonth?.income);
            const currentExpenses = toNumber(currentMonth?.expenses);
            currentMonthRate = currentIncome > 0
                ? Math.round(((currentIncome - currentExpenses) / currentIncome) * 100)
                : 0;

            if (trendDataResult.length > 1) {
                const prevMonth = trendDataResult[1];
                const prevIncome = toNumber(prevMonth?.income);
                const prevExpenses = toNumber(prevMonth?.expenses);
                previousMonthRate = prevIncome > 0
                    ? Math.round(((prevIncome - prevExpenses) / prevIncome) * 100)
                    : 0;

                trendChange = currentMonthRate - previousMonthRate;

                // Determine trend direction
                if (trendChange >= 3) {
                    trendDirection = "improving";
                } else if (trendChange <= -3) {
                    trendDirection = "declining";
                } else {
                    trendDirection = "stable";
                }
            }
        }

        // === PHASE 4: HISTORICAL SCORES FOR SPARKLINE ===
        // Get last 6 months of data for sparkline
        const historicalDataResult = await neonQuery<{
            month_key: string;
            income: number | string;
            expenses: number | string;
        }>(`
            SELECT 
                TO_CHAR(tx_date, 'YYYY-MM') as month_key,
                COALESCE(SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END), 0) as income,
                COALESCE(SUM(CASE WHEN amount < 0 THEN ABS(amount) ELSE 0 END), 0) as expenses
            FROM transactions 
            WHERE user_id = $1 
                AND tx_date >= DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '6 months'
            GROUP BY TO_CHAR(tx_date, 'YYYY-MM')
            ORDER BY month_key ASC
        `, [userId]);

        const scoreHistory = historicalDataResult.map(row => {
            const income = toNumber(row.income);
            const expenses = toNumber(row.expenses);
            const rate = income > 0 ? Math.round(((income - expenses) / income) * 100) : 0;

            // Calculate score for this month (same logic as savingsScore)
            let monthScore = 0;
            if (rate >= 20) monthScore = 100;
            else if (rate >= 15) monthScore = 80 + ((rate - 15) * 4);
            else if (rate >= 10) monthScore = 60 + ((rate - 10) * 4);
            else if (rate >= 5) monthScore = 40 + ((rate - 5) * 4);
            else if (rate >= 0) monthScore = 20 + (rate * 4);
            else monthScore = Math.max(0, 20 + rate);

            return {
                month: row.month_key,
                score: Math.round(Math.max(0, Math.min(100, monthScore))),
                savingsRate: rate
            };
        });

        // === TRENDS: Category Spending vs Benchmarks ===

        const categoryAnalysis: Array<{
            category: string;
            userPercent: number;
            avgPercent: number;
            status: "below" | "average" | "above";
            difference: number;
        }> = [];

        categorySpendingResult.forEach(row => {
            const categoryName = row.category_name.toLowerCase();
            const userSpent = toNumber(row.total_spent);
            const userPercent = totalSpending > 0 ? Math.round((userSpent / totalSpending) * 100) : 0;

            // Find matching benchmark
            const benchmarkKey = Object.keys(CATEGORY_BENCHMARKS).find(k =>
                categoryName.includes(k) || k.includes(categoryName)
            );

            if (benchmarkKey) {
                const benchmark = CATEGORY_BENCHMARKS[benchmarkKey];
                const difference = userPercent - benchmark.avgPercent;
                let status: "below" | "average" | "above" = "average";

                if (difference > 3) status = "above";
                else if (difference < -3) status = "below";

                categoryAnalysis.push({
                    category: row.category_name,
                    userPercent,
                    avgPercent: benchmark.avgPercent,
                    status,
                    difference
                });
            }
        });

        // Count categories with good spending
        const categoryCountResult = await neonQuery<{ count: string | number }>(
            `SELECT COUNT(DISTINCT category_id) as count FROM transactions WHERE user_id = $1 AND category_id IS NOT NULL`,
            [userId]
        );
        const categoryCount = toNumber(categoryCountResult[0]?.count);

        // Trends score: Based on how many categories are at or below average
        const belowAvgCount = categoryAnalysis.filter(c => c.status === "below" || c.status === "average").length;
        const aboveAvgCount = categoryAnalysis.filter(c => c.status === "above").length;

        let trendsScore = 50; // Base score
        if (categoryAnalysis.length > 0) {
            const goodRatio = belowAvgCount / categoryAnalysis.length;
            trendsScore = Math.round(40 + (goodRatio * 60));
        }
        // Bonus for having data coverage
        trendsScore += Math.min(10, monthCount);
        trendsScore = Math.max(0, Math.min(100, trendsScore));

        // === FRIDGE: Nutritional Balance Analysis ===

        const fridgeCategoryResult = await neonQuery<{
            category_name: string;
            total_spent: number | string;
            item_count: number | string;
        }>(`
            SELECT 
                COALESCE(rc.name, 'Other') as category_name,
                COALESCE(SUM(rt.total_price), 0) as total_spent,
                COUNT(rt.id) as item_count
            FROM receipt_transactions rt
            INNER JOIN receipts r ON rt.receipt_id = r.id
            LEFT JOIN receipt_categories rc ON rt.category_id = rc.id
            WHERE r.user_id = $1
            GROUP BY rc.name
        `, [userId]);

        let healthyTotal = 0;
        let unhealthyTotal = 0;
        let neutralTotal = 0;
        let healthyItems = 0;
        let unhealthyItems = 0;
        let neutralItems = 0;

        fridgeCategoryResult.forEach(row => {
            const spent = toNumber(row.total_spent);
            const items = toNumber(row.item_count);
            const classification = classifyFoodCategory(row.category_name);

            switch (classification) {
                case "healthy":
                    healthyTotal += spent;
                    healthyItems += items;
                    break;
                case "unhealthy":
                    unhealthyTotal += spent;
                    unhealthyItems += items;
                    break;
                default:
                    neutralTotal += spent;
                    neutralItems += items;
            }
        });

        const totalFridgeSpending = healthyTotal + unhealthyTotal + neutralTotal;
        const healthyPercent = totalFridgeSpending > 0 ? Math.round((healthyTotal / totalFridgeSpending) * 100) : 0;
        const unhealthyPercent = totalFridgeSpending > 0 ? Math.round((unhealthyTotal / totalFridgeSpending) * 100) : 0;

        // Fridge score: Higher healthy %, lower unhealthy % = better
        // Ideal: 60%+ healthy, <15% unhealthy
        let fridgeScore = 50; // Base

        // Reward healthy eating
        if (healthyPercent >= 60) fridgeScore += 30;
        else if (healthyPercent >= 40) fridgeScore += 20;
        else if (healthyPercent >= 20) fridgeScore += 10;

        // Penalize unhealthy eating
        if (unhealthyPercent > 30) fridgeScore -= 30;
        else if (unhealthyPercent > 20) fridgeScore -= 20;
        else if (unhealthyPercent > 10) fridgeScore -= 10;
        else fridgeScore += 20; // Bonus for low unhealthy

        fridgeScore = Math.max(0, Math.min(100, fridgeScore));

        const receiptTransactionCount = fridgeCategoryResult.reduce((sum, r) => sum + toNumber(r.item_count), 0);

        // === MINIMUM TRANSACTION REQUIREMENTS ===
        // User must have at least 100 transactions for a valid score
        const MIN_TRANSACTIONS = 100;
        // User must have at least 200 grocery/fridge transactions for fridge score
        const MIN_FRIDGE_TRANSACTIONS = 200;

        // Check if minimum requirements are met
        const hasEnoughTransactions = transactionCount >= MIN_TRANSACTIONS;
        const hasEnoughFridgeTransactions = receiptTransactionCount >= MIN_FRIDGE_TRANSACTIONS;

        // Set scores to 0 if requirements not met
        if (!hasEnoughTransactions) {
            analyticsScore = 0;
            savingsScore = 0;
            trendsScore = 0;
        }
        if (!hasEnoughFridgeTransactions) {
            fridgeScore = 0;
        }

        // === USER COMPARISON: Calculate percentile rankings ===

        // Get all users' scores for comparison
        const allUsersStatsResult = await neonQuery<{
            user_id: string;
            total_income: number | string;
            total_expenses: number | string;
        }>(`
            SELECT 
                user_id,
                COALESCE(SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END), 0) as total_income,
                COALESCE(SUM(CASE WHEN amount < 0 THEN ABS(amount) ELSE 0 END), 0) as total_expenses
            FROM transactions
            GROUP BY user_id
            HAVING COUNT(*) > 10
        `, []);

        const allUserScores = allUsersStatsResult.map(row => {
            const income = toNumber(row.total_income);
            const expenses = toNumber(row.total_expenses);
            const rate = income > 0 ? ((income - expenses) / income) * 100 : 0;
            return { userId: row.user_id, savingsRate: rate };
        });

        const userCount = allUserScores.length;

        // Calculate percentiles
        const sortedByRate = [...allUserScores].sort((a, b) => b.savingsRate - a.savingsRate);
        const userRankSavings = sortedByRate.findIndex(u => u.userId === userId) + 1;
        const avgSavingsRate = allUserScores.length > 0
            ? Math.round(allUserScores.reduce((sum, u) => sum + u.savingsRate, 0) / allUserScores.length)
            : 0;
        const savingsPercentile = userCount > 0 ? Math.round(((userCount - userRankSavings + 1) / userCount) * 100) : 0;

        return NextResponse.json({
            analytics: {
                transactionCount,
                score: analyticsScore,
                needsPercent,
                wantsPercent,
                savingsPercent: 100 - needsPercent - wantsPercent,
                hasEnoughTransactions,
                minRequired: MIN_TRANSACTIONS,
                breakdown: {
                    needs: Math.round(needsTotal),
                    wants: Math.round(wantsTotal),
                    savings: Math.round(savingsTotal),
                    other: Math.round(otherTotal)
                }
            },
            fridge: {
                transactionCount: receiptTransactionCount,
                score: fridgeScore,
                healthyPercent,
                unhealthyPercent,
                hasEnoughTransactions: hasEnoughFridgeTransactions,
                minRequired: MIN_FRIDGE_TRANSACTIONS,
                breakdown: {
                    healthy: Math.round(healthyTotal),
                    unhealthy: Math.round(unhealthyTotal),
                    neutral: Math.round(neutralTotal)
                },
                itemCounts: {
                    healthy: healthyItems,
                    unhealthy: unhealthyItems,
                    neutral: neutralItems
                }
            },
            savings: {
                transactionCount,
                totalIncome: Math.round(totalIncome),
                totalExpenses: Math.round(totalExpenses),
                actualSavings: Math.round(actualSavings),
                savingsRate,
                score: savingsScore,
                monthlyAvgSavings,
                targetSavings: Math.round(totalIncome * 0.2),
                gap: Math.round((totalIncome * 0.2) - actualSavings),
                // Phase 3: Trend data
                trend: {
                    direction: trendDirection,
                    change: trendChange,
                    currentMonthRate,
                    previousMonthRate
                },
                // Phase 4: Score history for sparkline
                scoreHistory
            },
            trends: {
                transactionCount,
                categoryCount,
                monthCount,
                score: trendsScore,
                categoryAnalysis: categoryAnalysis.slice(0, 5) // Top 5 for display
            },
            comparison: {
                userCount,
                analytics: {
                    userRank: userRankSavings, // Simplified - using same rank for now
                    avgScore: 65, // Average expected score
                    percentile: savingsPercentile
                },
                fridge: {
                    userRank: userRankSavings,
                    avgScore: 55,
                    percentile: savingsPercentile
                },
                savings: {
                    userRank: userRankSavings,
                    avgScore: avgSavingsRate,
                    percentile: savingsPercentile
                },
                trends: {
                    userRank: userRankSavings,
                    avgScore: 60,
                    percentile: savingsPercentile
                }
            }
        }, {
            headers: {
                'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
            },
        });
    } catch (error: any) {
        console.error("[Dashboard Stats API] Error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to fetch dashboard stats" },
            { status: 500 }
        );
    }
};
