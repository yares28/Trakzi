// lib/ai/categoriseTransactions.ts
import { TxRow } from "../types/transactions";

// Default categories (single words)
const DEFAULT_CATEGORIES = [
    "Groceries", "Restaurants", "Shopping", "Transport", "Utilities",
    "Insurance", "Taxes", "Income", "Transfers", "Savings", "Other"
];

export async function categoriseTransactions(rows: TxRow[], customCategories?: string[]): Promise<TxRow[]> {
    if (rows.length === 0) return rows;

    // Use custom categories if provided, otherwise use defaults
    // Custom categories come from the frontend (localStorage)
    const CATEGORIES = customCategories && customCategories.length > 0 ? customCategories : DEFAULT_CATEGORIES;

    // Build a compact payload for the LLM
    // Ensure descriptions are not empty - use a placeholder if needed
    const items = rows.map((r, idx) => ({
        index: idx,
        description: (r.description && r.description.trim() !== "") ? r.description.trim() : `Transaction ${idx + 1}`,
        amount: r.amount
    }));

    const systemPrompt = `
You are a classifier for personal finance transactions.
You must assign exactly one category from this list to each transaction:
${CATEGORIES.join(", ")}

Make a best guess based on the description. Do not use "Other" unless absolutely necessary.

CRITICAL REQUIREMENTS:
1. You must return a JSON object with this EXACT structure:
{
  "map": [
    {"index": 0, "category": "CategoryName"},
    {"index": 1, "category": "CategoryName"},
    {"index": 2, "category": "CategoryName"},
    ...
  ]
}

2. You MUST include ALL ${items.length} transactions in the response. Every single transaction must have an entry in the "map" array.

3. Each entry must have:
   - "index": the exact index number from the input (starting at 0, must be sequential: 0, 1, 2, 3, ...)
   - "category": one of these exact categories: ${CATEGORIES.join(", ")}

4. The "map" array must contain exactly ${items.length} entries, one for each transaction.

5. Return ONLY valid JSON, no other text or explanation.

Example for 3 transactions:
{
  "map": [
    {"index": 0, "category": "Groceries"},
    {"index": 1, "category": "Transport"},
    {"index": 2, "category": "Salary / Income"}
  ]
}
  `.trim();

    const userPrompt = JSON.stringify(items);

    // Using OpenRouter API with free model
    const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || "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";
    const SITE_URL = process.env.SITE_URL || "http://localhost:3000";
    const SITE_NAME = process.env.SITE_NAME || "Folio";

    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
            "HTTP-Referer": SITE_URL,
            "X-Title": SITE_NAME,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            model: "tngtech/deepseek-r1t2-chimera:free",
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
        const errorDetails = `Status: ${res.status}, Response: ${errorText}`;
        console.error("OpenRouter API error:", errorDetails);
        throw new Error(`OpenRouter API error ${res.status}: ${errorText.substring(0, 200)}`);
    }

    const json = await res.json();
    let mapping: { index: number; category: string }[] = [];
    try {
        const content = json.choices[0]?.message?.content;
        if (!content) {
            const errorMsg = `No content in OpenRouter response. Response structure: ${JSON.stringify(json).substring(0, 200)}`;
            console.error("AI response error:", errorMsg);
            throw new Error(errorMsg);
        }
        
        console.log("AI response content (first 500 chars):", content.substring(0, 500));
        
        const parsed = JSON.parse(content);
        console.log("Parsed AI response:", JSON.stringify(parsed).substring(0, 500));
        
        // Handle both { map: [...] } and direct array formats
        if (Array.isArray(parsed)) {
            mapping = parsed;
        } else if (parsed.map && Array.isArray(parsed.map)) {
            mapping = parsed.map;
        } else if (parsed.categories && Array.isArray(parsed.categories)) {
            mapping = parsed.categories;
        } else if (parsed.results && Array.isArray(parsed.results)) {
            mapping = parsed.results;
        } else {
            // Try to find any array in the response
            const keys = Object.keys(parsed);
            for (const key of keys) {
                if (Array.isArray(parsed[key])) {
                    console.log(`Found array in key "${key}", using it as mapping`);
                    mapping = parsed[key];
                    break;
                }
            }
        }
        
        if (!Array.isArray(mapping) || mapping.length === 0) {
            console.error("AI returned empty or invalid mapping. Full parsed response:", JSON.stringify(parsed));
            throw new Error("AI returned empty or invalid category mapping");
        }
        
        console.log(`AI successfully categorized ${mapping.length} out of ${items.length} transactions`);
        console.log("Mapping sample (first 3):", mapping.slice(0, 3));
    } catch (err: any) {
        const errorMsg = err?.message || String(err) || "Unknown parsing error";
        console.error("AI response parsing failed:", errorMsg, err);
        throw new Error(`Failed to parse AI response: ${errorMsg}`);
    }

    const byIndex = new Map<number, string>();
    let validMappings = 0;
    for (const m of mapping) {
        // Handle both {index, category} and {i, cat} or other variations
        const idx = m.index ?? m.i ?? m.id ?? m.transactionIndex;
        const cat = m.category ?? m.cat ?? m.c ?? m.class;
        
        if (typeof idx === "number" && typeof cat === "string") {
            // Validate category is in our list
            const normalizedCat = CATEGORIES.find(c => 
                c.toLowerCase() === cat.toLowerCase() || 
                c.toLowerCase().includes(cat.toLowerCase()) ||
                cat.toLowerCase().includes(c.toLowerCase())
            ) || (CATEGORIES.includes(cat) ? cat : "Other");
            
            byIndex.set(idx, normalizedCat);
            validMappings++;
        } else {
            console.warn("Invalid mapping entry (missing index or category):", m);
        }
    }
    
    console.log(`[AI] Valid mappings: ${validMappings} out of ${mapping.length} entries, expected ${items.length}`);
    const coveredIndices = Array.from(byIndex.keys()).sort((a, b) => a - b);
    console.log(`[AI] Index coverage:`, coveredIndices);
    
    // Check if we have all indices
    const missingIndices: number[] = [];
    for (let i = 0; i < items.length; i++) {
        if (!byIndex.has(i)) {
            missingIndices.push(i);
        }
    }
    
    if (missingIndices.length > 0) {
        console.error(`[AI] ERROR: Missing categories for ${missingIndices.length} transactions at indices: ${missingIndices.join(", ")}`);
        console.error(`[AI] The AI did not return categories for all transactions. Applying fallback categorization.`);
    }

    // Helper function for fallback categorization
    const applyFallbackCategory = (row: TxRow, idx: number): string => {
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
        
            // Utilities (check first as it's common)
            if (desc.includes("digi") || desc.includes("telecom") || desc.includes("internet") || desc.includes("phone") || 
                desc.includes("utility") || desc.includes("electric") || desc.includes("water") || desc.includes("recibo")) {
                return CATEGORIES.find(c => c.toLowerCase().includes("utilit")) || "Utilities";
            }
            
            // Insurance
            if (desc.includes("mapfre") || desc.includes("seguro") || desc.includes("insurance")) {
                return CATEGORIES.find(c => c.toLowerCase().includes("insur")) || "Insurance";
            }
            
            // Hotels/Travel
            if (desc.includes("hotel") || desc.includes("booking") || desc.includes("viaje") || desc.includes("travel")) {
                return CATEGORIES.find(c => c.toLowerCase().includes("shopp")) || "Shopping";
            }
            
            // Shopping
            if (desc.includes("zalando") || desc.includes("amazon") || desc.includes("shopping") || desc.includes("compra")) {
                return CATEGORIES.find(c => c.toLowerCase().includes("shopp")) || "Shopping";
            }
            
            // Groceries
            if (desc.includes("grocer") || desc.includes("supermarket") || desc.includes("mercadona") || 
                desc.includes("carrefour") || desc.includes("food") || desc.includes("tienda")) {
                return CATEGORIES.find(c => c.toLowerCase().includes("grocer")) || "Groceries";
            }
            
            // Restaurants
            if (desc.includes("restaurant") || desc.includes("cafe") || desc.includes("bar") || 
                desc.includes("starbucks") || desc.includes("pret") || desc.includes("comida")) {
                return CATEGORIES.find(c => c.toLowerCase().includes("restaurant")) || "Restaurants";
            }
            
            // Transport
            if (desc.includes("uber") || desc.includes("taxi") || desc.includes("metro") || 
                desc.includes("bus") || desc.includes("transport") || desc.includes("gasolina")) {
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
        
        // Default to "Other" if it exists in categories, otherwise use first available
        return CATEGORIES.find(c => c.toLowerCase() === "other") || CATEGORIES[CATEGORIES.length - 1] || "Other";
    };

    // Ensure EVERY transaction has a category - no exceptions
    const result = rows.map((r, idx) => {
        let category = byIndex.get(idx);
        
        // Apply fallback if no category, or if category is "Other" (try to improve it)
        if (!category || category === "Other" || category.trim() === "") {
            const fallbackCategory = applyFallbackCategory(r, idx);
            category = fallbackCategory;
            
            if (!byIndex.has(idx)) {
                console.log(`[AI] Applied fallback "${fallbackCategory}" for transaction ${idx}: ${r.description.substring(0, 50)}`);
            } else if (byIndex.get(idx) === "Other") {
                console.log(`[AI] Improved category from "Other" to "${fallbackCategory}" for transaction ${idx}: ${r.description.substring(0, 50)}`);
            }
        }
        
        return {
            ...r,
            category: category || "Other" // Final safety net
        };
    });
    
    // Verify all have categories
    const missingCategories = result.filter(r => !r.category || r.category.trim() === "");
    if (missingCategories.length > 0) {
        console.error(`[AI] CRITICAL: ${missingCategories.length} transactions still have no category!`);
    }
    
    const categorizedCount = result.filter(r => r.category && r.category !== "Other").length;
    console.log(`[AI] Final result: ${categorizedCount}/${result.length} have non-Other categories`);
    console.log(`[AI] All ${result.length} transactions have a category assigned`);
    
    // Log first few to verify
    console.log(`[AI] Sample results:`, result.slice(0, 5).map(r => ({ desc: r.description.substring(0, 30), cat: r.category })));

    return result;
}
