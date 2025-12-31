// lib/ai/rules/language-detection.ts
// Detect language from transaction descriptions

import { Language } from "./types";

interface LanguageKeywords {
    language: Language;
    keywords: RegExp[];
    weight: number; // How much this counts toward detection
}

const LANGUAGE_SIGNATURES: LanguageKeywords[] = [
    // Spanish signatures
    {
        language: "es",
        keywords: [
            /\b(COMPRA|PAGO|TRANSFERENCIA|BIZUM|RECIBO|CAJERO|CARGO)\b/i,
            /\b(RETIRADA|DOMICILIACION|NOMINA|DEVOLUCION|MERCADONA|CARREFOUR)\b/i,
            /\b(VIREMENT|TRANSF|PRELEVEMENT|RETRAIT)\b/i, // Also works for French
        ],
        weight: 1
    },
    // French signatures
    {
        language: "fr",
        keywords: [
            /\b(VIREMENT|RECHARGE|FRAIS|RETRAIT|PRELEVEMENT|ACHAT)\b/i,
            /\b(SALAIRE|PAIEMENT|REMBOURSEMENT|CARTE|CB|DAB|GAB)\b/i,
            /\b(AUCHAN|LECLERC|INTERMARCHE|SNCF|RATP|EDF)\b/i,
        ],
        weight: 1
    },
    // English signatures
    {
        language: "en",
        keywords: [
            /\b(TRANSFER|PAYMENT|WITHDRAWAL|PURCHASE|FEE|CHARGE)\b/i,
            /\b(DIRECT\s*DEBIT|STANDING\s*ORDER|SALARY|REFUND|ATM)\b/i,
            /\b(TESCO|SAINSBURY|ASDA|MORRISONS|WAITROSE|TFL)\b/i,
        ],
        weight: 1
    },
];

/**
 * Detect the primary language from a sample of transaction descriptions
 * @param descriptions - Sample of transaction descriptions (typically first 50-100)
 * @returns Detected language code or "unknown"
 */
export function detectLanguage(descriptions: string[]): Language {
    if (!descriptions || descriptions.length === 0) {
        return "unknown";
    }

    // Count matches for each language
    const scores: Record<Language, number> = {
        es: 0,
        fr: 0,
        en: 0,
        unknown: 0,
    };

    // Combine descriptions into one text for efficiency
    const combinedText = descriptions.slice(0, 50).join(" ").toUpperCase();

    // Score each language
    for (const signature of LANGUAGE_SIGNATURES) {
        for (const keyword of signature.keywords) {
            const matches = combinedText.match(new RegExp(keyword.source, "gi"));
            if (matches) {
                scores[signature.language] += matches.length * signature.weight;
            }
        }
    }

    // Find language with highest score
    const entries = Object.entries(scores) as [Language, number][];
    entries.sort((a, b) => b[1] - a[1]);

    const [topLanguage, topScore] = entries[0];

    // Require at least 5 matches to be confident
    if (topScore < 5) {
        console.log(`[Language Detection] Low confidence (${topScore} matches), defaulting to unknown`);
        return "unknown";
    }

    console.log(`[Language Detection] Detected: ${topLanguage} (score: ${topScore})`);
    console.log(`[Language Detection] Scores:`, scores);

    return topLanguage;
}

/**
 * Get language name for logging
 */
export function getLanguageName(lang: Language): string {
    const names: Record<Language, string> = {
        es: "Spanish",
        fr: "French",
        en: "English",
        unknown: "Unknown"
    };
    return names[lang];
}
