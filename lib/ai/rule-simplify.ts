// lib/ai/rule-simplify.ts
// Rule-based simplification with language-specific patterns

import { SimplifyResult } from "@/lib/types/transactions";
import { loadRulesForLanguage, type MerchantPattern, type OperationPattern } from "./rules";

// Cache for loaded patterns (avoid reloading on every call)
let cachedRules: {
    merchants: MerchantPattern[];
    operations: OperationPattern[];
} | null = null;

/**
 * Attempts to simplify transaction descriptions using rule-based matching.
 * Automatically detects language and loads appropriate patterns.
 * 
 * @param descriptions - Array of sanitized transaction descriptions
 * @returns Array of SimplifyResults (one per description)
 */
export function ruleSimplifyBatch(descriptions: string[]): SimplifyResult[] {
    if (!descriptions || descriptions.length === 0) {
        return [];
    }

    // Load patterns based on detected language (once per batch)
    if (!cachedRules) {
        const ruleSet = loadRulesForLanguage(descriptions);
        cachedRules = {
            merchants: ruleSet.merchants,
            operations: ruleSet.operations,
        };
    }

    // Simplify each description
    return descriptions.map(desc => ruleSimplifyDescription(desc));
}

/**
 * Simplify a single description using cached patterns
 */
export function ruleSimplifyDescription(sanitized: string): SimplifyResult {
    if (!sanitized) {
        return { simplified: null, confidence: 0 };
    }

    // Ensure patterns are loaded (lazy load with Spanish default if needed)
    if (!cachedRules) {
        const { loadRulesForLanguage } = require("./rules");
        const ruleSet = loadRulesForLanguage([sanitized]);
        cachedRules = {
            merchants: ruleSet.merchants,
            operations: ruleSet.operations,
        };
    }

    // 1. Check merchant patterns (highest priority)
    for (const pattern of cachedRules.merchants) {
        if (pattern.pattern.test(sanitized)) {
            // Handle name extraction for transfer patterns
            if (pattern.extractName) {
                const firstName = extractFirstName(sanitized);
                if (firstName) {
                    return {
                        simplified: `${pattern.merchant} ${firstName}`,
                        confidence: 0.85,
                        matchedRule: `transfer:${pattern.merchant.toLowerCase()}`,
                        typeHint: "transfer",
                    };
                }
            }

            return {
                simplified: pattern.merchant,
                confidence: 0.9,
                matchedRule: `merchant:${pattern.merchant.toLowerCase()}`,
                typeHint: "merchant",
            };
        }
    }

    // 2. Check operation patterns (fees, ATM, salary, etc.)
    for (const operation of cachedRules.operations) {
        if (operation.pattern.test(sanitized)) {
            return {
                simplified: operation.label,
                confidence: 0.85,
                matchedRule: `operation:${operation.category.toLowerCase()}`,
                typeHint: "other",
            };
        }
    }

    // No confident rule match → AI fallback needed
    return { simplified: null, confidence: 0 };
}

/**
 * Reset cached rules (useful for testing or when processing new language batch)
 */
export function resetRuleCache(): void {
    cachedRules = null;
}

// Honorifics to ignore (multilingual) when extracting names
const HONORIFICS = new Set([
    // English
    "MR", "MRS", "MS", "MISS", "SIR", "MADAM",
    // French
    "MONSIEUR", "MME", "MLLE", "M",
    // Spanish
    "SR", "SRA", "SRTA", "DON", "DOÑA", "D", "DA", "DN", "DNA",
    // Professional
    "DR", "DRA", "PROF", "ING", "LIC",
    // German
    "HERR", "FRAU",
]);

/**
 * Extracts first name from transfer description.
 * Handles multilingual patterns.
 */
function extractFirstName(text: string): string | null {
    if (!text) return null;

    // Multilingual transfer patterns
    const namePatterns = [
        // Spanish
        /(?:bizum|transferencia|transf)\s+(?:a|de|desde)?\s*(?:sr\.?|sra\.?|d\.?|dna?\.?)?\s*([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)/i,
        // French
        /(?:virement|transf)\s+(?:a|de|vers)?\s*(?:m\.?|mme\.?|mlle\.?)?\s*([A-ZÀÂÄÇÈÉÊËÎÏÔÙÛÜ][a-zàâäçèé êëîïôùûü]+)/i,
        // English
        /(?:transfer|payment)\s+(?:to|from|for)?\s*(?:mr\.?|mrs\.?|ms\.?|miss\.?)?\s*([A-Z][a-z]+)/i,
    ];

    for (const pattern of namePatterns) {
        const match = text.match(pattern);
        if (match && match[1]) {
            const name = match[1].trim();
            // Apply title case
            return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
        }
    }

    return null;
}
