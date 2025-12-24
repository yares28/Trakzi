// lib/security/api-validation.ts
// Zod schemas and validation utilities for API inputs

import { z } from 'zod';

// ============================================================================
// COMMON SCHEMAS
// ============================================================================

export const DateString = z.string().regex(
    /^\d{4}-\d{2}-\d{2}$/,
    'Date must be in YYYY-MM-DD format'
);

export const TimeString = z.string().regex(
    /^\d{2}:\d{2}(:\d{2})?$/,
    'Time must be in HH:MM or HH:MM:SS format'
).optional().nullable();

export const Currency = z.enum(['EUR', 'USD', 'GBP', 'CHF']).default('EUR');

export const PositiveNumber = z.number().positive();
export const NonNegativeNumber = z.number().nonnegative();
export const FiniteNumber = z.number().finite();

// ============================================================================
// TRANSACTION SCHEMAS
// ============================================================================

export const CreateTransactionSchema = z.object({
    date: DateString,
    description: z.string().min(1, 'Description is required').max(500, 'Description too long'),
    amount: FiniteNumber,
    category_id: z.number().int().positive().optional().nullable(),
    statement_id: z.number().int().positive().optional().nullable(),
    currency: Currency.optional(),
});

export const UpdateTransactionSchema = CreateTransactionSchema.partial().extend({
    id: z.number().int().positive(),
});

export const TransactionFilterSchema = z.object({
    filter: z.enum([
        'last7days', 'last30days', 'last3months',
        'last6months', 'lastyear'
    ]).or(z.string().regex(/^\d{4}$/)).optional().nullable(),
    category: z.string().max(100).optional().nullable(),
    // Pagination
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(50),
});

// ============================================================================
// RECEIPT SCHEMAS
// ============================================================================

export const ReceiptItemSchema = z.object({
    description: z.string().min(1).max(500),
    quantity: NonNegativeNumber.default(1),
    price_per_unit: FiniteNumber,
    total_price: FiniteNumber,
    category_id: z.number().int().positive().optional().nullable(),
});

export const ReceiptSchema = z.object({
    store_name: z.string().min(1).max(200).optional().nullable(),
    receipt_date: DateString,
    receipt_time: TimeString,
    total_amount: FiniteNumber,
    currency: Currency,
    items: z.array(ReceiptItemSchema).max(200, 'Too many items'),
});

// ============================================================================
// CATEGORY SCHEMAS
// ============================================================================

export const CreateCategorySchema = z.object({
    name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
    color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Invalid color format').optional(),
    icon: z.string().max(50).optional(),
});

// ============================================================================
// AI REQUEST SCHEMAS
// ============================================================================

export const AIInsightRequestSchema = z.object({
    chartId: z.string().min(1).max(100),
    chartTitle: z.string().max(200),
    chartDescription: z.string().max(500).optional(),
    chartData: z.unknown(), // Validated separately based on chart type
    userContext: z.object({
        totalIncome: z.number().optional(),
        totalExpenses: z.number().optional(),
        transactionCount: z.number().optional(),
    }).optional(),
});

export const AIChatMessageSchema = z.object({
    message: z.string().min(1, 'Message is required').max(2000, 'Message too long'),
    conversationId: z.string().uuid().optional(),
});

// ============================================================================
// VALIDATION HELPER
// ============================================================================

export type ValidationResult<T> =
    | { success: true; data: T }
    | { success: false; error: string; issues: z.ZodIssue[] };

/**
 * Validate input against a Zod schema
 * Returns a structured result instead of throwing
 */
export function validateInput<T>(
    schema: z.ZodSchema<T>,
    input: unknown
): ValidationResult<T> {
    const result = schema.safeParse(input);

    if (result.success) {
        return { success: true, data: result.data };
    }

    // Create user-friendly error message
    const issues = result.error.issues;
    const errorMessage = issues
        .map(issue => `${issue.path.join('.')}: ${issue.message}`)
        .join('; ');

    return {
        success: false,
        error: errorMessage,
        issues,
    };
}

/**
 * Create a 400 Bad Request response for validation errors
 */
export function createValidationErrorResponse(result: { error: string; issues: z.ZodIssue[] }) {
    return new Response(
        JSON.stringify({
            error: 'Validation failed',
            message: result.error,
            details: result.issues.map(i => ({
                field: i.path.join('.'),
                message: i.message,
            })),
        }),
        {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
        }
    );
}
