// lib/ai/hybrid-pipeline-v2.ts
/**
 * Hybrid Import Pipeline v2
 * 
 * Orchestrates the full enrichment pipeline:
 * 1. Sanitize (remove sensitive data)
 * 2. Rule-based simplification (80%+ coverage)
 * 3. AI simplification (fallback for unknown merchants)
 * 4. AI categorization (using simplified descriptions)
 */

import { TxRow, TransactionMetadata } from "@/lib/types/transactions";
import { sanitizeDescription } from "./sanitize-description";
import { ruleSimplifyDescription } from "./rule-simplify";
import { aiSimplifyBatch } from "./ai-simplify";
import { aiCategorizeBatch } from "./categorize-v2";
import { DEFAULT_CATEGORIES } from "@/lib/categories";

type HybridPipelineOptions = {
    preferencesByKey?: Map<string, string>; // User category preferences
    userId?: string;
    customCategories?: string[];
    enableV2?: boolean; // Feature flag
};

type EnrichedTxRow = TxRow & {
    _metadata?: TransactionMetadata;
};

/**
 * Process transactions through the hybrid v2 pipeline
 * 
 * @param rows - Array of transaction rows to process
 * @param options - Pipeline options (preferences, custom categories, feature flag)
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
        enableV2 = true, // Default to enabled
    } = options;

    // If v2 disabled, return rows as-is
    if (!enableV2) {
        console.log("[Hybrid Pipeline v2] Disabled via feature flag");
        return rows;
    }

    console.log(`[Hybrid Pipeline v2] Processing ${rows.length} transactions`);
    const startTime = Date.now();

    const enrichedRows: EnrichedTxRow[] = [];
    const needsAiSimplify: Array<{ index: number; row: TxRow; sanitized: string }> = [];

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

    // Step 3: AI Simplify (only unmatched transactions)
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

    // Step 4: AI Categorize (all transactions)
    console.log("[Hybrid Pipeline v2] Step 4: AI Categorize");

    try {
        const categorizationInput = enrichedRows.map((row, i) => ({
            id: `tx_${i}`,
            simplified_description: row.simplifiedDescription || row._metadata?.sanitized_description || row.description,
            sanitized_description: row._metadata?.sanitized_description || row.description,
            amount: row.amount,
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
    const categorizedCount = enrichedRows.filter(r => r.category && r.category !== "Other").length;

    console.log(`[Hybrid Pipeline v2] Complete in ${elapsed}ms`);
    console.log(`[Hybrid Pipeline v2] Results: ${categorizedCount}/${rows.length} categorized (${Math.round(categorizedCount / rows.length * 100)}%)`);

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
