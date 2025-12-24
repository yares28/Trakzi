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

export interface OcrResult {
    text: string
    confidence?: number
}

export interface OcrProvider {
    extractText(data: Buffer | Uint8Array, mimeType: string): Promise<OcrResult>
}

// OpenRouter model for OCR
const OCR_MODEL = "nvidia/nemotron-nano-12b-v2-vl:free"

/**
 * OpenRouter NVIDIA Nemotron VL OCR implementation.
 * Uses the multimodal vision-language model to extract text from images.
 */
class OpenRouterNemotronOcrProvider implements OcrProvider {
    private apiKey: string

    constructor(apiKey: string) {
        this.apiKey = apiKey
    }

    async extractText(data: Buffer | Uint8Array, mimeType: string): Promise<OcrResult> {
        const buffer = data instanceof Buffer ? data : Buffer.from(data)
        const base64Image = buffer.toString("base64")
        const base64DataUrl = `data:${mimeType};base64,${base64Image}`

        const siteUrl = getSiteUrl()
        const siteName = getSiteName()

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
                                text: `Extract ALL text from this receipt image exactly as it appears. 
Include every line, number, and character you can see.
Preserve the original layout and line breaks.
Do not summarize or interpret - just transcribe the raw text.
If you cannot read something clearly, use [?] to mark uncertain characters.

Return ONLY the extracted text, nothing else.`,
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
        const provider = getOcrProvider()
        return await provider.extractText(data, mimeType)
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        // Ensure all errors have OCR_FAILED prefix for proper handling
        if (message.startsWith("OCR_FAILED:")) {
            throw error
        }
        throw new Error(`OCR_FAILED: ${message}`)
    }
}
