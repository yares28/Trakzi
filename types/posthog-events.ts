/**
 * TypeScript type definitions for PostHog events
 * 
 * This provides type safety for event names and their properties
 */

export interface PostHogEventProperties {
  // Dashboard Events
  'dashboard_card_viewed': {
    card_name: string
    card_key: string
    card_score?: number
    card_href: string
  }
  
  'quick_ai_prompt_clicked': {
    prompt_type: 'monthly_summary' | 'top_expenses' | 'seasonal_patterns' | 'year_over_year'
    prompt_text: string
  }

  // Analytics/File Import Events
  'file_import_started': {
    file_name: string
    file_size: number
    file_type: string
  }

  'file_import_completed': {
    file_name: string
    file_size: number
    file_type: string
  }

  'file_import_failed': {
    file_name: string
    file_size: number
    file_type: string
    error_message?: string
    stage?: 'parsing' | 'upload' | 'processing'
  }

  'budget_limit_set': {
    category_name: string
    budget_amount: number
    date_filter: string
  }

  // Data Library Events
  'category_created': {
    category_name: string
    category_tier: string
  }

  'statement_deleted': {
    statement_name: string
    statement_type: string
    is_receipt: boolean
  }

  'transaction_category_changed': {
    previous_category: string
    new_category: string
    transaction_type: 'receipt' | 'statement'
  }

  // Pricing/Checkout Events
  'pricing_plan_clicked': {
    plan_name: string
    billing_period: 'monthly' | 'annual'
    price: string | number
    is_popular?: boolean
    is_signed_in: boolean
  }

  'checkout_started': {
    plan_name: string
    billing_period: 'monthly' | 'annual'
    price_id: string
    price: string | number
  }

  'checkout_redirect': {
    plan_name: string
    billing_period: 'monthly' | 'annual'
  }

  'checkout_error': {
    plan_name: string
    error: string
    status?: number
  }

  'billing_period_toggled': {
    billing_period: 'monthly' | 'annual'
    previous_period: 'monthly' | 'annual'
  }

  'checkout_completed': {
    plan_name: string
    billing_period: string
  }

  'checkout_canceled': {
    plan_name: string
  }

  'subscription_updated': Record<string, never>

  // Chat Events
  'ai_chat_message_sent': {
    message_length: number
    message_word_count: number
    is_first_message: boolean
  }
}

/**
 * Type-safe PostHog event capture function
 * 
 * @example
 * ```typescript
 * typedCapture('pricing_plan_clicked', {
 *   plan_name: 'Pro',
 *   billing_period: 'annual',
 *   price: 99,
 *   is_signed_in: true
 * })
 * ```
 */
export type PostHogEventName = keyof PostHogEventProperties

/**
 * Type-safe wrapper for safeCapture with event property validation
 * 
 * Import this function to get TypeScript autocomplete and type checking
 * for PostHog events and their properties.
 */
export function typedCapture<K extends PostHogEventName>(
  event: K,
  properties: PostHogEventProperties[K]
): boolean {
  // Dynamic import to avoid circular dependencies
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { safeCapture } = require('../lib/posthog-safe')
  return safeCapture(event, properties)
}

