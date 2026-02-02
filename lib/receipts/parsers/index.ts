/**
 * Receipt PDF text parser dispatcher.
 * Routes PDF text to the appropriate merchant-specific parser,
 * falling back to AI extraction if no parser matches.
 */

import type { ExtractedReceipt } from "./types"
import { mercadonaParser } from "./mercadona"
import { consumParser } from "./consum"
import { diaParser } from "./dia"

// Registry of all available parsers
// Order matters: more specific parsers should come first
const parsers = [mercadonaParser, consumParser, diaParser]

export type ExtractReceiptParams = {
    pdfText: string
    fileName: string
    allowedCategories: string[]
    aiFallback: () => Promise<{ extracted: ExtractedReceipt; rawText: string }>
}

/**
 * Extract receipt data from PDF text.
 * 
 * Tries merchant-specific parsers first (deterministic, fast, no AI cost).
 * Falls back to AI extraction if no parser matches.
 * 
 * @param params.pdfText - Raw text extracted from PDF
 * @param params.fileName - Original filename (for logging/AI context)
 * @param params.allowedCategories - Categories for AI fallback (not used by deterministic parsers)
 * @param params.aiFallback - AI extraction function to use if no parser matches
 */
export async function extractReceiptFromPdfTextWithParsers(
    params: ExtractReceiptParams
): Promise<{ extracted: ExtractedReceipt; rawText: string }> {
    const { pdfText, aiFallback } = params

    // Try each registered parser
    for (const parser of parsers) {
        if (parser.canParse(pdfText)) {
            console.log(`[Receipts Parser] Using ${parser.id} parser for deterministic extraction`)
            return parser.parse(pdfText)
        }
    }

    // No parser matched, use AI fallback
    console.log("[Receipts Parser] No deterministic parser matched, using AI extraction")
    return aiFallback()
}

// Re-export types for convenience
export type { ExtractedReceipt, PdfTextParser } from "./types"
