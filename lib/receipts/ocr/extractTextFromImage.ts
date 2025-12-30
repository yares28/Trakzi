/**
 * =============================================================================
 * OCR TEXT EXTRACTION UTILITY
 * =============================================================================
 * 
 * Generic OCR for extracting text from receipt images.
 * Uses OpenRouter's NVIDIA Nemotron Nano 12B VL model for vision-based OCR.
 * 
 * Environment variables:
 * - OPENROUTER_API_KEY: API key for OpenRouter (existing key, no new setup needed)
 * 
 * This module is merchant-agnostic. Merchant-specific OCR normalization
 * belongs in the respective parser files (e.g., mercadona.ts).
 * =============================================================================
 */

import { getSiteUrl, getSiteName } from "@/lib/env"
import { preprocessReceiptImage, type PreprocessReceiptImageResult } from "./preprocessReceiptImage"

export interface OcrResult {
    text: string
    confidence?: number
    metrics?: {
        charCount: number
        lineCount: number
        lowTextDensity: boolean
    }
    preprocess?: PreprocessReceiptImageResult["meta"]
    retryUsed?: boolean
}

export interface OcrProvider {
    extractText(data: Buffer | Uint8Array, mimeType: string, promptOverride?: string): Promise<OcrResult>
}

// OpenRouter model for OCR
const OCR_MODEL = "nvidia/nemotron-nano-12b-v2-vl:free"
const MIN_OCR_TEXT_CHARS = 80
const MIN_OCR_TEXT_LINES = 4

const DEFAULT_OCR_PROMPT = `Extract ALL text from this receipt image exactly as it appears. 
Include every line, number, and character you can see.
Preserve the original layout and line breaks.
Do not summarize or interpret - just transcribe the raw text.
If you cannot read something clearly, use [?] to mark uncertain characters.

Return ONLY the extracted text, nothing else.`

const LOW_DENSITY_OCR_PROMPT = `The receipt text is faint, skewed, or low-contrast.
Carefully extract ALL text, including item lines, quantities, unit prices, totals, and headers.
Preserve line breaks and columns; do not summarize or interpret.
Use [?] for any uncertain characters.

Return ONLY the extracted text, nothing else.`

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

/**
 * OpenRouter NVIDIA Nemotron VL OCR implementation.
 * Uses the multimodal vision-language model to extract text from images.
 */
class OpenRouterNemotronOcrProvider implements OcrProvider {
    private apiKey: string

    constructor(apiKey: string) {
        this.apiKey = apiKey
    }

    async extractText(
        data: Buffer | Uint8Array,
        mimeType: string,
        promptOverride?: string
    ): Promise<OcrResult> {
        const buffer = data instanceof Buffer ? data : Buffer.from(data)
        const base64Image = buffer.toString("base64")
        const base64DataUrl = `data:${mimeType};base64,${base64Image}`

        const siteUrl = getSiteUrl()
        const siteName = getSiteName()
        const prompt = promptOverride || DEFAULT_OCR_PROMPT

        // First API call with reasoning enabled for better OCR accuracy
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${this.apiKey}`,
                "HTTP-Referer": siteUrl,
                "X-Title": siteName,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                model: OCR_MODEL,
                messages: [
                    {
                        role: "user",
                        content: [
                            {
                                type: "text",
                                text: prompt,
                            },
                            {
                                type: "image_url",
                                image_url: { url: base64DataUrl },
                            },
                        ],
                    },
                ],
                reasoning: { enabled: true },
                temperature: 0,
                max_tokens: 2000,
            }),
        })

        if (!response.ok) {
            const errorText = await response.text()
            throw new Error(`OCR_FAILED: OpenRouter API error ${response.status}: ${errorText.substring(0, 200)}`)
        }

        const result = await response.json()

        // Check for API-level errors
        if (result.error) {
            throw new Error(`OCR_FAILED: ${result.error.message || "Unknown OpenRouter error"}`)
        }

        // Extract the text content
        const assistantMessage = result.choices?.[0]?.message
        if (!assistantMessage) {
            throw new Error("OCR_FAILED: No response from OCR model")
        }

        const text = assistantMessage.content?.trim() || ""

        if (!text || text.length < 10) {
            throw new Error("OCR_FAILED: No text detected in image")
        }

        // Log OCR output for debugging
        console.log("[OCR] Extracted text length:", text.length)
        console.log("[OCR] First 500 chars:", text.substring(0, 500))

        return { text, confidence: undefined }
    }
}

/**
 * Get the configured OCR provider.
 * Uses OpenRouter with NVIDIA Nemotron VL model.
 * Throws if OPENROUTER_API_KEY is not configured.
 */
function getOcrProvider(): OcrProvider {
    const apiKey = process.env.OPENROUTER_API_KEY

    if (apiKey) {
        return new OpenRouterNemotronOcrProvider(apiKey)
    }

    throw new Error(
        "OCR_FAILED: OCR not configured. Please set OPENROUTER_API_KEY environment variable."
    )
}

/**
 * Extract text from an image using OCR.
 * 
 * @param params.data - Image data as Uint8Array or Buffer
 * @param params.mimeType - MIME type of the image (e.g., "image/jpeg")
 * @returns OCR result with extracted text and optional confidence score
 * @throws Error with "OCR_FAILED:" prefix on any failure
 */
export async function extractTextFromImage(params: {
    data: Uint8Array | Buffer
    mimeType: string
    promptOverride?: string
    retryOnLowText?: boolean
    retryPromptOverride?: string
    preprocess?: boolean
}): Promise<OcrResult> {
    const { data, mimeType } = params

    // Validate input
    if (!data || data.length === 0) {
        throw new Error("OCR_FAILED: No image data provided")
    }

    const supportedMimeTypes = [
        "image/jpeg",
        "image/png",
        "image/webp",
        "image/gif",
        "image/bmp",
    ]

    const normalizedMimeType = mimeType.toLowerCase()
    if (!supportedMimeTypes.some((t) => normalizedMimeType.startsWith(t.split("/")[0]))) {
        // Allow any image/* type but warn
        console.warn(`[OCR] Potentially unsupported image type: ${mimeType}`)
    }

    try {
        let ocrData: Uint8Array | Buffer = data
        let ocrMimeType = mimeType
        let preprocessMeta: PreprocessReceiptImageResult["meta"] | undefined

        if (params.preprocess !== false) {
            try {
                const preprocessed = await preprocessReceiptImage({
                    data,
                    mimeType,
                })
                ocrData = preprocessed.buffer
                ocrMimeType = preprocessed.mimeType
                preprocessMeta = preprocessed.meta
            } catch (error) {
                const message = error instanceof Error ? error.message : String(error)
                console.warn("[OCR] Preprocess failed, using original image:", message)
            }
        }

        const provider = getOcrProvider()
        const primaryResult = await provider.extractText(ocrData, ocrMimeType, params.promptOverride)
        let metrics = analyzeOcrText(primaryResult.text)
        let retryUsed = false
        let finalResult = primaryResult

        if (params.retryOnLowText && metrics.lowTextDensity) {
            const retryPrompt = params.retryPromptOverride || LOW_DENSITY_OCR_PROMPT
            const retryResult = await provider.extractText(ocrData, ocrMimeType, retryPrompt)
            const retryMetrics = analyzeOcrText(retryResult.text)

            if (retryMetrics.charCount > metrics.charCount) {
                finalResult = retryResult
                metrics = retryMetrics
                retryUsed = true
            }
        }

        return {
            text: finalResult.text,
            confidence: finalResult.confidence,
            metrics,
            preprocess: preprocessMeta,
            retryUsed,
        }
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        // Ensure all errors have OCR_FAILED prefix for proper handling
        if (message.startsWith("OCR_FAILED:")) {
            throw error
        }
        throw new Error(`OCR_FAILED: ${message}`)
    }
}
