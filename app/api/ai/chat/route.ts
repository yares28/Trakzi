// app/api/ai/chat/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth";
import { neonQuery } from "@/lib/neonClient";
import { getSiteUrl, getSiteName } from "@/lib/env";
import { checkAiChatLimit } from "@/lib/feature-access";
import { checkRateLimit, createRateLimitResponse } from "@/lib/security/rate-limiter";
import { sanitizeForAI } from "@/lib/security/input-sanitizer";

// Currency configuration - mirrors frontend currency-provider.tsx
const CURRENCY_CONFIG: Record<string, { symbol: string; position: "before" | "after"; locale: string }> = {
    USD: { symbol: "$", position: "before", locale: "en-US" },
    EUR: { symbol: "€", position: "after", locale: "de-DE" },
    GBP: { symbol: "£", position: "before", locale: "en-GB" },
    JPY: { symbol: "¥", position: "before", locale: "ja-JP" },
    CAD: { symbol: "C$", position: "before", locale: "en-CA" },
    AUD: { symbol: "A$", position: "before", locale: "en-AU" },
    CHF: { symbol: "Fr", position: "after", locale: "de-CH" },
    CNY: { symbol: "¥", position: "before", locale: "zh-CN" },
    INR: { symbol: "₹", position: "before", locale: "en-IN" },
    BRL: { symbol: "R$", position: "before", locale: "pt-BR" },
    MXN: { symbol: "$", position: "before", locale: "es-MX" },
    KRW: { symbol: "₩", position: "before", locale: "ko-KR" },
};

// Format currency with commas in "20,000.00symbol" format
function formatCurrency(amount: number, currencyCode: string = "USD"): string {
    const config = CURRENCY_CONFIG[currencyCode] || CURRENCY_CONFIG.USD;
    const absAmount = Math.abs(amount);

    // Format with thousands separators and 2 decimal places
    const formatted = absAmount.toLocaleString(config.locale, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });

    const sign = amount < 0 ? "-" : "";

    // Position symbol based on currency convention
    if (config.position === "after") {
        return `${sign}${formatted}${config.symbol}`;
    } else {
        return `${sign}${config.symbol}${formatted}`;
    }
}

interface ChatMessage {
    role: "user" | "assistant" | "system";
    content: string;
    reasoning_details?: unknown;  // For preserving thinking context
}

interface TransactionSummary {
    totalIncome: number;
    totalExpenses: number;
    netSavings: number;
    transactionCount: number;
    categoryBreakdown: { name: string; total: number }[];
    monthlyTrends: { month: string; income: number; expenses: number }[];
    recentTransactions: { date: string; description: string; amount: number; category: string }[];
}

async function getUserFinancialContext(userId: string): Promise<TransactionSummary | null> {
    try {
        // Get totals
        const totalsResult = await neonQuery<{
            total_income: string;
            total_expenses: string;
            transaction_count: string;
        }>(`
            SELECT 
                COALESCE(SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END), 0) as total_income,
                COALESCE(SUM(CASE WHEN amount < 0 THEN ABS(amount) ELSE 0 END), 0) as total_expenses,
                COUNT(*) as transaction_count
            FROM transactions 
            WHERE user_id = $1
        `, [userId]);

        // Get category breakdown
        const categoryResult = await neonQuery<{
            category_name: string;
            total: string;
        }>(`
            SELECT 
                COALESCE(c.name, 'Uncategorized') as category_name,
                COALESCE(SUM(ABS(t.amount)), 0) as total
            FROM transactions t
            LEFT JOIN categories c ON t.category_id = c.id
            WHERE t.user_id = $1 AND t.amount < 0
            GROUP BY c.name
            ORDER BY total DESC
            LIMIT 10
        `, [userId]);

        // Get monthly trends (last 6 months)
        const monthlyResult = await neonQuery<{
            month: string;
            income: string;
            expenses: string;
        }>(`
            SELECT 
                TO_CHAR(tx_date, 'YYYY-MM') as month,
                COALESCE(SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END), 0) as income,
                COALESCE(SUM(CASE WHEN amount < 0 THEN ABS(amount) ELSE 0 END), 0) as expenses
            FROM transactions 
            WHERE user_id = $1 AND tx_date >= NOW() - INTERVAL '6 months'
            GROUP BY TO_CHAR(tx_date, 'YYYY-MM')
            ORDER BY month DESC
            LIMIT 6
        `, [userId]);

        // Get recent transactions
        const recentResult = await neonQuery<{
            tx_date: string;
            description: string;
            amount: string;
            category_name: string;
        }>(`
            SELECT 
                TO_CHAR(t.tx_date, 'YYYY-MM-DD') as tx_date,
                t.description,
                t.amount::text,
                COALESCE(c.name, 'Uncategorized') as category_name
            FROM transactions t
            LEFT JOIN categories c ON t.category_id = c.id
            WHERE t.user_id = $1
            ORDER BY t.tx_date DESC
            LIMIT 20
        `, [userId]);

        const totalIncome = parseFloat(totalsResult[0]?.total_income || "0");
        const totalExpenses = parseFloat(totalsResult[0]?.total_expenses || "0");

        return {
            totalIncome,
            totalExpenses,
            netSavings: totalIncome - totalExpenses,
            transactionCount: parseInt(totalsResult[0]?.transaction_count || "0"),
            categoryBreakdown: categoryResult.map(c => ({
                name: c.category_name,
                total: parseFloat(c.total)
            })),
            monthlyTrends: monthlyResult.map(m => ({
                month: m.month,
                income: parseFloat(m.income),
                expenses: parseFloat(m.expenses)
            })),
            recentTransactions: recentResult.map(t => ({
                date: t.tx_date,
                description: t.description,
                amount: parseFloat(t.amount),
                category: t.category_name
            }))
        };
    } catch (error) {
        console.error("[Chat API] Failed to fetch user context:", error);
        return null;
    }
}

function buildSystemPrompt(context: TransactionSummary | null, currency: string = "USD"): string {
    const basePrompt = `
You are a friendly and knowledgeable personal finance assistant. You help users understand their spending habits, budget better, and make smart financial decisions.

CRITICAL RULES:
1. ONLY respond to questions related to personal finance, budgeting, spending, saving, or the user's financial data
2. If asked about anything unrelated to finance (e.g., cooking, sports, weather, politics, coding, general knowledge), politely decline and redirect to finance topics
3. Be supportive and non-judgmental about spending habits
4. Provide actionable, specific advice when possible
5. Use the user's actual data to personalize responses
6. Use skimmable, well-structured formatting (see below)
7. Keep responses easy to scan (avoid walls of text)
8. ALWAYS format monetary amounts with the user's currency (${currency}) - use format like "20,000.00${CURRENCY_CONFIG[currency]?.symbol || "$"}" with comma separators for thousands

OUTPUT STYLE (MANDATORY):
- Use Markdown.
- Prefer short sections with headings (use ###).
- Default structure (adapt if the user asks for something very small):
  ### At a glance
  - 2-4 bullets with the key answer + the most relevant numbers.
  ### Breakdown
  - Short bullets with brief reasoning (1-2 sentences each).
  ### Next steps
  1-6 numbered, specific actions the user can take.
  ### Quick question (optional)
  - Ask 1-2 clarifying questions if needed to be more precise.
- Use bullets and bold labels like **Income:**, **Biggest category:**, **Recommendation:**.
- Avoid Markdown tables; use bullets instead.
- If you make an assumption or estimate, label it clearly as an estimate.
- Format all monetary values with thousands separators (commas) like: 20,000.00

TOPICS YOU CAN HELP WITH:
- Analyzing spending patterns and trends
- Budget recommendations
- Savings strategies
- Understanding transaction categories
- Identifying areas to reduce spending
- Financial goal setting
- Explaining financial concepts
- Comparing spending across time periods

TOPICS TO DECLINE:
- Non-financial questions
- Medical, legal, or tax advice (suggest professional help)
- Investment-specific advice (suggest a financial advisor)
- Personal opinions on non-financial matters
`;

    if (!context || context.transactionCount === 0) {
        return basePrompt + `

USER DATA STATUS: No transaction data available yet. Encourage the user to import their bank statements to get personalized insights.
`;
    }

    const safeExpensesTotal = context.totalExpenses > 0 ? context.totalExpenses : 0;
    const topCategories = context.categoryBreakdown.slice(0, 5).map(c => {
        const pct = safeExpensesTotal > 0 ? (c.total / safeExpensesTotal) * 100 : 0;
        const pctText = safeExpensesTotal > 0 ? ` (~${pct.toFixed(0)}%)` : "";
        return `- ${c.name}: ${formatCurrency(c.total, currency)}${pctText}`;
    }).join('\n');

    return basePrompt + `

USER FINANCIAL DATA:
- Total Income: ${formatCurrency(context.totalIncome, currency)}
- Total Expenses: ${formatCurrency(context.totalExpenses, currency)}
- Net Savings: ${formatCurrency(context.netSavings, currency)}
- Total Transactions: ${context.transactionCount}

TOP SPENDING CATEGORIES (share of expenses):
${topCategories}

MONTHLY TRENDS (Last 6 months):
${context.monthlyTrends.map(m => `- ${m.month}: Income ${formatCurrency(m.income, currency)}, Expenses ${formatCurrency(m.expenses, currency)}`).join('\n')}

RECENT TRANSACTIONS (Last 20):
${context.recentTransactions.slice(0, 10).map(t => `- ${t.date}: ${t.description.substring(0, 40)} | ${formatCurrency(t.amount, currency)} | ${t.category}`).join('\n')}

Use this data to provide personalized, specific insights when the user asks about their finances.
`;
}

function isFinanceRelated(message: string): boolean {
    const financeKeywords = [
        'spend', 'budget', 'money', 'expense', 'income', 'save', 'saving',
        'transaction', 'category', 'financial', 'finance', 'cost', 'price',
        'pay', 'payment', 'bill', 'subscription', 'rent', 'mortgage',
        'grocery', 'groceries', 'food', 'dining', 'restaurant', 'shopping',
        'transport', 'utility', 'insurance', 'tax', 'investment', 'invest',
        'bank', 'account', 'credit', 'debit', 'loan', 'debt', 'interest',
        'balance', 'net worth', 'asset', 'liability', 'cash flow', 'profit',
        'loss', 'revenue', 'trend', 'pattern', 'analyze', 'analysis',
        'compare', 'month', 'year', 'week', 'average', 'total', 'sum',
        'most', 'least', 'highest', 'lowest', 'top', 'bottom', 'reduce',
        'cut', 'increase', 'decrease', 'goal', 'target', 'budget'
    ];

    const lowerMessage = message.toLowerCase();
    return financeKeywords.some(keyword => lowerMessage.includes(keyword));
}

export const POST = async (req: NextRequest) => {
    try {
        // Authenticate user
        const userId = await getCurrentUserId();

        // Rate limit check - AI endpoints are expensive
        const rateLimitResult = checkRateLimit(userId, 'ai');
        if (rateLimitResult.limited) {
            return createRateLimitResponse(rateLimitResult.resetIn);
        }

        // Check if user has AI chat access
        const chatAccess = await checkAiChatLimit(userId);
        if (!chatAccess.allowed) {
            return NextResponse.json(
                {
                    error: chatAccess.reason,
                    upgradeRequired: true,
                    plan: chatAccess.plan
                },
                { status: 403 }
            );
        }

        const body = await req.json();
        const { messages, currency } = body as { messages: ChatMessage[]; currency?: string };

        // Use the provided currency or default to USD
        const userCurrency = currency && CURRENCY_CONFIG[currency] ? currency : "USD";

        if (!messages || !Array.isArray(messages) || messages.length === 0) {
            return NextResponse.json(
                { error: "Messages array is required" },
                { status: 400 }
            );
        }

        // Sanitize user messages to prevent prompt injection
        const sanitizedMessages = messages.map(m => ({
            ...m,
            content: m.role === 'user' ? sanitizeForAI(m.content, 2000) : m.content
        }));

        const lastUserMessage = sanitizedMessages.filter(m => m.role === "user").pop();

        // Basic topic filter - check if the latest message seems finance-related
        // This is a soft check; the AI will also enforce topic boundaries
        const seemsFinanceRelated = lastUserMessage
            ? isFinanceRelated(lastUserMessage.content)
            : true;

        // Fetch user's financial context
        const userContext = await getUserFinancialContext(userId);
        const systemPrompt = buildSystemPrompt(userContext, userCurrency);

        // Build messages array for the API - using sanitized messages
        const apiMessages = [
            { role: "system", content: systemPrompt },
            ...sanitizedMessages.map(m => ({
                role: m.role,
                content: m.content
            }))
        ];

        // If clearly off-topic, add a gentle redirect in the system message
        if (!seemsFinanceRelated && lastUserMessage) {
            apiMessages.push({
                role: "system",
                content: "The user's question doesn't seem to be about finance. Politely redirect them to financial topics and offer to help with their spending, budget, or financial data."
            });
        }

        const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
        const SITE_URL = getSiteUrl();
        const SITE_NAME = getSiteName();

        if (!OPENROUTER_API_KEY) {
            return NextResponse.json(
                { error: "AI service not configured" },
                { status: 500 }
            );
        }

        // Make streaming request to OpenRouter with Olmo 3.1 32B Think
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
                "HTTP-Referer": SITE_URL,
                "X-Title": SITE_NAME,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: "allenai/olmo-3.1-32b-think:free",
                messages: apiMessages,
                stream: true,
                max_tokens: 2000,
                temperature: 0.7,
                reasoning: { enabled: true }  // Enable thinking/reasoning
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error("[Chat API] OpenRouter error:", response.status, errorText.substring(0, 200));
            return NextResponse.json(
                { error: "Failed to generate response" },
                { status: 500 }
            );
        }

        // Stream the response back to the client
        const encoder = new TextEncoder();
        const stream = new ReadableStream({
            async start(controller) {
                const reader = response.body?.getReader();
                if (!reader) {
                    controller.close();
                    return;
                }

                const decoder = new TextDecoder();
                let buffer = "";

                try {
                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) break;

                        buffer += decoder.decode(value, { stream: true });
                        const lines = buffer.split("\n");
                        buffer = lines.pop() || "";

                        for (const line of lines) {
                            if (line.startsWith("data: ")) {
                                const data = line.slice(6);
                                if (data === "[DONE]") {
                                    controller.enqueue(encoder.encode("data: [DONE]\n\n"));
                                    continue;
                                }

                                try {
                                    const parsed = JSON.parse(data);
                                    const content = parsed.choices?.[0]?.delta?.content;
                                    if (content) {
                                        controller.enqueue(
                                            encoder.encode(`data: ${JSON.stringify({ content })}\n\n`)
                                        );
                                    }
                                } catch {
                                    // Skip malformed JSON
                                }
                            }
                        }
                    }
                } catch (error) {
                    console.error("[Chat API] Stream error:", error);
                } finally {
                    controller.close();
                }
            }
        });

        return new Response(stream, {
            headers: {
                "Content-Type": "text/event-stream",
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
            },
        });
    } catch (error: any) {
        console.error("[Chat API] Error:", error);

        if (error.message?.includes("Unauthorized")) {
            return NextResponse.json(
                { error: "Please sign in to use the chat" },
                { status: 401 }
            );
        }

        return NextResponse.json(
            { error: "An error occurred", details: error.message },
            { status: 500 }
        );
    }
};

// Also support GET for fetching user context (for initial load optimization)
export const GET = async () => {
    try {
        const userId = await getCurrentUserId();
        const context = await getUserFinancialContext(userId);

        return NextResponse.json({
            hasData: context !== null && context.transactionCount > 0,
            summary: context ? {
                totalIncome: context.totalIncome,
                totalExpenses: context.totalExpenses,
                netSavings: context.netSavings,
                transactionCount: context.transactionCount,
                topCategories: context.categoryBreakdown.slice(0, 5)
            } : null
        });
    } catch (error: any) {
        if (error.message?.includes("Unauthorized")) {
            return NextResponse.json(
                { error: "Please sign in to access chat" },
                { status: 401 }
            );
        }

        return NextResponse.json(
            { error: "Failed to load context" },
            { status: 500 }
        );
    }
};
