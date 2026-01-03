// lib/ai/chartInsights.ts

import { getSiteUrl, getSiteName } from '@/lib/env';

export interface ChartInsightRequest {
    chartId: string;
    chartTitle: string;
    chartDescription: string;
    chartData: Record<string, any>;
    userContext?: {
        totalIncome?: number;
        totalExpenses?: number;
        topCategories?: { name: string; amount: number }[];
        monthlyAverage?: number;
    };
}

export interface ChartInsightResponse {
    insight: string;
    sentiment: "positive" | "neutral" | "negative" | "warning";
    tips?: string[];
}

/**
 * Generate AI-powered insights for a specific chart based on its data
 */
export async function generateChartInsight(request: ChartInsightRequest): Promise<ChartInsightResponse> {
    const { chartId, chartTitle, chartDescription, chartData, userContext } = request;

    const systemPrompt = `
You are a friendly and knowledgeable personal finance advisor. Your job is to analyze financial chart data and provide helpful, actionable insights.

GUIDELINES:
1. Be concise - keep insights to 2-3 sentences maximum
2. Be specific - reference actual numbers from the data
3. Be helpful - provide actionable advice when spending is high
4. Be encouraging - congratulate on good financial habits
5. Use a warm, supportive tone (like a helpful friend)
6. Focus on the specific chart type and what it reveals

RESPONSE FORMAT - Return ONLY valid JSON:
{
  "insight": "Your main insight about the data (2-3 sentences)",
  "sentiment": "positive|neutral|negative|warning",
  "tips": ["Optional tip 1", "Optional tip 2"]
}

SENTIMENT RULES:
- "positive": User is doing well (saving, under budget, good trends)
- "neutral": Normal patterns, no significant concerns
- "negative": Overspending or concerning trends
- "warning": Significant financial concern that needs attention
`.trim();

    const userPrompt = `
CHART: ${chartTitle}
DESCRIPTION: ${chartDescription}
CHART ID: ${chartId}

DATA:
${JSON.stringify(chartData, null, 2)}

${userContext ? `
USER CONTEXT:
- Total Income: ${userContext.totalIncome ?? "Unknown"}
- Total Expenses: ${userContext.totalExpenses ?? "Unknown"}
- Monthly Average Spending: ${userContext.monthlyAverage ?? "Unknown"}
- Top Categories: ${userContext.topCategories?.map(c => `${c.name}: ${c.amount}`).join(", ") ?? "Unknown"}
` : ""}

Analyze this chart data and provide a personalized insight for the user.
`.trim();

    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

    if (!GEMINI_API_KEY) {
        return {
            insight: "Unable to generate insights. Please configure your API key.",
            sentiment: "neutral"
        };
    }

    try {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                contents: [
                    { role: "user", parts: [{ text: systemPrompt + "\n\n" + userPrompt }] }
                ],
                generationConfig: {
                    maxOutputTokens: 500,
                    temperature: 0.7,
                    responseMimeType: "application/json"
                }
            })
        });

        if (!res.ok) {
            const errorText = await res.text();
            console.error("[ChartInsights] API error:", res.status, errorText.substring(0, 200));
            return {
                insight: "Unable to generate insight at this time. Please try again later.",
                sentiment: "neutral"
            };
        }

        const json = await res.json();
        const content = json.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!content) {
            return {
                insight: "No insight could be generated for this chart.",
                sentiment: "neutral"
            };
        }

        const parsed = JSON.parse(content);

        return {
            insight: parsed.insight || "Analysis complete.",
            sentiment: parsed.sentiment || "neutral",
            tips: parsed.tips
        };
    } catch (error) {
        console.error("[ChartInsights] Error:", error);
        return {
            insight: "An error occurred while generating insights.",
            sentiment: "neutral"
        };
    }
}

/**
 * Get chart-specific context hints for better AI responses
 */
export function getChartContextHints(chartId: string): string {
    const hints: Record<string, string> = {
        incomeExpensesTracking1: "Focus on income vs expense balance and cash flow trends",
        incomeExpensesTracking2: "Analyze the 3-month trend of income and expenses",
        spendingCategoryRankings: "Identify which categories are consuming most of the budget",
        netWorthAllocation: "Evaluate asset distribution and diversification",
        needsWantsBreakdown: "Assess the balance between essential and discretionary spending",
        moneyFlow: "Trace how money flows from income through expenses to savings",
        expenseBreakdown: "Analyze distribution of monthly expenses across categories",
        categoryBubbleMap: "Visualize spending proportions across categories",
        householdSpendMix: "Track essential household expenses month over month",
        financialHealthScore: "Evaluate overall financial wellness",
        spendingActivityRings: "Monitor category spending against budgets/limits",
        spendingStreamgraph: "Identify spending patterns and anomalies over time",
        dailyTransactionActivity: "Spot daily spending habits and peak spending days",
        dayOfWeekSpending: "Understand which days see the highest spending",
        allMonthsCategorySpending: "Compare category spending across all months",
        singleMonthCategorySpending: "Deep dive into one month's category breakdown",
        dayOfWeekCategory: "Analyze category spending patterns by day of week",
        budgetDistribution: "Evaluate budget allocation efficiency",
        categoryTrend: "Track specific category trends over time"
    };

    return hints[chartId] || "Provide general financial insights";
}

