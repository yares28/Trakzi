// lib/types/transactions.ts
export type TxRow = {
    date: string;                    // ISO: YYYY-MM-DD
    time?: string | null;            // Optional time (HH:MM[:SS]) from CSV import
    description: string;             // Raw bank description
    simplifiedDescription?: string;  // NEW (v2): Simplified merchant/label (e.g., "Amazon", "Transfer Juan", "Bank Fee")
    amount: number;
    balance: number | null;
    category?: string;

    /**
     * @deprecated Use simplifiedDescription instead
     * This field is kept for backward compatibility but will be removed in future versions
     */
    summary?: string;
};

/**
 * Result from rule-based or AI simplification
 */
export type SimplifyResult = {
    simplified: string | null;
    confidence: number;              // 0.0 - 1.0
    matchedRule?: string;            // e.g., "merchant:mercadona", "transfer:bizum", "fee"
    typeHint?: "merchant" | "transfer" | "fee" | "atm" | "salary" | "refund" | "other";
    category?: string;               // NEW: Category from rule matching (if available)
};

/**
 * Result from AI categorization
 */
export type CategorizeResult = {
    category: string;
    confidence: number;              // 0.0 - 1.0
};

/**
 * Metadata structure stored in raw_csv_row JSON field (v2 pipeline)
 */
export type TransactionMetadata = {
    pipeline_version: "v2_hybrid";
    sanitized_description: string;
    simplify: {
        source: "rules" | "ai";
        confidence: number;
        matched_rule?: string;
        type_hint?: string;
    };
    categorize: {
        source: "ai" | "manual" | "preference" | "rules";
        confidence: number;
        model?: string;
    };
    errors?: string[];

    // Legacy fields (from old imports, kept for compatibility)
    date?: string;
    time?: string;
    description?: string;
    amount?: number;
    balance?: number;
    category?: string;
};
