// lib/ai/hybrid-pipeline-v2.ts
/**
 * Hybrid Import Pipeline (Default Transaction Processing)
 * 
 * This is THE default pipeline for processing all transaction imports.
 * It orchestrates the full enrichment flow:
 * 1. Sanitize (remove sensitive data before AI)
 * 2. Rule-based simplification (80%+ coverage, zero cost)
 * 3. AI simplification (fallback for unknown merchants)
 * 4. AI categorization (using simplified descriptions)
 * 5. User preference application (highest priority override)
 */

import { TxRow, TransactionMetadata, SimplifyResult } from "@/lib/types/transactions";
import { sanitizeDescription } from "./sanitize-description";
import { ruleSimplifyDescription } from "./rule-simplify";
import { aiSimplifyBatch } from "./ai-simplify";
import { aiCategorizeBatch } from "./categorize-v2";
import { DEFAULT_CATEGORIES } from "@/lib/categories";

type HybridPipelineOptions = {
    preferencesByKey?: Map<string, string>; // User category preferences
    userId?: string;
    customCategories?: string[];
};

type EnrichedTxRow = TxRow & {
    _metadata?: TransactionMetadata;
};

/**
 * Process transactions through the Hybrid Import Pipeline
 * 
 * This is THE default transaction processing pipeline that:
 * 1. Sanitizes descriptions (removes sensitive data)
 * 2. Simplifies using rules first (80%+ coverage, free)
 * 3. Falls back to AI simplification for unknown merchants
 * 4. Categorizes using simplified descriptions
 * 5. Applies user preferences (highest priority)
 * 
 * @param rows - Array of transaction rows to process
 * @param options - Pipeline options (preferences, custom categories)
 * @returns Enriched transaction rows with simplified descriptions and categories
 */
export async function processHybridPipelineV2(
    rows: TxRow[],
    options: HybridPipelineOptions = {}
): Promise<EnrichedTxRow[]> {
    const {
        preferencesByKey,
        userId,
        customCategories,
    } = options;

    console.log(`[Hybrid Pipeline v2] Processing ${rows.length} transactions`);
    const startTime = Date.now();

    const enrichedRows: EnrichedTxRow[] = [];
    const needsAiSimplify: Array<{ index: number; row: TxRow; sanitized: string }> = [];
    const ruleSimplified: Array<{ index: number; result: SimplifyResult }> = [];

    // Step 1 & 2: Sanitize + Rule Simplify (all transactions)
    console.log("[Hybrid Pipeline v2] Step 1+2: Sanitize + Rule Simplify");
    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];

        // Step 1: Sanitize description
        const sanitized = sanitizeDescription(row.description);

        // Step 2: Try rule-based simplification
        const ruleResult = ruleSimplifyDescription(sanitized);

        const metadata: TransactionMetadata = {
            pipeline_version: "v2_hybrid",
            sanitized_description: sanitized,
            simplify: {
                source: "rules",
                confidence: 0,
            },
            categorize: {
                source: "manual",
                confidence: 0,
            },
        };

        if (ruleResult.simplified && ruleResult.confidence >= 0.75) {
            // Rule match! No AI needed for simplification
            enrichedRows.push({
                ...row,
                simplifiedDescription: ruleResult.simplified,
                _metadata: {
                    ...metadata,
                    simplify: {
                        source: "rules",
                        confidence: ruleResult.confidence,
                        matched_rule: ruleResult.matchedRule,
                        type_hint: ruleResult.typeHint,
                    },
                },
            });
            ruleSimplified.push({ index: i, result: ruleResult });  // Track rule results
        } else {
            // No confident rule match → needs AI
            needsAiSimplify.push({ index: i, row, sanitized });
            enrichedRows.push({
                ...row,
                _metadata: metadata,
            });
        }
    }

    const ruleMatchedCount = enrichedRows.filter(r => r.simplifiedDescription).length;
    console.log(`[Hybrid Pipeline v2] Rule coverage: ${ruleMatchedCount}/${rows.length} (${Math.round(ruleMatchedCount / rows.length * 100)}%)`);

    if (needsAiSimplify.length > 0) {
        const sampleUnmatched = needsAiSimplify.slice(0, 5).map(i => i.sanitized).join(", ");
        console.log(`[Hybrid Pipeline v2] Sample of unmatched descriptions (AI fallback): ${sampleUnmatched}${needsAiSimplify.length > 5 ? "..." : ""}`);
    }
    if (needsAiSimplify.length > 0) {
        console.log(`[Hybrid Pipeline v2] Step 3: AI Simplify (${needsAiSimplify.length} items)`);

        try {
            const aiSimplifyResults = await aiSimplifyBatch(
                needsAiSimplify.map(item => ({
                    id: `tx_${item.index}`,
                    sanitized_description: item.sanitized,
                }))
            );

            // Apply AI simplification results
            for (const item of needsAiSimplify) {
                const aiResult = aiSimplifyResults.get(`tx_${item.index}`);
                if (aiResult && aiResult.simplified) {
                    enrichedRows[item.index].simplifiedDescription = aiResult.simplified;
                    if (enrichedRows[item.index]._metadata) {
                        enrichedRows[item.index]._metadata!.simplify = {
                            source: "ai",
                            confidence: aiResult.confidence,
                            matched_rule: aiResult.matchedRule,
                            type_hint: aiResult.typeHint,
                        };
                    }
                } else {
                    // Fallback: use sanitized description truncated
                    enrichedRows[item.index].simplifiedDescription = item.sanitized.substring(0, 50);
                    if (enrichedRows[item.index]._metadata) {
                        enrichedRows[item.index]._metadata!.simplify = {
                            source: "ai",
                            confidence: 0.3,
                            matched_rule: "fallback",
                        };
                    }
                }
            }
        } catch (aiError) {
            console.error("[Hybrid Pipeline v2] AI Simplify failed:", aiError);
            // Use sanitized descriptions as fallback
            for (const item of needsAiSimplify) {
                enrichedRows[item.index].simplifiedDescription = item.sanitized.substring(0, 50);
            }
        }
    }

    // Step 4: Categorize (use rules first, AI for remaining)
    console.log("[Hybrid Pipeline v2] Step 4: Categorize");

    // Apply categories from rules directly, track which need AI
    let rulesApplied = 0;
    const needsAiIndexes: number[] = [];

    for (let i = 0; i < enrichedRows.length; i++) {
        const row = enrichedRows[i];
        const simplifyKey = `tx_${i}`;

        // Check if rule provided a category
        let ruleCategory: string | null = null;

        // Check rule simplify results first
        for (const item of ruleSimplified) {
            if (item.index === i && item.result.category) {
                ruleCategory = item.result.category;
                break;
            }
        }

        if (ruleCategory) {
            // Apply category DIRECTLY to enrichedRows[i]
            enrichedRows[i].category = ruleCategory;
            rulesApplied++;

            // Add category to metadata
            if (row._metadata) {
                row._metadata.categorize = {
                    source: "ai",
                    confidence: 0.9,
                };
            }
        } else {
            // Track which indexes need AI
            needsAiIndexes.push(i);
        }
    }

    console.log(`[Hybrid Pipeline v2] ${rulesApplied} categorized by rules, ${needsAiIndexes.length} need AI`);

    try {
        // Only call AI for transactions that need it
        if (needsAiIndexes.length > 0) {
            const categorizationInput = needsAiIndexes.map((idx) => ({
                id: `tx_${idx}`,
                simplified_description: enrichedRows[idx].simplifiedDescription || enrichedRows[idx]._metadata?.sanitized_description || enrichedRows[idx].description,
                sanitized_description: enrichedRows[idx]._metadata?.sanitized_description || enrichedRows[idx].description,
                amount: enrichedRows[idx].amount,
            }));

            const categories = customCategories && customCategories.length > 0
                ? customCategories
                : DEFAULT_CATEGORIES;

            const categoryResults = await aiCategorizeBatch(categorizationInput, categories);

            // Apply categorization results
            for (let i = 0; i < enrichedRows.length; i++) {
                const categoryResult = categoryResults.get(`tx_${i}`);
                if (categoryResult) {
                    enrichedRows[i].category = categoryResult.category;
                    if (enrichedRows[i]._metadata) {
                        enrichedRows[i]._metadata!.categorize = {
                            source: "ai",
                            confidence: categoryResult.confidence,
                        };
                    }
                }
            }
        }
    } catch (catError) {
        console.error("[Hybrid Pipeline v2] AI Categorize failed:", catError);
        // Leave categories as-is or set to "Other"
        enrichedRows.forEach(row => {
            if (!row.category) {
                row.category = "Other";
            }
        });
    }

    // Apply user preferences (highest priority - overrides AI)
    if (preferencesByKey && preferencesByKey.size > 0) {
        console.log(`[Hybrid Pipeline v2] Applying ${preferencesByKey.size} user preferences`);
        let preferencesApplied = 0;

        for (const row of enrichedRows) {
            // Use normalized description key (same as existing system)
            const descKey = normalizeDescriptionKey(row.description);
            const preferredCategory = preferencesByKey.get(descKey);

            if (preferredCategory) {
                row.category = preferredCategory;
                if (row._metadata) {
                    row._metadata.categorize = {
                        source: "preference",
                        confidence: 1.0,
                    };
                }
                preferencesApplied++;
            }
        }

        console.log(`[Hybrid Pipeline v2] Applied ${preferencesApplied} preferences`);
    }

    const elapsed = Date.now() - startTime;
    const ruleCount = enrichedRows.filter(r => r._metadata?.simplify.source === "rules").length;
    const aiSimplifyCount = enrichedRows.filter(r => r._metadata?.simplify.source === "ai").length;
    const aiCategorizeCount = enrichedRows.filter(r => r._metadata?.categorize.source === "ai").length;
    const preferenceCount = enrichedRows.filter(r => r._metadata?.categorize.source === "preference").length;
    const categorizedCount = enrichedRows.filter(r => r.category && r.category !== "Other").length;

    console.log(`[Hybrid Pipeline v2] Execution Summary (${elapsed}ms):`);
    console.log(` - Total Rows: ${rows.length}`);
    console.log(` - Simplified by Rules: ${ruleCount} (${Math.round(ruleCount / rows.length * 100)}%)`);
    console.log(` - Simplified by AI: ${aiSimplifyCount} (${Math.round(aiSimplifyCount / rows.length * 100)}%)`);
    console.log(` - Categorized by Rules: ${rulesApplied} (${Math.round(rulesApplied / rows.length * 100)}%)`);
    console.log(` - Categorized by AI: ${aiCategorizeCount} (${Math.round(aiCategorizeCount / rows.length * 100)}%)`);
    console.log(` - User Preferences applied: ${preferenceCount}`);
    console.log(` - Total Results: ${categorizedCount}/${rows.length} categorized (${Math.round(categorizedCount / rows.length * 100)}%)`);

    return enrichedRows;
}

/**
 * Normalize description for preference matching
 * (Same logic as transaction-category-preferences.ts)
 */
function normalizeDescriptionKey(description: string): string {
    return description
        .toLowerCase()
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\b\d{1,4}[-/]\d{1,2}[-/]\d{1,4}\b/g, " ")
        .replace(/\b\d+(?:[.,]\d+)?\b/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}
