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

/**
 * =============================================================================
 * RECEIPT PARSE PIPELINE TYPES
 * =============================================================================
 * These types support the unified receipt parsing pipeline that handles
 * both PDFs and images with deterministic parsing + AI fallback.
 */

/** Warning codes for the receipt parse pipeline */
export type ReceiptParseWarningCode =
    | "MERCADONA_DETERMINISTIC_FAILED"
    | "AI_FAILED"
    | "OCR_FAILED"

/** User-visible warning from the parse pipeline */
export type ReceiptParseWarning = {
    code: ReceiptParseWarningCode
    message: string  // User-visible, keep copy clean
}

/** Metadata about how the receipt was parsed */
export type ReceiptParseMeta = {
    input_kind: "pdf" | "image"
    merchant_detected: "mercadona" | "unknown"
    extraction_method: "mercadona_deterministic" | "ai_fallback" | "ai_only"
    ocr_used?: boolean
    // Debug info (temporary for troubleshooting)
    debug?: {
        ocr_text_length?: number
        ocr_text_preview?: string
        parse_result?: {
            ok: boolean
            store_name?: string | null
            date?: string | null
            total?: number | null
            calculated_total?: number | null
            item_count?: number
        }
    }
}

/** Result from the unified receipt parse pipeline */
export type ReceiptParseResult = {
    extracted: ExtractedReceipt | null
    rawText?: string | null
    warnings: ReceiptParseWarning[]  // Always returned (possibly empty)
    meta: ReceiptParseMeta
}
