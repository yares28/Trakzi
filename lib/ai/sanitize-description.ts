// lib/ai/sanitize-description.ts

/**
 * Sanitizes transaction description by removing sensitive information
 * before sending to AI or processing.
 * 
 * Masks:
 * - Card numbers (e.g., *1234, CARD 1234)
 * - IBAN-like sequences
 * - Phone numbers
 * - Authorization codes
 * - Long numeric references
 * 
 * @param raw - Raw transaction description from bank
 * @returns Sanitized description safe for AI processing
 */
export function sanitizeDescription(raw: string): string {
    if (!raw) return "";

    let sanitized = raw;

    // 1. Mask card numbers and PAN sequences
    // Patterns: "TARJ*1234", "CARD 1234", "**** 1234", etc.
    sanitized = sanitized.replace(/\b(TARJ|CARD|CARTE|TARJETA)\s*\*?\d{4}\b/gi, "CARD");
    sanitized = sanitized.replace(/\*{4}\s*\d{4}\b/g, "CARD");
    sanitized = sanitized.replace(/\d{4}\s*\*{4}/g, "CARD");
    sanitized = sanitized.replace(/\b\d{4}\s+\d{4}\s+\d{4}\s+\d{4}\b/g, "CARD"); // Full card numbers

    // 2. Mask IBAN-like sequences (2 letters + 20+ digits/letters)
    sanitized = sanitized.replace(/\b[A-Z]{2}\d{2}[A-Z0-9]{16,}\b/gi, "IBAN");

    // 3. Mask phone numbers
    // Patterns: +34 123 456 789, 123-456-7890, etc.
    sanitized = sanitized.replace(/\+?\d{1,3}[\s.-]?\(?\d{2,4}\)?[\s.-]?\d{3,4}[\s.-]?\d{3,4}/g, "PHONE");

    // 4. Mask authorization codes (AUTH, AUTORIZACION, etc. followed by alphanumeric)
    sanitized = sanitized.replace(/\b(AUTH|AUTORIZACION|AUTHORIZATION|AUT|AUTN?)\s*[:.]?\s*[A-Z0-9]{6,}\b/gi, "AUTH");

    // 5. Mask long numeric sequences (likely transaction IDs, references)
    sanitized = sanitized.replace(/\b\d{12,}\b/g, "REF");

    // 6. Mask reference numbers with REF: prefix
    sanitized = sanitized.replace(/\bREF\s*[:.]?\s*\d{8,}\b/gi, "REF");

    // 7. Clean up multiple spaces
    sanitized = sanitized.replace(/\s+/g, " ").trim();

    return sanitized;
}

/**
 * Extracts merchant keywords and meaningful tokens after sanitization
 * Filters out common banking noise words and payment method keywords
 * 
 * @param sanitized - Sanitized description
 * @returns Array of merchant token keywords
 */
export function extractMerchantTokens(sanitized: string): string[] {
    if (!sanitized) return [];

    // Convert to uppercase for pattern matching
    const upper = sanitized.toUpperCase();

    // Split by common separators
    const tokens = upper.split(/[\s\-_\/\\,;:|]+/).filter(Boolean);

    // Filter out noise tokens (banking keywords, payment methods, placeholders)
    const noise = new Set([
        // Spanish banking keywords
        "COMPRA", "PAGO", "PAYMENT", "PURCHASE", "ACHAT",
        "RECIBO", "CARGO", "ABONO", "INGRESO",
        "TRANSFERENCIA", "BIZUM", "TRANSFER",
        // Prepositions and articles
        "EN", "IN", "AT", "DE", "DEL", "LA", "EL", "A", "FROM", "TO",
        // Web/URL keywords
        "WWW", "HTTP", "HTTPS", "COM", "ES", "NET", "ORG",
        // Payment method keywords
        "TPV", "POS", "ONLINE", "WEB",
        // Our sanitization placeholders
        "CARD", "IBAN", "PHONE", "AUTH", "REF",
    ]);

    // Filter: keep tokens >= 3 chars and not in noise set
    return tokens.filter(token => !noise.has(token) && token.length >= 3);
}
