// lib/security/input-sanitizer.ts
// Input sanitization utilities for security

/**
 * Sanitize text that will be sent to AI/LLM to prevent prompt injection
 * Removes or escapes patterns that could be used to manipulate AI behavior
 */
export function sanitizeForAI(text: string, maxLength: number = 500): string {
    if (!text || typeof text !== 'string') {
        return '';
    }

    return text
        // Remove potential instruction injections
        .replace(/ignore\s+(all|previous|prior|above)\s+(instructions?|prompts?|context)/gi, '[filtered]')
        .replace(/disregard\s+(all|previous|prior|above)/gi, '[filtered]')
        .replace(/you\s+are\s+now/gi, '[filtered]')
        .replace(/new\s+instructions?:/gi, '[filtered]')
        .replace(/system\s*prompt/gi, '[filtered]')
        .replace(/\[INST\]/gi, '[filtered]')
        .replace(/\[\/INST\]/gi, '[filtered]')
        .replace(/<\|.*?\|>/g, '[filtered]') // Common LLM tokens
        // Remove script-like content
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/javascript:/gi, '')
        // Limit length
        .substring(0, maxLength)
        .trim();
}

/**
 * Sanitize HTML to prevent XSS
 * For display purposes - strips all HTML tags
 */
export function sanitizeHtml(text: string): string {
    if (!text || typeof text !== 'string') {
        return '';
    }

    return text
        // Remove all HTML tags
        .replace(/<[^>]*>/g, '')
        // Escape remaining special characters
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .trim();
}

/**
 * Sanitize a string for safe logging (remove sensitive data patterns)
 */
export function sanitizeForLogging(text: string): string {
    if (!text || typeof text !== 'string') {
        return '';
    }

    return text
        // Mask potential credit card numbers
        .replace(/\b\d{13,19}\b/g, '[CARD_NUMBER]')
        // Mask potential SSN/NIF patterns
        .replace(/\b\d{3}[-\s]?\d{2}[-\s]?\d{4}\b/g, '[SSN]')
        // Mask email addresses partially
        .replace(/([a-zA-Z0-9._-]+)@([a-zA-Z0-9._-]+\.[a-zA-Z]{2,})/g,
            (_, local, domain) => `${local.substring(0, 2)}***@${domain}`)
        // Mask potential API keys
        .replace(/\b(sk_|pk_|api_|key_)[a-zA-Z0-9]{20,}\b/gi, '[API_KEY]')
        .substring(0, 1000);
}

/**
 * Validate and sanitize file names
 */
export function sanitizeFileName(filename: string): string {
    if (!filename || typeof filename !== 'string') {
        return 'unnamed';
    }

    return filename
        // Remove path traversal attempts
        .replace(/\.\./g, '')
        .replace(/[/\\]/g, '_')
        // Keep only safe characters
        .replace(/[^a-zA-Z0-9._-]/g, '_')
        // Limit length
        .substring(0, 255)
        || 'unnamed';
}

/**
 * Normalize and validate transaction description for categorization
 */
export function normalizeTransactionDescription(description: string): string {
    if (!description || typeof description !== 'string') {
        return '';
    }

    return description
        // Normalize whitespace
        .replace(/\s+/g, ' ')
        // Remove control characters
        .replace(/[\x00-\x1F\x7F]/g, '')
        // Limit length
        .substring(0, 500)
        .trim();
}
