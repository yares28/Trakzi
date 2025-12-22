/**
 * Shared types for receipt PDF text parsers.
 * This module defines the interface for merchant-specific parsers.
 */

/**
 * Extracted receipt data structure.
 * Extended to support both ISO and display date formats, plus VAT data.
 */
export type ExtractedReceipt = {
    store_name?: string | null
    receipt_date?: string | null          // DD-MM-YYYY (display format)
    receipt_date_iso?: string | null      // YYYY-MM-DD (canonical/DB format)
    receipt_time?: string | null          // HH:MM:SS
    currency?: string | null
    total_amount?: number | string | null
    taxes_total_cuota?: number | string | null  // VAT total CUOTA (nullable)
    items?: Array<{
        description?: string | null
        quantity?: number | string | null
        price_per_unit?: number | string | null
        total_price?: number | string | null
        category?: string | null
    }>
}

/**
 * Interface for merchant-specific PDF text parsers.
 * Each merchant parser must implement this interface.
 */
export type PdfTextParser = {
    /** Unique identifier for this parser (e.g., "mercadona") */
    id: string

    /**
     * Check if this parser can handle the given PDF text.
     * Should be fast and deterministic.
     */
    canParse(pdfText: string): boolean

    /**
     * Parse the PDF text and extract receipt data.
     * Only call this if canParse() returned true.
     */
    parse(pdfText: string): { extracted: ExtractedReceipt; rawText: string }
}
