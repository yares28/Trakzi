// app/api/dashboard/weekly-summary/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSiteUrl, getSiteName } from "@/lib/env";

interface SummaryRequest {
    savingsRate: number;
    savingsScore: number;
    trendDirection: "improving" | "stable" | "declining";
    trendChange: number;
}

interface SummaryResponse {
    summary: string;
    highlights: string[];
    recommendations: string[];
    sentiment: "positive" | "neutral" | "negative";
}

export async function POST(request: NextRequest) {
    try {
        const body: SummaryRequest = await request.json();
        const { savingsRate, savingsScore, trendDirection, trendChange } = body;

        const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
        const SITE_URL = getSiteUrl();
        const SITE_NAME = getSiteName();

        if (!OPENROUTER_API_KEY) {
            console.warn("[Weekly Summary API] OpenRouter API key not configured");
            // Return a fallback summary
            return NextResponse.json(generateFallbackSummary(body));
        }

        const systemPrompt = `You are a friendly and encouraging financial advisor. Generate a brief weekly financial summary for a user based on their savings data. Be concise, actionable, and supportive. Always find something positive to highlight, even if the numbers aren't great.

Your response must be valid JSON with this exact structure:
{
    "summary": "A 1-2 sentence overview of their financial week",
    "highlights": ["1-2 positive observations"],
    "recommendations": ["1-2 actionable tips for improvement"],
    "sentiment": "positive" | "neutral" | "negative"
}`;

        const userPrompt = `Generate a weekly financial summary for this user:
- Current Savings Rate: ${savingsRate}%
- Financial Health Score: ${savingsScore}/100
- Trend vs Last Month: ${trendDirection} (${trendChange > 0 ? '+' : ''}${trendChange}%)

Remember to be encouraging and focus on progress, not perfection.`;

        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
                "HTTP-Referer": SITE_URL,
                "X-Title": SITE_NAME,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: "google/gemini-2.0-flash-001",
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: userPrompt }
                ],
                response_format: { type: "json_object" },
                max_tokens: 500,
                temperature: 0.7
            })
        });

        if (!response.ok) {
            const errorData = await response.text();
            console.error("[Weekly Summary API] OpenRouter error:", errorData);
            return NextResponse.json(generateFallbackSummary(body));
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content;

        if (!content) {
            console.error("[Weekly Summary API] No content in response");
            return NextResponse.json(generateFallbackSummary(body));
        }

        try {
            const parsedSummary: SummaryResponse = JSON.parse(content);
            return NextResponse.json(parsedSummary, {
                headers: {
                    'Cache-Control': 'private, s-maxage=3600, stale-while-revalidate=7200',
                },
            });
        } catch (parseError) {
            console.error("[Weekly Summary API] Failed to parse response:", content);
            return NextResponse.json(generateFallbackSummary(body));
        }

    } catch (error: any) {
        console.error("[Weekly Summary API] Error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to generate summary" },
            { status: 500 }
        );
    }
}

// Fallback summary when API is unavailable
function generateFallbackSummary(data: SummaryRequest): SummaryResponse {
    const { savingsRate, savingsScore, trendDirection, trendChange } = data;

    let sentiment: "positive" | "neutral" | "negative" = "neutral";
    let summary = "";
    const highlights: string[] = [];
    const recommendations: string[] = [];

    // Determine sentiment
    if (savingsScore >= 70 || (trendDirection === "improving" && trendChange >= 3)) {
        sentiment = "positive";
    } else if (savingsScore < 40 || (trendDirection === "declining" && trendChange <= -5)) {
        sentiment = "negative";
    }

    // Generate summary
    if (savingsRate >= 20) {
        summary = `Great job! You're saving ${savingsRate}% of your income, which exceeds the recommended 20% target.`;
        highlights.push("Meeting or exceeding savings goals");
    } else if (savingsRate >= 10) {
        summary = `You're on the right track with a ${savingsRate}% savings rate. Keep building momentum!`;
        highlights.push("Building consistent savings habits");
    } else if (savingsRate > 0) {
        summary = `Your ${savingsRate}% savings rate shows you're making an effort. Small steps lead to big changes!`;
        highlights.push("Every bit of savings counts");
    } else {
        summary = `It's been a challenging period for savings. Let's work on finding opportunities to put aside a little each month.`;
        highlights.push("Tracking your finances is the first step");
    }

    // Add trend insight
    if (trendDirection === "improving") {
        highlights.push(`Savings rate improved by ${trendChange}% from last month`);
    }

    // Add recommendations
    if (savingsRate < 20) {
        recommendations.push("Try automating a small weekly transfer to savings");
    }
    if (trendDirection === "declining") {
        recommendations.push("Review recent expenses to identify areas to cut back");
    }
    if (recommendations.length === 0) {
        recommendations.push("Consider setting a new stretch goal for next month");
    }

    return { summary, highlights, recommendations, sentiment };
}
