// lib/ai/rule-simplify.ts
import { SimplifyResult } from "@/lib/types/transactions";

type MerchantRule = {
    pattern: RegExp;
    simplified: string;
    typeHint: SimplifyResult["typeHint"];
    confidence: number;
};

type OperationRule = {
    patterns: RegExp[];
    simplified: string;
    typeHint: SimplifyResult["typeHint"];
    confidence: number;
};

// Spain-heavy merchant dictionary (80+ patterns)
const MERCHANT_RULES: MerchantRule[] = [
    // Groceries (Spain)
    { pattern: /mercadona/i, simplified: "Mercadona", typeHint: "merchant", confidence: 0.95 },
    { pattern: /carrefour/i, simplified: "Carrefour", typeHint: "merchant", confidence: 0.95 },
    { pattern: /lidl/i, simplified: "Lidl", typeHint: "merchant", confidence: 0.95 },
    { pattern: /\bdia\b/i, simplified: "DIA", typeHint: "merchant", confidence: 0.95 },
    { pattern: /aldi/i, simplified: "Aldi", typeHint: "merchant", confidence: 0.95 },
    { pattern: /eroski/i, simplified: "Eroski", typeHint: "merchant", confidence: 0.95 },
    { pattern: /alcampo/i, simplified: "Alcampo", typeHint: "merchant", confidence: 0.95 },
    { pattern: /hipercor/i, simplified: "Hipercor", typeHint: "merchant", confidence: 0.95 },
    { pattern: /consum/i, simplified: "Consum", typeHint: "merchant", confidence: 0.9 },

    // Online retail
    { pattern: /amazon/i, simplified: "Amazon", typeHint: "merchant", confidence: 0.95 },
    { pattern: /aliexpress/i, simplified: "AliExpress", typeHint: "merchant", confidence: 0.95 },
    { pattern: /shein/i, simplified: "Shein", typeHint: "merchant", confidence: 0.95 },
    { pattern: /ebay/i, simplified: "eBay", typeHint: "merchant", confidence: 0.9 },
    { pattern: /zalando/i, simplified: "Zalando", typeHint: "merchant", confidence: 0.9 },

    // Food delivery
    { pattern: /glovo/i, simplified: "Glovo", typeHint: "merchant", confidence: 0.95 },
    { pattern: /just\s*eat/i, simplified: "Just Eat", typeHint: "merchant", confidence: 0.95 },
    { pattern: /uber\s*eats/i, simplified: "Uber Eats", typeHint: "merchant", confidence: 0.9 },
    { pattern: /deliveroo/i, simplified: "Deliveroo", typeHint: "merchant", confidence: 0.9 },
    { pattern: /telepizza/i, simplified: "Telepizza", typeHint: "merchant", confidence: 0.9 },

    // Transport
    { pattern: /uber(?!\s*eats)/i, simplified: "Uber", typeHint: "merchant", confidence: 0.9 },
    { pattern: /cabify/i, simplified: "Cabify", typeHint: "merchant", confidence: 0.9 },
    { pattern: /bolt/i, simplified: "Bolt", typeHint: "merchant", confidence: 0.85 },
    { pattern: /ryanair/i, simplified: "Ryanair", typeHint: "merchant", confidence: 0.9 },
    { pattern: /iberia/i, simplified: "Iberia", typeHint: "merchant", confidence: 0.9 },
    { pattern: /renfe/i, simplified: "Renfe", typeHint: "merchant", confidence: 0.9 },
    { pattern: /\bemt\b/i, simplified: "EMT", typeHint: "merchant", confidence: 0.85 },
    { pattern: /\btmb\b/i, simplified: "TMB", typeHint: "merchant", confidence: 0.85 },

    // Subscriptions
    { pattern: /spotify/i, simplified: "Spotify", typeHint: "merchant", confidence: 0.95 },
    { pattern: /netflix/i, simplified: "Netflix", typeHint: "merchant", confidence: 0.95 },
    { pattern: /disney\s*plus|disney\+/i, simplified: "Disney Plus", typeHint: "merchant", confidence: 0.95 },
    { pattern: /hbo\s*max/i, simplified: "HBO Max", typeHint: "merchant", confidence: 0.9 },
    { pattern: /apple/i, simplified: "Apple", typeHint: "merchant", confidence: 0.85 },
    { pattern: /google/i, simplified: "Google", typeHint: "merchant", confidence: 0.85 },
    { pattern: /youtube\s*premium/i, simplified: "YouTube Premium", typeHint: "merchant", confidence: 0.9 },

    // Payment services
    { pattern: /paypal/i, simplified: "PayPal", typeHint: "merchant", confidence: 0.9 },
    { pattern: /stripe/i, simplified: "Stripe", typeHint: "merchant", confidence: 0.9 },
    { pattern: /revolut/i, simplified: "Revolut", typeHint: "merchant", confidence: 0.9 },
    { pattern: /wise/i, simplified: "Wise", typeHint: "merchant", confidence: 0.9 },

    // Fashion
    { pattern: /zara/i, simplified: "Zara", typeHint: "merchant", confidence: 0.95 },
    { pattern: /inditex/i, simplified: "Inditex", typeHint: "merchant", confidence: 0.9 },
    { pattern: /\bh&m\b|h\s*&\s*m/i, simplified: "H&M", typeHint: "merchant", confidence: 0.9 },
    { pattern: /mango/i, simplified: "Mango", typeHint: "merchant", confidence: 0.85 },
    { pattern: /primark/i, simplified: "Primark", typeHint: "merchant", confidence: 0.9 },
    { pattern: /uniqlo/i, simplified: "Uniqlo", typeHint: "merchant", confidence: 0.9 },

    // Department stores & retail
    { pattern: /el\s*corte\s*ingles/i, simplified: "El Corte Inglés", typeHint: "merchant", confidence: 0.95 },
    { pattern: /ikea/i, simplified: "Ikea", typeHint: "merchant", confidence: 0.95 },
    { pattern: /decathlon/i, simplified: "Decathlon", typeHint: "merchant", confidence: 0.95 },
    { pattern: /mediamarkt|media\s*markt/i, simplified: "MediaMarkt", typeHint: "merchant", confidence: 0.9 },
    { pattern: /fnac/i, simplified: "Fnac", typeHint: "merchant", confidence: 0.9 },

    // Utilities (Spain)
    { pattern: /iberdrola/i, simplified: "Iberdrola", typeHint: "merchant", confidence: 0.9 },
    { pattern: /endesa/i, simplified: "Endesa", typeHint: "merchant", confidence: 0.9 },
    { pattern: /naturgy/i, simplified: "Naturgy", typeHint: "merchant", confidence: 0.9 },
    { pattern: /movistar/i, simplified: "Movistar", typeHint: "merchant", confidence: 0.9 },
    { pattern: /vodafone/i, simplified: "Vodafone", typeHint: "merchant", confidence: 0.9 },
    { pattern: /orange/i, simplified: "Orange", typeHint: "merchant", confidence: 0.85 },
];

// Banking operation rules
const OPERATION_RULES: OperationRule[] = [
    {
        patterns: [/comision|fee|gastos|charge/i],
        simplified: "Bank Fee",
        typeHint: "fee",
        confidence: 0.8,
    },
    {
        patterns: [/cajero|atm|retirada|withdrawal/i],
        simplified: "ATM Withdrawal",
        typeHint: "atm",
        confidence: 0.85,
    },
    {
        patterns: [/nomina|salario|payroll|salary/i],
        simplified: "Salary",
        typeHint: "salary",
        confidence: 0.85,
    },
    {
        patterns: [/devolucion|refund|reverso|reversal/i],
        simplified: "Refund",
        typeHint: "refund",
        confidence: 0.85,
    },
];

/**
 * Attempts to simplify a transaction description using rule-based matching.
 * Checks merchant patterns, transfer patterns, and operation patterns.
 * Returns null if no confident match found (AI fallback needed).
 * 
 * @param sanitized - Sanitized transaction description
 * @returns SimplifyResult with simplified description and confidence, or null
 */
export function ruleSimplifyDescription(sanitized: string): SimplifyResult {
    if (!sanitized) {
        return { simplified: null, confidence: 0 };
    }

    // 1. Check merchant rules (highest priority)
    for (const rule of MERCHANT_RULES) {
        if (rule.pattern.test(sanitized)) {
            return {
                simplified: rule.simplified,
                confidence: rule.confidence,
                matchedRule: `merchant:${rule.simplified.toLowerCase()}`,
                typeHint: rule.typeHint,
            };
        }
    }

    // 2. Check for transfer/Bizum patterns (special handling for name extraction)
    const transferResult = detectTransfer(sanitized);
    if (transferResult) {
        return transferResult;
    }

    // 3. Check operation rules (fees, ATM, salary, refund)
    for (const rule of OPERATION_RULES) {
        for (const pattern of rule.patterns) {
            if (pattern.test(sanitized)) {
                return {
                    simplified: rule.simplified,
                    confidence: rule.confidence,
                    matchedRule: rule.typeHint || "operation",
                    typeHint: rule.typeHint,
                };
            }
        }
    }

    // No confident rule match → AI fallback needed
    return { simplified: null, confidence: 0 };
}

/**
 * Detects transfer/Bizum transactions and extracts first name if present.
 * Handles patterns like "BIZUM A SR JUAN PEREZ" → "Bizum Juan"
 */
function detectTransfer(sanitized: string): SimplifyResult | null {
    const transferPatterns = [
        /bizum/i,
        /transferencia/i,
        /\btrf\b/i,
        /sepa/i,
        /\bp2p\b/i,
        /giro/i,
    ];

    let isTransfer = false;
    let isBizum = false;

    for (const pattern of transferPatterns) {
        if (pattern.test(sanitized)) {
            isTransfer = true;
            if (/bizum/i.test(sanitized)) {
                isBizum = true;
            }
            break;
        }
    }

    if (!isTransfer) return null;

    // Extract name if present
    const firstName = extractFirstName(sanitized);

    if (firstName) {
        const label = isBizum ? "Bizum" : "Transfer";
        return {
            simplified: `${label} ${firstName}`,
            confidence: 0.85,
            matchedRule: isBizum ? "transfer:bizum" : "transfer",
            typeHint: "transfer",
        };
    }

    // Transfer detected but no name
    return {
        simplified: isBizum ? "Bizum" : "Transfer",
        confidence: 0.8,
        matchedRule: isBizum ? "transfer:bizum" : "transfer",
        typeHint: "transfer",
    };
}

// Honorifics to ignore (multilingual) when extracting names
const HONORIFICS = new Set([
    // English
    "MR", "MRS", "MS", "MISS", "SIR", "MADAM",
    // French
    "MONSIEUR", "MME", "MLLE",
    // Spanish
    "SR", "SRA", "SRTA", "DON", "DOÑA", "D", "DA",
    // Professional
    "DR", "DRA", "PROF", "ING", "LIC",
    // German
    "HERR", "FRAU",
]);

/**
 * Extracts first name from transfer description.
 * Rules:
 * - Look for patterns like "BIZUM A <name>", "TRANSFERENCIA <name>"
 * - Keep only first name token
 * - Ignore honorifics (Mr, Mrs, Sr, Sra, Don, etc.)
 * - Apply title case
 */
function extractFirstName(text: string): string | null {
    if (!text) return null;

    // Patterns to find name context
    const namePatterns = [
        /bizum\s+(?:a\s+|de\s+)?(.+)/i,
        /transferencia\s+(?:a\s+)?(.+)/i,
        /sepa\s+(.+)/i,
        /\bp2p\s+(.+)/i,
    ];

    let nameCandidate = "";

    for (const pattern of namePatterns) {
        const match = text.match(pattern);
        if (match && match[1]) {
            nameCandidate = match[1].trim();
            break;
        }
    }

    if (!nameCandidate) return null;

    // Tokenize by whitespace and punctuation
    const tokens = nameCandidate
        .split(/[\s,;:.]+/)
        .map(t => t.trim())
        .filter(t => t.length > 0);

    // Find first non-honorific token
    for (const token of tokens) {
        const upper = token.toUpperCase();
        const normalized = upper.replace(/\./g, ""); // Remove periods

        // Skip honorifics and keep only alphabetic tokens
        if (!HONORIFICS.has(normalized) && /^[A-Z]+$/i.test(token)) {
            // Apply title case
            return toTitleCase(token);
        }
    }

    return null;
}

/**
 * Converts string to title case (Juan, not JUAN or juan)
 */
function toTitleCase(str: string): string {
    if (!str) return "";
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}
