// app/api/ai/chart-insight/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth";
import { generateChartInsight, getChartContextHints, ChartInsightRequest } from "@/lib/ai/chartInsights";
import { neonQuery } from "@/lib/neonClient";
import { checkRateLimit, createRateLimitResponse, createRateLimitHeaders } from "@/lib/security/rate-limiter";

export const POST = async (req: NextRequest) => {
    try {
        // Authenticate user
        const userId = await getCurrentUserId();

        // Rate limit check - AI endpoints are expensive
        const rateLimitResult = checkRateLimit(userId, 'ai');
        if (rateLimitResult.limited) {
            return createRateLimitResponse(rateLimitResult.resetIn);
        }

        const body = await req.json();
        const { chartId, chartTitle, chartDescription, chartData } = body;

        if (!chartId || !chartTitle) {
            return NextResponse.json(
                { error: "Missing required fields: chartId, chartTitle" },
                { status: 400 }
            );
        }

        // Fetch user context for better insights
        let userContext = undefined;
        try {
            // Get total income and expenses
            const statsResult = await neonQuery<{
                total_income: string;
                total_expenses: string;
            }>(`
                SELECT 
                    COALESCE(SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END), 0) as total_income,
                    COALESCE(SUM(CASE WHEN amount < 0 THEN ABS(amount) ELSE 0 END), 0) as total_expenses
                FROM transactions 
                WHERE user_id = $1
            `, [userId]);

            // Get top spending categories
            const categoriesResult = await neonQuery<{
                category_name: string;
                total_spent: string;
            }>(`
                SELECT 
                    c.name as category_name,
                    COALESCE(SUM(ABS(t.amount)), 0) as total_spent
                FROM transactions t
                LEFT JOIN categories c ON t.category_id = c.id
                WHERE t.user_id = $1 AND t.amount < 0
                GROUP BY c.name
                ORDER BY total_spent DESC
                LIMIT 5
            `, [userId]);

            // Get monthly average
            const monthlyResult = await neonQuery<{
                monthly_avg: string;
            }>(`
                SELECT COALESCE(AVG(monthly_total), 0) as monthly_avg
                FROM (
                    SELECT 
                        DATE_TRUNC('month', tx_date) as month,
                        SUM(ABS(amount)) as monthly_total
                    FROM transactions 
                    WHERE user_id = $1 AND amount < 0
                    GROUP BY DATE_TRUNC('month', tx_date)
                ) monthly_totals
            `, [userId]);

            userContext = {
                totalIncome: parseFloat(statsResult[0]?.total_income || "0"),
                totalExpenses: parseFloat(statsResult[0]?.total_expenses || "0"),
                topCategories: categoriesResult.map(c => ({
                    name: c.category_name || "Uncategorized",
                    amount: parseFloat(c.total_spent)
                })),
                monthlyAverage: parseFloat(monthlyResult[0]?.monthly_avg || "0")
            };
        } catch (contextErr) {
            console.warn("[ChartInsight] Could not fetch user context:", contextErr);
        }

        // Add context hints based on chart type
        const contextHint = getChartContextHints(chartId);

        const request: ChartInsightRequest = {
            chartId,
            chartTitle,
            chartDescription: chartDescription || contextHint,
            chartData: chartData || {},
            userContext
        };

        const insight = await generateChartInsight(request);

        return NextResponse.json(insight);
    } catch (error: any) {
        console.error("[ChartInsight API] Error:", error);

        if (error.message?.includes("Unauthorized")) {
            return NextResponse.json(
                { error: "Please sign in to access AI insights" },
                { status: 401 }
            );
        }

        return NextResponse.json(
            { error: "Failed to generate insight", details: error.message },
            { status: 500 }
        );
    }
};

