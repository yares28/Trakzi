// lib/ai/categoriseTransactions.ts
import { TxRow } from "../types/transactions";

// Default categories (single words)
const DEFAULT_CATEGORIES = [
    "Groceries", "Restaurants", "Shopping", "Transport", "Utilities",
    "Insurance", "Taxes", "Income", "Transfers", "Savings", "Other"
];

// Common merchant patterns for smart summarization
const MERCHANT_PATTERNS: { pattern: RegExp; summary: string; category?: string }[] = [
    // E-commerce
    { pattern: /amazon|amzn/i, summary: "Amazon", category: "Shopping" },
    { pattern: /zalando/i, summary: "Zalando", category: "Shopping" },
    { pattern: /aliexpress/i, summary: "AliExpress", category: "Shopping" },
    { pattern: /ebay/i, summary: "eBay", category: "Shopping" },
    { pattern: /shein/i, summary: "Shein", category: "Shopping" },
    
    // Streaming & Entertainment
    { pattern: /netflix/i, summary: "Netflix", category: "Utilities" },
    { pattern: /spotify/i, summary: "Spotify", category: "Utilities" },
    { pattern: /disney\+|disneyplus/i, summary: "Disney+", category: "Utilities" },
    { pattern: /hbo|max/i, summary: "HBO Max", category: "Utilities" },
    { pattern: /youtube|google\s*play/i, summary: "Google/YouTube", category: "Utilities" },
    { pattern: /apple/i, summary: "Apple", category: "Shopping" },
    
    // Supermarkets (Spain/Europe)
    { pattern: /mercadona/i, summary: "Mercadona", category: "Groceries" },
    { pattern: /carrefour/i, summary: "Carrefour", category: "Groceries" },
    { pattern: /lidl/i, summary: "Lidl", category: "Groceries" },
    { pattern: /aldi/i, summary: "Aldi", category: "Groceries" },
    { pattern: /eroski/i, summary: "Eroski", category: "Groceries" },
    { pattern: /dia\b/i, summary: "DIA", category: "Groceries" },
    { pattern: /alcampo/i, summary: "Alcampo", category: "Groceries" },
    { pattern: /hipercor/i, summary: "Hipercor", category: "Groceries" },
    { pattern: /el corte ingles|corte\s*ingles/i, summary: "El Corte Inglés", category: "Shopping" },
    
    // Transport
    { pattern: /uber(?!eats)/i, summary: "Uber", category: "Transport" },
    { pattern: /lyft/i, summary: "Lyft", category: "Transport" },
    { pattern: /cabify/i, summary: "Cabify", category: "Transport" },
    { pattern: /bolt(?!food)/i, summary: "Bolt", category: "Transport" },
    { pattern: /renfe/i, summary: "Renfe", category: "Transport" },
    { pattern: /metro|tmb|emt/i, summary: "Public Transport", category: "Transport" },
    { pattern: /repsol|cepsa|bp\b|shell|gasolinera/i, summary: "Gas Station", category: "Transport" },
    
    // Food Delivery
    { pattern: /ubereats|uber\s*eats/i, summary: "Uber Eats", category: "Restaurants" },
    { pattern: /glovo/i, summary: "Glovo", category: "Restaurants" },
    { pattern: /just\s*eat|justeat/i, summary: "Just Eat", category: "Restaurants" },
    { pattern: /deliveroo/i, summary: "Deliveroo", category: "Restaurants" },
    { pattern: /doordash/i, summary: "DoorDash", category: "Restaurants" },
    
    // Restaurants & Cafes
    { pattern: /starbucks/i, summary: "Starbucks", category: "Restaurants" },
    { pattern: /mcdonalds|mcdonald/i, summary: "McDonald's", category: "Restaurants" },
    { pattern: /burger\s*king/i, summary: "Burger King", category: "Restaurants" },
    { pattern: /telepizza/i, summary: "Telepizza", category: "Restaurants" },
    { pattern: /dominos/i, summary: "Domino's", category: "Restaurants" },
    
    // Insurance (Spain)
    { pattern: /mapfre/i, summary: "Mapfre", category: "Insurance" },
    { pattern: /axa\b/i, summary: "AXA", category: "Insurance" },
    { pattern: /allianz/i, summary: "Allianz", category: "Insurance" },
    { pattern: /sanitas/i, summary: "Sanitas", category: "Insurance" },
    { pattern: /asisa/i, summary: "Asisa", category: "Insurance" },
    { pattern: /dkv/i, summary: "DKV", category: "Insurance" },
    { pattern: /seguro|insurance|poliza/i, summary: "Insurance", category: "Insurance" },
    
    // Telecom & Utilities
    { pattern: /movistar|telefonica/i, summary: "Movistar", category: "Utilities" },
    { pattern: /vodafone/i, summary: "Vodafone", category: "Utilities" },
    { pattern: /orange/i, summary: "Orange", category: "Utilities" },
    { pattern: /yoigo/i, summary: "Yoigo", category: "Utilities" },
    { pattern: /digi\b/i, summary: "Digi", category: "Utilities" },
    { pattern: /masmovil/i, summary: "MásMóvil", category: "Utilities" },
    { pattern: /iberdrola/i, summary: "Iberdrola", category: "Utilities" },
    { pattern: /endesa/i, summary: "Endesa", category: "Utilities" },
    { pattern: /naturgy|gas\s*natural/i, summary: "Naturgy", category: "Utilities" },
    
    // Banks & Transfers
    { pattern: /bizum/i, summary: "Bizum Transfer", category: "Transfers" },
    { pattern: /paypal/i, summary: "PayPal", category: "Transfers" },
    { pattern: /transferencia/i, summary: "Bank Transfer", category: "Transfers" },
    { pattern: /ingreso|deposito/i, summary: "Deposit", category: "Income" },
    { pattern: /nomina|salario|sueldo/i, summary: "Salary", category: "Income" },
    
    // Taxes & Fees
    { pattern: /comision/i, summary: "Bank Fee", category: "Taxes" },
    { pattern: /hacienda|agencia\s*tributaria/i, summary: "Tax Agency", category: "Taxes" },
    { pattern: /impuesto|iva/i, summary: "Tax", category: "Taxes" },
    
    // Travel & Hotels
    { pattern: /booking\.com|booking/i, summary: "Booking.com", category: "Shopping" },
    { pattern: /airbnb/i, summary: "Airbnb", category: "Shopping" },
    { pattern: /hotel/i, summary: "Hotel", category: "Shopping" },
    { pattern: /vueling/i, summary: "Vueling", category: "Transport" },
    { pattern: /ryanair/i, summary: "Ryanair", category: "Transport" },
    { pattern: /iberia/i, summary: "Iberia", category: "Transport" },
];

/**
 * Extract a clean summary from a raw bank transaction description
 */
function extractSummary(description: string): string {
    const desc = description.trim();
    
    // Check against known merchant patterns first
    for (const { pattern, summary } of MERCHANT_PATTERNS) {
        if (pattern.test(desc)) {
            return summary;
        }
    }
    
    // Remove common prefixes (Spanish bank formats)
    let cleaned = desc
        .replace(/^(COMPRA|PAGO|RECIBO|TRANSFERENCIA|BIZUM|CARGO|ABONO|INGRESO)\s+/i, "")
        .replace(/^(EN|DE|A|DESDE|HACIA)\s+/i, "")
        .replace(/^WWW\./i, "")
        .replace(/^HTTP[S]?:\/\//i, "");
    
    // Remove trailing reference numbers and codes
    cleaned = cleaned
        .replace(/\s+[A-Z0-9]{6,}$/i, "")  // Remove trailing codes like "CW4WE8Q35"
        .replace(/\s+REF[:\s]*[\w-]+$/i, "")  // Remove REF: XXX
        .replace(/\s+Nº?\s*RECIBO[\s:\d]+$/i, "")  // Remove receipt numbers
        .replace(/\s+DEL\s+\d{2}\d{2}\d{4}\s+AL\s+\d{2}\d{2}\d{4}/i, "")  // Remove date ranges
        .replace(/\s+NIF[:\s]*[A-Z0-9]+$/i, "")  // Remove NIF
        .replace(/\s+POLIZA[:\s]*[\d]+$/i, "")  // Remove policy numbers
        .replace(/\s+\*+\d+$/i, "")  // Remove masked card numbers
        .replace(/\s+\d{2}\/\d{2}\/\d{2,4}$/i, "")  // Remove trailing dates
        .replace(/\s+\d+[.,]\d{2}\s*(EUR|€)?$/i, "");  // Remove amounts
    
    // Extract domain name if it looks like a website
    const domainMatch = cleaned.match(/([a-zA-Z0-9-]+)\.(com|es|net|org|eu|co)/i);
    if (domainMatch) {
        cleaned = domainMatch[1].charAt(0).toUpperCase() + domainMatch[1].slice(1).toLowerCase();
    }
    
    // Clean up and capitalize
    cleaned = cleaned
        .replace(/[*]+/g, " ")  // Replace asterisks with spaces
        .replace(/\s+/g, " ")   // Normalize whitespace
        .trim();
    
    // If still too long or messy, take first meaningful words
    if (cleaned.length > 30) {
        const words = cleaned.split(" ").slice(0, 3);
        cleaned = words.join(" ");
    }
    
    // Capitalize first letter of each word for clean display
    if (cleaned.length > 0) {
        cleaned = cleaned
            .toLowerCase()
            .split(" ")
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(" ");
    }
    
    return cleaned || description.substring(0, 30);
}

/**
 * Get category suggestion from known patterns
 */
function getCategoryFromPattern(description: string): string | null {
    for (const { pattern, category } of MERCHANT_PATTERNS) {
        if (category && pattern.test(description)) {
            return category;
        }
    }
    return null;
}

export async function categoriseTransactions(rows: TxRow[], customCategories?: string[]): Promise<TxRow[]> {
    if (rows.length === 0) return rows;

    // Use custom categories if provided, otherwise use defaults
    const CATEGORIES = customCategories && customCategories.length > 0 ? customCategories : DEFAULT_CATEGORIES;

    // First pass: extract summaries and apply pattern-based categories
    const enrichedRows = rows.map((r, idx) => {
        const summary = extractSummary(r.description);
        const patternCategory = getCategoryFromPattern(r.description);
        return {
            ...r,
            summary,
            _patternCategory: patternCategory,
            _index: idx
        };
    });

    // Find rows that still need AI categorization (no pattern match)
    const rowsNeedingAI = enrichedRows.filter(r => !r._patternCategory);
    
    // Build a compact payload for the LLM (only rows without pattern-based categories)
    const items = rowsNeedingAI.map(r => ({
        index: r._index,
        description: r.summary || r.description.substring(0, 100),
        amount: r.amount
    }));

    let aiMapping = new Map<number, string>();

    if (items.length > 0) {
        const systemPrompt = `
You are an expert financial transaction classifier. Analyze each transaction and assign the most appropriate category.

AVAILABLE CATEGORIES:
${CATEGORIES.join(", ")}

CLASSIFICATION RULES:
1. Positive amounts are usually Income or Transfers IN
2. Negative amounts are expenses in various categories
3. Look for merchant names, keywords, and spending patterns
4. "Other" should only be used when truly ambiguous
5. Spanish/European merchants are common (Mercadona=Groceries, Mapfre=Insurance, etc.)

RESPONSE FORMAT - Return ONLY valid JSON:
{
  "map": [
    {"index": 0, "category": "CategoryName"},
    {"index": 1, "category": "CategoryName"}
  ]
}

You MUST include ALL ${items.length} transactions. Each entry needs:
- "index": exact index from input (0, 1, 2, ...)
- "category": one of the exact categories listed above
`.trim();

        const userPrompt = JSON.stringify(items);

        // Using OpenRouter API
        const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
        const SITE_URL = process.env.SITE_URL || "http://localhost:3000";
        const SITE_NAME = process.env.SITE_NAME || "Folio";

        if (!OPENROUTER_API_KEY) {
            console.warn("[AI] No OpenRouter API key found, using pattern-based categorization only");
        } else {
            try {
                const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
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
                        provider: {
                            sort: "throughput"
                        }
                    })
                });

                if (!res.ok) {
                    const errorText = await res.text();
                    console.error("[AI] OpenRouter API error:", res.status, errorText.substring(0, 200));
                } else {
                    const json = await res.json();
                    const content = json.choices[0]?.message?.content;
                    
                    if (content) {
                        try {
                            const parsed = JSON.parse(content);
                            const mapping = parsed.map || parsed.categories || parsed.results || 
                                (Array.isArray(parsed) ? parsed : []);
                            
                            for (const m of mapping) {
                                const idx = m.index ?? m.i ?? m.id;
                                const cat = m.category ?? m.cat ?? m.c;
                                
                                if (typeof idx === "number" && typeof cat === "string") {
                                    // Validate and normalize category
                                    const normalizedCat = CATEGORIES.find(c => 
                                        c.toLowerCase() === cat.toLowerCase()
                                    ) || cat;
                                    aiMapping.set(idx, normalizedCat);
                                }
                            }
                            console.log(`[AI] Successfully categorized ${aiMapping.size}/${items.length} transactions`);
                        } catch (parseErr) {
                            console.error("[AI] Failed to parse response:", parseErr);
                        }
                    }
                }
            } catch (fetchErr) {
                console.error("[AI] Fetch error:", fetchErr);
            }
        }
    }

    // Helper function for fallback categorization
    const applyFallbackCategory = (row: TxRow): string => {
        const desc = row.description.toLowerCase();
        
        // Income detection (positive amounts)
        if (row.amount > 0) {
            if (desc.includes("transfer") || desc.includes("transferencia") || desc.includes("ingreso") || desc.includes("bizum")) {
                return CATEGORIES.find(c => c.toLowerCase().includes("transfer")) || "Transfers";
            }
            return CATEGORIES.find(c => c.toLowerCase().includes("income") || c.toLowerCase().includes("salary")) || "Income";
        }
        
        // Transfers (negative amounts with transfer keywords)
        if (desc.includes("transfer") || desc.includes("transferencia") || desc.includes("bizum")) {
            return CATEGORIES.find(c => c.toLowerCase().includes("transfer")) || "Transfers";
        }
        
        // Utilities
        if (desc.includes("digi") || desc.includes("telecom") || desc.includes("internet") || desc.includes("phone") || 
            desc.includes("utility") || desc.includes("electric") || desc.includes("water") || desc.includes("recibo") ||
            desc.includes("netflix") || desc.includes("spotify")) {
            return CATEGORIES.find(c => c.toLowerCase().includes("utilit")) || "Utilities";
        }
        
        // Insurance
        if (desc.includes("mapfre") || desc.includes("seguro") || desc.includes("insurance") || desc.includes("poliza")) {
            return CATEGORIES.find(c => c.toLowerCase().includes("insur")) || "Insurance";
        }
        
        // Shopping
        if (desc.includes("zalando") || desc.includes("amazon") || desc.includes("shopping") || desc.includes("compra") ||
            desc.includes("hotel") || desc.includes("booking")) {
            return CATEGORIES.find(c => c.toLowerCase().includes("shopp")) || "Shopping";
        }
        
        // Groceries
        if (desc.includes("grocer") || desc.includes("supermarket") || desc.includes("mercadona") || 
            desc.includes("carrefour") || desc.includes("food") || desc.includes("tienda") ||
            desc.includes("lidl") || desc.includes("aldi")) {
            return CATEGORIES.find(c => c.toLowerCase().includes("grocer")) || "Groceries";
        }
        
        // Restaurants
        if (desc.includes("restaurant") || desc.includes("cafe") || desc.includes("bar") || 
            desc.includes("starbucks") || desc.includes("comida") || desc.includes("glovo") ||
            desc.includes("just eat") || desc.includes("deliveroo")) {
            return CATEGORIES.find(c => c.toLowerCase().includes("restaurant")) || "Restaurants";
        }
        
        // Transport
        if (desc.includes("uber") || desc.includes("taxi") || desc.includes("metro") || 
            desc.includes("bus") || desc.includes("transport") || desc.includes("gasolina") ||
            desc.includes("renfe") || desc.includes("cabify")) {
            return CATEGORIES.find(c => c.toLowerCase().includes("transport")) || "Transport";
        }
        
        // Taxes
        if (desc.includes("comision") || desc.includes("fee") || desc.includes("tax") || desc.includes("impuesto")) {
            return CATEGORIES.find(c => c.toLowerCase().includes("tax")) || "Taxes";
        }
        
        // Savings
        if (desc.includes("saving") || desc.includes("ahorro")) {
            return CATEGORIES.find(c => c.toLowerCase().includes("saving")) || "Savings";
        }
        
        return CATEGORIES.find(c => c.toLowerCase() === "other") || CATEGORIES[CATEGORIES.length - 1] || "Other";
    };

    // Combine all categorization sources
    const result = enrichedRows.map(r => {
        // Priority: 1) Pattern match, 2) AI, 3) Fallback
        let category = r._patternCategory || aiMapping.get(r._index) || applyFallbackCategory(r);
        
        // Validate category exists in list
        if (!CATEGORIES.some(c => c.toLowerCase() === category.toLowerCase())) {
            category = applyFallbackCategory(r);
        }
        
        return {
            date: r.date,
            description: r.description,
            amount: r.amount,
            balance: r.balance,
            category,
            summary: r.summary
        } as TxRow;
    });
    
    const categorizedCount = result.filter(r => r.category && r.category !== "Other").length;
    const patternMatched = enrichedRows.filter(r => r._patternCategory).length;
    console.log(`[AI] Final: ${categorizedCount}/${result.length} categorized (${patternMatched} from patterns, ${aiMapping.size} from AI)`);
    
    return result;
}
