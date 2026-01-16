// lib/ai/posthog-gemini.ts
/**
 * PostHog-wrapped Google Gen AI (Gemini) client
 * 
 * This module provides AI analytics tracking for Gemini LLM calls.
 * It automatically captures $ai_generation events with metrics like:
 * - Model used, latency, token counts, costs
 * - Input/output messages for debugging
 * - Custom properties for filtering in PostHog
 */

import { GoogleGenAI, GenerateContentResponse, Content } from '@google/genai'
import { getPostHogClient } from '@/lib/posthog-server'

// Pricing per 1M tokens (as of 2024 - update as needed)
const GEMINI_PRICING: Record<string, { input: number; output: number }> = {
  'gemini-2.5-flash': { input: 0.075, output: 0.30 },
  'gemini-2.5-pro': { input: 1.25, output: 10.00 },
  'gemini-2.0-flash': { input: 0.10, output: 0.40 },
  'gemini-2.0-flash-lite': { input: 0.075, output: 0.30 },
  'gemini-1.5-flash': { input: 0.075, output: 0.30 },
  'gemini-1.5-pro': { input: 1.25, output: 5.00 },
}

interface PostHogAIOptions {
  /** User distinct ID for PostHog tracking */
  distinctId?: string
  /** Trace ID to group related LLM calls */
  traceId?: string
  /** Custom properties to add to the event */
  properties?: Record<string, any>
  /** PostHog groups for the event */
  groups?: Record<string, string>
  /** Privacy mode - if true, inputs/outputs won't be captured */
  privacyMode?: boolean
}

interface GenerateContentOptions {
  model: string
  contents: string | Content[]
  systemInstruction?: string
  maxOutputTokens?: number
  temperature?: number
  tools?: any[]
  responseMimeType?: string
  posthog?: PostHogAIOptions
}

interface StreamGenerateContentOptions extends GenerateContentOptions {
  onChunk?: (text: string) => void
}

/**
 * Calculate cost in USD based on token usage
 */
function calculateCost(model: string, inputTokens: number, outputTokens: number): number {
  const pricing = GEMINI_PRICING[model] || GEMINI_PRICING['gemini-2.0-flash']
  const inputCost = (inputTokens / 1_000_000) * pricing.input
  const outputCost = (outputTokens / 1_000_000) * pricing.output
  return inputCost + outputCost
}

/**
 * Capture AI generation event to PostHog
 * IMPORTANT: This function awaits the flush to ensure events are sent in serverless environments
 */
async function captureAIGeneration(
  options: {
    model: string
    latencyMs: number
    inputTokens?: number
    outputTokens?: number
    input: any
    outputChoices: any[]
    tools?: any[]
    error?: string
    posthog?: PostHogAIOptions
  }
): Promise<void> {
  const client = getPostHogClient()
  if (!client) {
    console.warn('[PostHog AI] Client not available, skipping event capture')
    return
  }

  const {
    model,
    latencyMs,
    inputTokens = 0,
    outputTokens = 0,
    input,
    outputChoices,
    tools,
    error,
    posthog: posthogOptions
  } = options

  const totalCost = calculateCost(model, inputTokens, outputTokens)

  const eventProperties: Record<string, any> = {
    $ai_provider: 'google',
    $ai_model: model,
    $ai_latency: latencyMs / 1000, // Convert to seconds
    $ai_input_tokens: inputTokens,
    $ai_output_tokens: outputTokens,
    $ai_total_cost_usd: totalCost,
    ...(posthogOptions?.traceId && { $ai_trace_id: posthogOptions.traceId }),
    ...(tools && { $ai_tools: tools }),
    ...(error && { $ai_error: error }),
    ...(posthogOptions?.properties || {})
  }

  // Only capture input/output if privacy mode is not enabled
  if (!posthogOptions?.privacyMode) {
    eventProperties.$ai_input = input
    eventProperties.$ai_output_choices = outputChoices
  }

  try {
    client.capture({
      distinctId: posthogOptions?.distinctId || 'anonymous',
      event: '$ai_generation',
      properties: eventProperties,
      ...(posthogOptions?.groups && { groups: posthogOptions.groups })
    })
    
    // CRITICAL: Flush immediately for serverless environments
    // Without this, the event may not be sent before the function terminates
    await client.flush()
    
    if (process.env.NODE_ENV === 'development') {
      console.debug('[PostHog AI] Event captured and flushed:', {
        model,
        latencyMs,
        inputTokens,
        outputTokens,
        distinctId: posthogOptions?.distinctId || 'anonymous'
      })
    }
  } catch (err) {
    console.error('[PostHog AI] Failed to capture generation event:', err)
  }
}

/**
 * PostHog-wrapped Gemini client
 * 
 * Usage:
 * ```typescript
 * const gemini = new PostHogGeminiClient(process.env.GEMINI_API_KEY!)
 * 
 * const response = await gemini.generateContent({
 *   model: 'gemini-2.0-flash',
 *   contents: 'Tell me a fun fact about hedgehogs',
 *   posthog: {
 *     distinctId: 'user_123',
 *     traceId: 'conversation_abc',
 *     properties: { feature: 'chat' }
 *   }
 * })
 * ```
 */
export class PostHogGeminiClient {
  private client: GoogleGenAI

  constructor(apiKey: string) {
    this.client = new GoogleGenAI({ apiKey })
  }

  /**
   * Generate content with automatic PostHog tracking
   */
  async generateContent(options: GenerateContentOptions): Promise<GenerateContentResponse> {
    const {
      model,
      contents,
      systemInstruction,
      maxOutputTokens,
      temperature,
      tools,
      responseMimeType,
      posthog: posthogOptions
    } = options

    const startTime = Date.now()
    let error: string | undefined

    // Prepare contents array
    const contentArray: Content[] = typeof contents === 'string'
      ? [{ role: 'user', parts: [{ text: contents }] }]
      : contents

    // Build generation config
    const generationConfig: any = {}
    if (maxOutputTokens) generationConfig.maxOutputTokens = maxOutputTokens
    if (temperature !== undefined) generationConfig.temperature = temperature
    if (responseMimeType) generationConfig.responseMimeType = responseMimeType

    try {
      const response = await this.client.models.generateContent({
        model,
        contents: contentArray,
        config: {
          ...(systemInstruction && { systemInstruction }),
          ...generationConfig,
          ...(tools && { tools })
        }
      })

      const latencyMs = Date.now() - startTime

      // Extract usage metadata
      const usageMetadata = response.usageMetadata
      const inputTokens = usageMetadata?.promptTokenCount || 0
      const outputTokens = usageMetadata?.candidatesTokenCount || 0

      // Extract output choices
      const outputChoices = response.candidates?.map(c => ({
        role: 'assistant',
        content: c.content?.parts?.map(p => p.text).join('') || ''
      })) || []

      // Capture to PostHog - await to ensure flush completes in serverless
      await captureAIGeneration({
        model,
        latencyMs,
        inputTokens,
        outputTokens,
        input: contentArray.map(c => ({
          role: c.role,
          content: c.parts?.map(p => ('text' in p ? p.text : '[non-text]')).join('')
        })),
        outputChoices,
        tools,
        posthog: posthogOptions
      })

      return response
    } catch (err: any) {
      error = err.message || 'Unknown error'
      const latencyMs = Date.now() - startTime

      // Capture error event - await to ensure flush completes
      await captureAIGeneration({
        model,
        latencyMs,
        input: typeof contents === 'string' ? [{ role: 'user', content: contents }] : contents,
        outputChoices: [],
        tools,
        error,
        posthog: posthogOptions
      })

      throw err
    }
  }

  /**
   * Generate content with streaming and automatic PostHog tracking
   */
  async generateContentStream(options: StreamGenerateContentOptions): Promise<string> {
    const {
      model,
      contents,
      systemInstruction,
      maxOutputTokens,
      temperature,
      tools,
      onChunk,
      posthog: posthogOptions
    } = options

    const startTime = Date.now()
    let fullText = ''
    let error: string | undefined
    let inputTokens = 0
    let outputTokens = 0

    // Prepare contents array
    const contentArray: Content[] = typeof contents === 'string'
      ? [{ role: 'user', parts: [{ text: contents }] }]
      : contents

    // Build generation config
    const generationConfig: any = {}
    if (maxOutputTokens) generationConfig.maxOutputTokens = maxOutputTokens
    if (temperature !== undefined) generationConfig.temperature = temperature

    try {
      const stream = await this.client.models.generateContentStream({
        model,
        contents: contentArray,
        config: {
          ...(systemInstruction && { systemInstruction }),
          ...generationConfig,
          ...(tools && { tools })
        }
      })

      for await (const chunk of stream) {
        const text = chunk.text || ''
        fullText += text
        
        if (onChunk && text) {
          onChunk(text)
        }

        // Capture token counts from the last chunk
        if (chunk.usageMetadata) {
          inputTokens = chunk.usageMetadata.promptTokenCount || 0
          outputTokens = chunk.usageMetadata.candidatesTokenCount || 0
        }
      }

      const latencyMs = Date.now() - startTime

      // Capture to PostHog - await to ensure flush completes in serverless
      await captureAIGeneration({
        model,
        latencyMs,
        inputTokens,
        outputTokens,
        input: contentArray.map(c => ({
          role: c.role,
          content: c.parts?.map(p => ('text' in p ? p.text : '[non-text]')).join('')
        })),
        outputChoices: [{ role: 'assistant', content: fullText }],
        tools,
        posthog: posthogOptions
      })

      return fullText
    } catch (err: any) {
      error = err.message || 'Unknown error'
      const latencyMs = Date.now() - startTime

      // Capture error event - await to ensure flush completes
      await captureAIGeneration({
        model,
        latencyMs,
        input: typeof contents === 'string' ? [{ role: 'user', content: contents }] : contents,
        outputChoices: [],
        tools,
        error,
        posthog: posthogOptions
      })

      throw err
    }
  }

  /**
   * Get the underlying Google Gen AI client for advanced use cases
   */
  get rawClient(): GoogleGenAI {
    return this.client
  }
}

// Singleton instance
let geminiClient: PostHogGeminiClient | null = null

/**
 * Get or create the PostHog-wrapped Gemini client
 */
export function getGeminiClient(): PostHogGeminiClient | null {
  if (!geminiClient) {
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('[Gemini] API key not configured')
      }
      return null
    }
    geminiClient = new PostHogGeminiClient(apiKey)
  }
  return geminiClient
}
