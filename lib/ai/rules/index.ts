// lib/ai/rules/index.ts
// Main entry point for language-specific rule patterns

import { Language, MerchantPattern, OperationPattern } from "./types";
import { detectLanguage, getLanguageName } from "./language-detection";
import { COMMON_PATTERNS, COMMON_OPERATIONS } from "./patterns-common";
import { ES_ALL_PATTERNS, ES_OPERATIONS } from "./patterns-es";
import { FR_ALL_PATTERNS, FR_OPERATIONS } from "./patterns-fr";
import { EN_ALL_PATTERNS, EN_OPERATIONS } from "./patterns-en";

interface RuleSet {
    merchants: MerchantPattern[];
    operations: OperationPattern[];
    language: Language;
}

/**
 * Load appropriate rule patterns based on detected language
 * @param descriptions - Sample of transaction descriptions for language detection
 * @returns Rule set with merchants and operations for detected language
 */
export function loadRulesForLanguage(descriptions: string[]): RuleSet {
    const detectedLanguage = detectLanguage(descriptions);
    const languageName = getLanguageName(detectedLanguage);

    console.log(`[Rules] Loading patterns for ${languageName}`);

    // Load language-specific patterns
    let languagePatterns: MerchantPattern[] = [];
    let languageOperations: OperationPattern[] = [];

    switch (detectedLanguage) {
        case "es":
            languagePatterns = ES_ALL_PATTERNS;
            languageOperations = ES_OPERATIONS;
            break;
        case "fr":
            languagePatterns = FR_ALL_PATTERNS;
            languageOperations = FR_OPERATIONS;
            break;
        case "en":
            languagePatterns = EN_ALL_PATTERNS;
            languageOperations = EN_OPERATIONS;
            break;
        case "unknown":
            // Default to Spanish (most common in your app) or load all
            console.log("[Rules] Unknown language, loading Spanish as default");
            languagePatterns = ES_ALL_PATTERNS;
            languageOperations = ES_OPERATIONS;
            break;
    }

    // Combine with common patterns (universal brands work everywhere)
    const allMerchants = [...COMMON_PATTERNS, ...languagePatterns];
    const allOperations = [...languageOperations];

    console.log(`[Rules] Loaded ${allMerchants.length} merchant patterns, ${allOperations.length} operation patterns`);

    return {
        merchants: allMerchants,
        operations: allOperations,
        language: detectedLanguage,
    };
}

/**
 * Export for direct access if needed
 */
export { detectLanguage, getLanguageName } from "./language-detection";
export { COMMON_PATTERNS } from "./patterns-common";
export { ES_ALL_PATTERNS, ES_OPERATIONS } from "./patterns-es";
export { FR_ALL_PATTERNS, FR_OPERATIONS } from "./patterns-fr";
export { EN_ALL_PATTERNS, EN_OPERATIONS } from "./patterns-en";
export type { Language, MerchantPattern, OperationPattern } from "./types";
