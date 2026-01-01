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
 * - PDF: unpdf -> text -> merchant check -> deterministic or AI
 * - Image: OCR -> text -> merchant check -> deterministic or AI
 * 
 * =============================================================================
 */

import type {
    ExtractedReceipt,
    ReceiptParseResult,
    ReceiptParseWarning,
    ReceiptParseMeta,
    ReceiptParseValidation
} from "../parsers/types"
import { mercadonaParser, tryParseMercadonaFromText } from "../parsers/mercadona"
import { extractTextFromImage } from "../ocr"
import { detectDocumentKindFromText } from "../../parsing/detect-document-kind"

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

type PdfTextMetrics = NonNullable<ReceiptParseMeta["pdf_text"]>

type ReceiptParseCandidate = {
    extracted: ExtractedReceipt
    rawText: string
    warnings: ReceiptParseWarning[]
    extraction_method: ReceiptParseMeta["extraction_method"]
    merchant_detected: ReceiptParseMeta["merchant_detected"]
    validation: ReceiptParseValidation | null
    score: number
    source: "pdf_text" | "pdf_ocr"
    is_primary: boolean
    repair_used?: boolean
}

// Mercadona portal link for downloading PDF receipts
const MERCADONA_PORTAL_URL = "https://www.portalcliente.mercadona.es/pclie/web/op.htm?fwk.locale=es_ES&operation=pclie.flow.ri.index"

const MIN_PDF_TEXT_CHARS_TOTAL = 60
const MIN_PDF_TEXT_CHARS_PER_PAGE = 25
const PDF_OCR_PAGE_LIMIT = 2
const PDF_OCR_SCALE = 2
const MIN_OCR_TEXT_CHARS = 80
const MIN_OCR_TEXT_LINES = 4
const ITEM_TOTAL_TOLERANCE_ABS = 0.05
const ITEM_TOTAL_TOLERANCE_PCT = 0.05

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
async function extractTextFromPdf(data: Uint8Array): Promise<{ text: string; pages: string[] }> {
    const { extractText } = await import("unpdf")
    const result = await extractText(data)
    const pages = Array.isArray(result.text)
        ? result.text
        : typeof result.text === "string"
            ? [result.text]
            : []
    return {
        pages,
        text: pages.join("\n"),
    }
}

/**
 * Convert image data to base64 data URL for AI multimodal input.
 */
function toBase64DataUrl(data: Uint8Array, mimeType: string): string {
    const buffer = Buffer.from(data)
    return `data:${mimeType};base64,${buffer.toString("base64")}`
}

function addWarning(warnings: ReceiptParseWarning[], warning: ReceiptParseWarning) {
    if (warnings.some((existing) => existing.code === warning.code)) {
        return
    }
    warnings.push(warning)
}

function analyzePdfText(pages: string[]): PdfTextMetrics {
    const pageCount = pages.length > 0 ? pages.length : 1
    const combined = pages.join("\n")
    const charCount = combined.replace(/\s+/g, "").length
    const charsPerPage = pageCount > 0 ? charCount / pageCount : charCount
    const lowTextDensity =
        charCount < MIN_PDF_TEXT_CHARS_TOTAL || charsPerPage < MIN_PDF_TEXT_CHARS_PER_PAGE

    return {
        page_count: pageCount,
        char_count: charCount,
        chars_per_page: Number(charsPerPage.toFixed(2)),
        low_text_density: lowTextDensity,
    }
}

function analyzeOcrText(text: string) {
    const trimmed = text.trim()
    const lines = trimmed
        ? trimmed.split(/\r?\n/).map((line) => line.trim()).filter((line) => line.length > 0)
        : []
    const charCount = trimmed.replace(/\s+/g, "").length
    const lineCount = lines.length
    const lowTextDensity = charCount < MIN_OCR_TEXT_CHARS || lineCount < MIN_OCR_TEXT_LINES

    return { charCount, lineCount, lowTextDensity }
}

function parseAmountValue(value: unknown): number | null {
    if (typeof value === "number") {
        return Number.isFinite(value) ? value : null
    }
    if (typeof value === "string") {
        const normalized = value.replace(",", ".").replace(/[^0-9.+-]/g, "")
        const parsed = Number(normalized)
        return Number.isFinite(parsed) ? parsed : null
    }
    return null
}

function buildReceiptValidation(extracted: ExtractedReceipt | null): ReceiptParseValidation | null {
    if (!extracted) return null

    const items = Array.isArray(extracted.items) ? extracted.items : []
    const itemCount = items.length
    let lineItemMismatchCount = 0

    items.forEach((item) => {
        const quantity = parseAmountValue(item?.quantity)
        const pricePerUnit = parseAmountValue(item?.price_per_unit)
        const totalPrice = parseAmountValue(item?.total_price)
        if (!quantity || !pricePerUnit || !totalPrice) return

        const expectedTotal = quantity * pricePerUnit
        const difference = Math.abs(expectedTotal - totalPrice)
        const tolerance = Math.max(ITEM_TOTAL_TOLERANCE_ABS, totalPrice * ITEM_TOTAL_TOLERANCE_PCT)

        if (difference > tolerance) {
            lineItemMismatchCount += 1
        }
    })

    const lineItemsTotal = items.reduce((sum, item) => {
        const total = parseAmountValue(item?.total_price)
        return sum + (total ?? 0)
    }, 0)
    const totalAmount = parseAmountValue(extracted.total_amount)
    const difference =
        totalAmount !== null && lineItemsTotal > 0
            ? Math.abs(totalAmount - lineItemsTotal)
            : null
    const tolerance =
        totalAmount !== null
            ? Math.max(0.5, totalAmount * 0.05)
            : null
    const totalMismatch =
        difference !== null &&
        tolerance !== null &&
        difference > tolerance
    const missingLineItems =
        (totalAmount !== null && totalAmount > 0 && itemCount === 0) ||
        (totalAmount !== null && totalAmount > 0 && lineItemsTotal <= 0)

    return {
        item_count: itemCount,
        line_item_mismatch_count: lineItemMismatchCount,
        line_item_mismatch_rate: itemCount > 0 ? Number((lineItemMismatchCount / itemCount).toFixed(3)) : 0,
        total_amount: totalAmount,
        line_items_total: lineItemsTotal > 0 ? Number(lineItemsTotal.toFixed(2)) : null,
        total_difference: difference !== null ? Number(difference.toFixed(2)) : null,
        total_mismatch: totalMismatch,
        missing_line_items: missingLineItems,
    }
}

function scoreValidation(validation: ReceiptParseValidation | null): number {
    if (!validation) return 0
    let score = 100
    if (validation.missing_line_items) score -= 40
    if (validation.total_mismatch) score -= 30
    if (validation.line_item_mismatch_count > 0) {
        score -= Math.min(20, validation.line_item_mismatch_count * 2)
    }
    if (validation.line_item_mismatch_rate > 0.3) score -= 10
    if (!validation.total_amount) score -= 10
    if (validation.item_count <= 0) score -= 20
    return score
}

function needsRepair(validation: ReceiptParseValidation | null): boolean {
    if (!validation) return false
    return (
        validation.missing_line_items ||
        validation.total_mismatch ||
        validation.line_item_mismatch_rate > 0.3
    )
}

function buildQuality(params: {
    validation: ReceiptParseValidation | null
    warnings: ReceiptParseWarning[]
    pdfMetrics?: PdfTextMetrics | null
    usedOcrForPdf?: boolean
}): { quality: "high" | "medium" | "low"; reasons: string[] } {
    const reasons: string[] = []

    if (params.pdfMetrics?.low_text_density) {
        reasons.push("Low PDF text density")
    }
    if (params.usedOcrForPdf) {
        reasons.push("OCR fallback used for PDF")
    }
    if (params.validation?.missing_line_items) {
        reasons.push("Missing line items detected")
    }
    if (params.validation?.total_mismatch) {
        reasons.push("Total mismatch vs line items")
    }
    if (params.validation?.line_item_mismatch_count) {
        reasons.push("Line item totals inconsistent")
    }

    let quality: "high" | "medium" | "low" = "high"
    if (params.validation?.missing_line_items || params.validation?.total_mismatch) {
        quality = "low"
    } else if ((params.validation?.line_item_mismatch_rate ?? 0) > 0.3) {
        quality = "low"
    } else if (reasons.length > 0 || params.warnings.length > 0) {
        quality = "medium"
    }

    return { quality, reasons }
}

async function extractOcrTextFromPdf(params: {
    data: Uint8Array
    pageCount: number
    warnings: ReceiptParseWarning[]
}): Promise<{ text: string; pageCount: number; metrics: ReturnType<typeof analyzeOcrText>; retryUsed: boolean } | null> {
    try {
        const { definePDFJSModule, renderPageAsImage } = await import("unpdf")
        await definePDFJSModule(() => import("pdfjs-dist"))

        const pagesToRender = Math.max(1, Math.min(params.pageCount || 1, PDF_OCR_PAGE_LIMIT))
        const textParts: string[] = []
        let retryUsed = false

        for (let pageNumber = 1; pageNumber <= pagesToRender; pageNumber += 1) {
            const buffer = await renderPageAsImage(params.data, pageNumber, {
                canvasImport: () => import("@napi-rs/canvas"),
                scale: PDF_OCR_SCALE,
            })
            const imageData = new Uint8Array(buffer)
            const ocrResult = await extractTextFromImage({
                data: imageData,
                mimeType: "image/png",
                retryOnLowText: true,
            })
            textParts.push(ocrResult.text)
            if (ocrResult.retryUsed) {
                retryUsed = true
            }
        }

        const combined = textParts.join("\n").trim()
        if (!combined) {
            return null
        }

        return { text: combined, pageCount: pagesToRender, metrics: analyzeOcrText(combined), retryUsed }
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        console.error("[Receipt Parser] PDF OCR fallback failed:", message)
        addWarning(params.warnings, {
            code: "OCR_FAILED",
            message: "PDF OCR fallback failed. Please try a clearer scan or upload a photo.",
        })
        return null
    }
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
    const globalWarnings: ReceiptParseWarning[] = []
    const fallbackWarnings: ReceiptParseWarning[] = []
    const meta: ReceiptParseMeta = {
        input_kind: "pdf",
        merchant_detected: "unknown",
        extraction_method: "ai_only",
    }

    const { text: pdfText, pages } = await extractTextFromPdf(params.data)
    const pdfMetrics = analyzePdfText(pages)
    meta.pdf_text = pdfMetrics

    let ocrText: string | null = null
    let ocrPageCount = 0

    if (pdfMetrics.low_text_density) {
        addWarning(globalWarnings, {
            code: "LOW_TEXT_DENSITY",
            message: "PDF text is sparse, running OCR fallback for better extraction.",
        })
        const ocrResult = await extractOcrTextFromPdf({
            data: params.data,
            pageCount: pdfMetrics.page_count,
            warnings: globalWarnings,
        })
        if (ocrResult?.text) {
            ocrText = ocrResult.text
            ocrPageCount = ocrResult.pageCount
            meta.ocr_used = true
            meta.ocr_used_for_pdf = true
            meta.ocr_page_count = ocrPageCount
            meta.ocr_text = {
                char_count: ocrResult.metrics.charCount,
                line_count: ocrResult.metrics.lineCount,
                low_text_density: ocrResult.metrics.lowTextDensity,
            }
            if (ocrResult.retryUsed) {
                meta.ocr_retry_used = true
                addWarning(globalWarnings, {
                    code: "OCR_RETRY_USED",
                    message: "OCR was retried to improve low-text scans.",
                })
            }
            addWarning(globalWarnings, {
                code: "PDF_OCR_USED",
                message: "OCR fallback was used to read this PDF.",
            })
        }
    }

    const primaryText = ocrText && pdfMetrics.low_text_density ? ocrText : pdfText
    const primarySource = ocrText && pdfMetrics.low_text_density ? "pdf_ocr" : "pdf_text"
    const secondaryText =
        primarySource === "pdf_text" && ocrText
            ? ocrText
            : primarySource === "pdf_ocr" && pdfText
                ? pdfText
                : null
    const secondarySource = secondaryText
        ? (primarySource === "pdf_text" ? "pdf_ocr" : "pdf_text")
        : null

    if (!primaryText.trim() && !secondaryText) {
        addWarning(globalWarnings, {
            code: "OCR_FAILED",
            message: "PDF appears to be empty or unreadable.",
        })
        const quality = buildQuality({
            validation: null,
            warnings: globalWarnings,
            pdfMetrics,
            usedOcrForPdf: meta.ocr_used_for_pdf,
        })
        meta.quality = quality.quality
        meta.quality_reasons = quality.reasons
        return { extracted: null, rawText: null, warnings: globalWarnings, meta }
    }

    const documentKind = detectDocumentKindFromText(primaryText || secondaryText || "")
    if (documentKind.kind === "statement") {
        addWarning(globalWarnings, {
            code: "NOT_A_RECEIPT",
            message: "This file looks like a bank statement, not a receipt. Please upload it to the Analytics page.",
        })
        const quality = buildQuality({
            validation: null,
            warnings: globalWarnings,
            pdfMetrics,
            usedOcrForPdf: meta.ocr_used_for_pdf,
        })
        meta.quality = quality.quality
        meta.quality_reasons = quality.reasons
        return { extracted: null, rawText: primaryText || pdfText, warnings: globalWarnings, meta }
    }

    const candidates: ReceiptParseCandidate[] = []
    let repairAttempted = false

    const buildCandidate = async (text: string, source: "pdf_text" | "pdf_ocr", isPrimary: boolean) => {
        if (!text.trim()) return
        const candidateWarnings: ReceiptParseWarning[] = []
        let merchantDetected: ReceiptParseMeta["merchant_detected"] = "unknown"
        let extractionMethod: ReceiptParseMeta["extraction_method"] = "ai_only"
        let extracted: ExtractedReceipt | null = null
        let rawText = text
        let validation: ReceiptParseValidation | null = null
        let repairUsed = false

        if (mercadonaParser.canParse(text)) {
            merchantDetected = "mercadona"
            const result = tryParseMercadonaFromText({
                text,
                source: source === "pdf_ocr" ? "ocr" : "pdf",
            })
            if (result.ok && result.extracted) {
                extracted = result.extracted
                rawText = result.rawText
                extractionMethod = "mercadona_deterministic"
            } else {
                addWarning(candidateWarnings, {
                    code: "MERCADONA_DETERMINISTIC_FAILED",
                    message: "Mercadona parser could not extract all required fields. Trying AI extraction...",
                })
            }
        }

        if (!extracted && params.aiExtractFromPdfText) {
            const aiWarnings: ReceiptParseWarning[] = []
            const aiResult = await tryAiPdfTextFallback(text, params, aiWarnings)
            if (aiResult) {
                extracted = aiResult.extracted
                rawText = aiResult.rawText
                extractionMethod = merchantDetected === "mercadona" ? "ai_fallback" : "ai_only"
                candidateWarnings.push(...aiWarnings)
            } else {
                candidateWarnings.push(...aiWarnings)
            }
        }

        if (!extracted) {
            fallbackWarnings.push(...candidateWarnings)
            return
        }

        validation = buildReceiptValidation(extracted)
        let score = scoreValidation(validation)

        if (extractionMethod === "mercadona_deterministic" && needsRepair(validation) && params.aiExtractFromPdfText) {
            repairAttempted = true
            const aiWarnings: ReceiptParseWarning[] = []
            const aiResult = await tryAiPdfTextFallback(text, params, aiWarnings)
            if (aiResult) {
                const aiValidation = buildReceiptValidation(aiResult.extracted)
                const aiScore = scoreValidation(aiValidation)
                if (aiScore > score) {
                    extracted = aiResult.extracted
                    rawText = aiResult.rawText
                    extractionMethod = "ai_fallback"
                    candidateWarnings.push(...aiWarnings)
                    validation = aiValidation
                    score = aiScore
                    repairUsed = true
                }
            }
        }

        candidates.push({
            extracted,
            rawText,
            warnings: candidateWarnings,
            extraction_method: extractionMethod,
            merchant_detected: merchantDetected,
            validation,
            score,
            source,
            is_primary: isPrimary,
            repair_used: repairUsed,
        })
    }

    await buildCandidate(primaryText, primarySource, true)
    if (secondaryText && secondarySource) {
        repairAttempted = true
        await buildCandidate(secondaryText, secondarySource, false)
    }

    if (candidates.length === 0) {
        const warnings = [...globalWarnings, ...fallbackWarnings]
        const quality = buildQuality({
            validation: null,
            warnings,
            pdfMetrics,
            usedOcrForPdf: meta.ocr_used_for_pdf,
        })
        meta.quality = quality.quality
        meta.quality_reasons = quality.reasons
        return { extracted: null, rawText: primaryText || pdfText, warnings, meta }
    }

    const bestCandidate = candidates.slice().sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score
        if (a.is_primary !== b.is_primary) return a.is_primary ? -1 : 1
        if (a.extraction_method === "mercadona_deterministic" && b.extraction_method !== "mercadona_deterministic") {
            return -1
        }
        if (b.extraction_method === "mercadona_deterministic" && a.extraction_method !== "mercadona_deterministic") {
            return 1
        }
        return 0
    })[0]

    const warnings = [...globalWarnings, ...bestCandidate.warnings]
    const finalValidation = bestCandidate.validation

    if (finalValidation?.missing_line_items) {
        addWarning(warnings, {
            code: "MISSING_LINE_ITEMS",
            message: "Line items look incomplete compared to the receipt total.",
        })
    }
    if (finalValidation?.total_mismatch) {
        addWarning(warnings, {
            code: "TOTAL_MISMATCH",
            message: "Line item totals do not match the receipt total.",
        })
    }
    if (finalValidation?.line_item_mismatch_count) {
        addWarning(warnings, {
            code: "LINE_ITEM_MISMATCH",
            message: "Some line items have inconsistent quantity or unit pricing.",
        })
    }

    const usedSecondarySource = !bestCandidate.is_primary && Boolean(secondaryText)
    meta.merchant_detected = bestCandidate.merchant_detected
    meta.extraction_method = bestCandidate.extraction_method
    meta.validation = finalValidation ?? undefined
    meta.repair_attempted = repairAttempted
    meta.repair_used = Boolean(bestCandidate.repair_used || usedSecondarySource)
    if (meta.repair_used) {
        meta.repair_source = bestCandidate.repair_used
            ? "ai"
            : bestCandidate.source === "pdf_ocr"
                ? "ocr"
                : "pdf_text"
    }

    const quality = buildQuality({
        validation: finalValidation,
        warnings,
        pdfMetrics,
        usedOcrForPdf: meta.ocr_used_for_pdf,
    })
    meta.quality = quality.quality
    meta.quality_reasons = quality.reasons

    return {
        extracted: bestCandidate.extracted,
        rawText: bestCandidate.rawText,
        warnings,
        meta,
    }
}

/**
 * Parse an image receipt file.
 */
async function parseImageReceipt(params: ParseReceiptFileParams): Promise<ReceiptParseResult> {
    const warnings: ReceiptParseWarning[] = []
    const meta: ReceiptParseMeta = {
        input_kind: "image",
        merchant_detected: "unknown",
        extraction_method: "ai_only",
        ocr_used: false,
    }

    const finalizeResult = (extracted: ExtractedReceipt | null, rawText: string | null) => {
        const validation = buildReceiptValidation(extracted)

        if (validation?.missing_line_items) {
            addWarning(warnings, {
                code: "MISSING_LINE_ITEMS",
                message: "Line items look incomplete compared to the receipt total.",
            })
        }
        if (validation?.total_mismatch) {
            addWarning(warnings, {
                code: "TOTAL_MISMATCH",
                message: "Line item totals do not match the receipt total.",
            })
        }
        if (validation?.line_item_mismatch_count) {
            addWarning(warnings, {
                code: "LINE_ITEM_MISMATCH",
                message: "Some line items have inconsistent quantity or unit pricing.",
            })
        }

        meta.validation = validation ?? undefined
        const quality = buildQuality({
            validation,
            warnings,
        })
        meta.quality = quality.quality
        meta.quality_reasons = quality.reasons

        return { extracted, rawText, warnings, meta }
    }

    let ocrText: string | null = null

    try {
        const ocrResult = await extractTextFromImage({
            data: params.data,
            mimeType: params.mimeType,
            retryOnLowText: true,
        })
        ocrText = ocrResult.text
        meta.ocr_used = true
        const metrics = ocrResult.metrics ?? analyzeOcrText(ocrText)
        meta.ocr_text = {
            char_count: metrics.charCount,
            line_count: metrics.lineCount,
            low_text_density: metrics.lowTextDensity,
        }
        if (metrics.lowTextDensity) {
            addWarning(warnings, {
                code: "LOW_TEXT_DENSITY",
                message: "OCR text is sparse; results may be incomplete.",
            })
        }
        if (ocrResult.retryUsed) {
            meta.ocr_retry_used = true
            addWarning(warnings, {
                code: "OCR_RETRY_USED",
                message: "OCR was retried to improve low-text scans.",
            })
        }
        console.log(`[Receipt Parser] OCR extracted ${ocrText.length} characters`)
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        console.error("[Receipt Parser] OCR failed:", message)
        addWarning(warnings, {
            code: "OCR_FAILED",
            message: "Could not read the receipt image (OCR failed). Trying AI vision extraction...",
        })

        const aiWarnings: ReceiptParseWarning[] = []
        const aiResult = await tryAiImageFallback(params, aiWarnings)
        if (aiResult) {
            warnings.push(...aiWarnings)
            meta.extraction_method = "ai_only"
            return finalizeResult(aiResult.extracted, aiResult.rawText)
        }

        warnings.push(...aiWarnings)
        return finalizeResult(null, null)
    }

    if (ocrText) {
        const documentKind = detectDocumentKindFromText(ocrText)
        if (documentKind.kind === "statement") {
            addWarning(warnings, {
                code: "NOT_A_RECEIPT",
                message: "This file looks like a bank statement, not a receipt. Please upload it to the Analytics page.",
            })
            return finalizeResult(null, ocrText)
        }
    }

    if (ocrText && mercadonaParser.canParse(ocrText)) {
        meta.merchant_detected = "mercadona"

        const result = tryParseMercadonaFromText({ text: ocrText, source: "ocr" })
        const calculatedTotal = result.extracted?.items?.reduce((sum, item) => {
            const itemTotal = typeof item.total_price === "number" ? item.total_price : 0
            return sum + itemTotal
        }, 0) || 0

        const debugInfo = {
            ocr_text_length: ocrText.length,
            ocr_text_preview: ocrText.substring(0, 500),
            parse_result: {
                ok: result.ok,
                store_name: result.extracted?.store_name,
                date: result.extracted?.receipt_date_iso,
                total: typeof result.extracted?.total_amount === "number" ? result.extracted.total_amount : null,
                calculated_total: Number(calculatedTotal.toFixed(2)),
                item_count: result.extracted?.items?.length || 0,
            },
        }
        meta.debug = debugInfo
        console.log("[Receipt Parser] Mercadona OCR parse result:", debugInfo.parse_result)

        if (result.ok && result.extracted) {
            meta.extraction_method = "mercadona_deterministic"
            console.log("[Receipt Parser] Mercadona image parsed deterministically via OCR")

            let extracted = result.extracted
            let rawText = result.rawText
            let validation = buildReceiptValidation(extracted)
            let score = scoreValidation(validation)
            let repairUsed = false

            if (needsRepair(validation) && params.aiExtractFromImageDataUrl) {
                meta.repair_attempted = true
                const aiWarnings: ReceiptParseWarning[] = []
                const aiResult = await tryAiImageFallback(params, aiWarnings)
                if (aiWarnings.length > 0) {
                    warnings.push(...aiWarnings)
                }
                if (aiResult) {
                    const aiValidation = buildReceiptValidation(aiResult.extracted)
                    const aiScore = scoreValidation(aiValidation)
                    if (aiScore > score) {
                        extracted = aiResult.extracted
                        rawText = aiResult.rawText
                        meta.extraction_method = "ai_fallback"
                        validation = aiValidation
                        score = aiScore
                        repairUsed = true
                    }
                }
            }

            meta.repair_used = repairUsed
            if (repairUsed) {
                meta.repair_source = "ai"
            }
            return finalizeResult(extracted, rawText)
        }

        addWarning(warnings, {
            code: "MERCADONA_DETERMINISTIC_FAILED",
            message: "Mercadona parser could not extract all required fields from the image. Trying AI vision extraction...",
        })
        console.log("[Receipt Parser] Mercadona OCR deterministic failed, trying AI vision fallback")

        const aiWarnings: ReceiptParseWarning[] = []
        const aiResult = await tryAiImageFallback(params, aiWarnings)
        if (aiResult) {
            warnings.push(...aiWarnings)
            meta.extraction_method = "ai_fallback"
            return finalizeResult(aiResult.extracted, aiResult.rawText)
        }

        warnings.push(...aiWarnings)
        addWarning(warnings, {
            code: "AI_FAILED",
            message: `Could not extract receipt data. For Mercadona receipts, you can download the PDF receipt from: ${MERCADONA_PORTAL_URL}`,
        })
        return finalizeResult(null, ocrText)
    }

    console.log("[Receipt Parser] Unknown merchant from OCR, using AI vision extraction")
    const aiWarnings: ReceiptParseWarning[] = []
    const aiResult = await tryAiImageFallback(params, aiWarnings)

    if (aiResult) {
        warnings.push(...aiWarnings)
        meta.extraction_method = "ai_only"
        return finalizeResult(aiResult.extracted, aiResult.rawText)
    }

    warnings.push(...aiWarnings)
    return finalizeResult(null, ocrText)
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
