/**
 * =============================================================================
 * UNIFIED RECEIPT PARSE PIPELINE
 * =============================================================================
 * 
 * This module provides a unified entry point for parsing receipts from
 * both PDFs and images. It handles:
 * 
 * 1. Text extraction (PDF via unpdf, images via OCR)
 * 2. Merchant detection (Mercadona, etc.)
 * 3. Deterministic parsing when available
 * 4. AI fallback when deterministic parsing fails or is unavailable
 * 5. Warning/metadata collection for UI feedback
 * 
 * FLOW:
 * - PDF: unpdf → text → merchant check → deterministic or AI
 * - Image: OCR → text → merchant check → deterministic or AI
 * 
 * =============================================================================
 */

import type {
    ExtractedReceipt,
    ReceiptParseResult,
    ReceiptParseWarning,
    ReceiptParseMeta
} from "../parsers/types"
import { mercadonaParser, tryParseMercadonaFromText } from "../parsers/mercadona"
import { extractTextFromImage } from "../ocr"

/** Parameters for the unified receipt parser */
export type ParseReceiptFileParams = {
    data: Uint8Array
    mimeType: string
    fileName: string
    allowedCategories: string[]
    /** AI fallback for PDF text extraction */
    aiExtractFromPdfText?: (pdfText: string) => Promise<{ extracted: ExtractedReceipt; rawText: string }>
    /** AI fallback for image extraction (multimodal) */
    aiExtractFromImageDataUrl?: (base64DataUrl: string) => Promise<{ extracted: ExtractedReceipt; rawText: string }>
}

// Mercadona portal link for downloading PDF receipts
const MERCADONA_PORTAL_URL = "https://www.portalcliente.mercadona.es/pclie/web/op.htm?fwk.locale=es_ES&operation=pclie.flow.ri.index"

/**
 * Check if a MIME type is a PDF
 */
function isPdf(mimeType: string): boolean {
    return mimeType.toLowerCase() === "application/pdf"
}

/**
 * Check if a MIME type is an image
 */
function isImage(mimeType: string): boolean {
    return mimeType.toLowerCase().startsWith("image/")
}

/**
 * Extract text from a PDF using unpdf.
 */
async function extractTextFromPdf(data: Uint8Array): Promise<string> {
    const { extractText } = await import("unpdf")
    const result = await extractText(data)
    const pages = result.text || []
    return Array.isArray(pages) ? pages.join("\n") : String(pages)
}

/**
 * Convert image data to base64 data URL for AI multimodal input.
 */
function toBase64DataUrl(data: Uint8Array, mimeType: string): string {
    const buffer = Buffer.from(data)
    return `data:${mimeType};base64,${buffer.toString("base64")}`
}

/**
 * Try AI fallback for image extraction.
 * Returns null if AI is not available or fails.
 */
async function tryAiImageFallback(
    params: ParseReceiptFileParams,
    warnings: ReceiptParseWarning[]
): Promise<{ extracted: ExtractedReceipt; rawText: string } | null> {
    if (!params.aiExtractFromImageDataUrl) {
        return null
    }

    try {
        const base64DataUrl = toBase64DataUrl(params.data, params.mimeType)
        return await params.aiExtractFromImageDataUrl(base64DataUrl)
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        console.error("[Receipt Parser] AI image extraction failed:", message)
        warnings.push({
            code: "AI_FAILED",
            message: `AI extraction failed. If this is a Mercadona receipt, try downloading the PDF receipt from the portal: ${MERCADONA_PORTAL_URL}`,
        })
        return null
    }
}

/**
 * Try AI fallback for PDF text extraction.
 * Returns null if AI is not available or fails.
 */
async function tryAiPdfTextFallback(
    pdfText: string,
    params: ParseReceiptFileParams,
    warnings: ReceiptParseWarning[]
): Promise<{ extracted: ExtractedReceipt; rawText: string } | null> {
    if (!params.aiExtractFromPdfText) {
        return null
    }

    try {
        return await params.aiExtractFromPdfText(pdfText)
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        console.error("[Receipt Parser] AI PDF text extraction failed:", message)
        warnings.push({
            code: "AI_FAILED",
            message: `AI extraction failed: ${message.substring(0, 100)}`,
        })
        return null
    }
}

/**
 * Parse a PDF receipt file.
 */
async function parsePdfReceipt(params: ParseReceiptFileParams): Promise<ReceiptParseResult> {
    const warnings: ReceiptParseWarning[] = []
    let meta: ReceiptParseMeta = {
        input_kind: "pdf",
        merchant_detected: "unknown",
        extraction_method: "ai_only",
    }

    // Extract text from PDF
    const pdfText = await extractTextFromPdf(params.data)

    if (!pdfText.trim()) {
        warnings.push({
            code: "OCR_FAILED",
            message: "PDF appears to be empty or unreadable.",
        })
        return { extracted: null, rawText: null, warnings, meta }
    }

    // Check if it's a Mercadona receipt
    if (mercadonaParser.canParse(pdfText)) {
        meta.merchant_detected = "mercadona"

        // Try deterministic parsing
        const result = tryParseMercadonaFromText({ text: pdfText, source: "pdf" })

        if (result.ok && result.extracted) {
            meta.extraction_method = "mercadona_deterministic"
            console.log("[Receipt Parser] Mercadona PDF parsed deterministically")
            return {
                extracted: result.extracted,
                rawText: result.rawText,
                warnings,
                meta,
            }
        }

        // Deterministic parsing failed, try AI
        warnings.push({
            code: "MERCADONA_DETERMINISTIC_FAILED",
            message: "Mercadona parser could not extract all required fields. Trying AI extraction...",
        })
        console.log("[Receipt Parser] Mercadona deterministic failed, trying AI fallback")

        const aiResult = await tryAiPdfTextFallback(pdfText, params, warnings)
        if (aiResult) {
            meta.extraction_method = "ai_fallback"
            return {
                extracted: aiResult.extracted,
                rawText: aiResult.rawText,
                warnings,
                meta,
            }
        }

        // Both failed
        return { extracted: null, rawText: pdfText, warnings, meta }
    }

    // Unknown merchant, use AI directly
    console.log("[Receipt Parser] Unknown merchant, using AI extraction")
    const aiResult = await tryAiPdfTextFallback(pdfText, params, warnings)

    if (aiResult) {
        meta.extraction_method = "ai_only"
        return {
            extracted: aiResult.extracted,
            rawText: aiResult.rawText,
            warnings,
            meta,
        }
    }

    return { extracted: null, rawText: pdfText, warnings, meta }
}

/**
 * Parse an image receipt file.
 */
async function parseImageReceipt(params: ParseReceiptFileParams): Promise<ReceiptParseResult> {
    const warnings: ReceiptParseWarning[] = []
    let meta: ReceiptParseMeta = {
        input_kind: "image",
        merchant_detected: "unknown",
        extraction_method: "ai_only",
        ocr_used: false,
    }

    let ocrText: string | null = null

    // Try OCR first
    try {
        const ocrResult = await extractTextFromImage({
            data: params.data,
            mimeType: params.mimeType,
        })
        ocrText = ocrResult.text
        meta.ocr_used = true
        console.log(`[Receipt Parser] OCR extracted ${ocrText.length} characters`)
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        console.error("[Receipt Parser] OCR failed:", message)
        warnings.push({
            code: "OCR_FAILED",
            message: "Could not read the receipt image (OCR failed). Trying AI vision extraction...",
        })

        // OCR failed, try AI multimodal directly
        const aiResult = await tryAiImageFallback(params, warnings)
        if (aiResult) {
            meta.extraction_method = "ai_only"
            return {
                extracted: aiResult.extracted,
                rawText: aiResult.rawText,
                warnings,
                meta,
            }
        }

        return { extracted: null, rawText: null, warnings, meta }
    }

    // OCR succeeded, check if it's Mercadona
    if (mercadonaParser.canParse(ocrText)) {
        meta.merchant_detected = "mercadona"

        // Try deterministic parsing with OCR normalization
        const result = tryParseMercadonaFromText({ text: ocrText, source: "ocr" })

        if (result.ok && result.extracted) {
            meta.extraction_method = "mercadona_deterministic"
            console.log("[Receipt Parser] Mercadona image parsed deterministically via OCR")
            return {
                extracted: result.extracted,
                rawText: result.rawText,
                warnings,
                meta,
            }
        }

        // Deterministic parsing failed, try AI multimodal
        warnings.push({
            code: "MERCADONA_DETERMINISTIC_FAILED",
            message: "Mercadona parser could not extract all required fields from the image. Trying AI vision extraction...",
        })
        console.log("[Receipt Parser] Mercadona OCR deterministic failed, trying AI vision fallback")

        const aiResult = await tryAiImageFallback(params, warnings)
        if (aiResult) {
            meta.extraction_method = "ai_fallback"
            return {
                extracted: aiResult.extracted,
                rawText: aiResult.rawText,
                warnings,
                meta,
            }
        }

        // Both failed
        warnings.push({
            code: "AI_FAILED",
            message: `Could not extract receipt data. For Mercadona receipts, you can download the PDF receipt from: ${MERCADONA_PORTAL_URL}`,
        })
        return { extracted: null, rawText: ocrText, warnings, meta }
    }

    // Unknown merchant from OCR, use AI directly
    console.log("[Receipt Parser] Unknown merchant from OCR, using AI vision extraction")
    const aiResult = await tryAiImageFallback(params, warnings)

    if (aiResult) {
        meta.extraction_method = "ai_only"
        return {
            extracted: aiResult.extracted,
            rawText: aiResult.rawText,
            warnings,
            meta,
        }
    }

    return { extracted: null, rawText: ocrText, warnings, meta }
}

/**
 * Parse a receipt file (PDF or image) using the unified pipeline.
 * 
 * @param params - The parse parameters including file data and AI fallback functions
 * @returns Parse result with extracted data, warnings, and metadata
 */
export async function parseReceiptFile(params: ParseReceiptFileParams): Promise<ReceiptParseResult> {
    const mimeType = params.mimeType.toLowerCase()

    if (isPdf(mimeType)) {
        return parsePdfReceipt(params)
    }

    if (isImage(mimeType)) {
        return parseImageReceipt(params)
    }

    // Unsupported file type
    return {
        extracted: null,
        rawText: null,
        warnings: [{
            code: "OCR_FAILED",
            message: `Unsupported file type: ${params.mimeType}. Please upload a PDF or image file.`,
        }],
        meta: {
            input_kind: mimeType.includes("pdf") ? "pdf" : "image",
            merchant_detected: "unknown",
            extraction_method: "ai_only",
        },
    }
}
