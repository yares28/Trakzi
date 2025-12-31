// lib/ai/rules/types.ts
// Shared types for merchant pattern matching

export interface MerchantPattern {
    pattern: RegExp;
    merchant: string;
    category: string;
    extractName?: boolean; // For transfers: extract person's name
}

export interface OperationPattern {
    pattern: RegExp;
    label: string;
    category: string;
}

export type Language = "es" | "fr" | "en" | "unknown";
