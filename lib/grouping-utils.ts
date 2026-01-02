/**
 * Utilities for grouping transactions and receipt items by description
 */

/**
 * Normalize description for grouping (exact match, case-insensitive)
 */
export function normalizeDescriptionForGrouping(description: string): string {
    return description.trim().toLowerCase()
}

/**
 * Fuzzy normalize description for grouping similar transactions.
 * Strips variable elements like card numbers, amounts, IDs, and common suffixes
 * so that similar transactions from the same merchant are grouped together.
 * 
 * Example: 
 * - "COMPRA UBER * EATS PENDING, AMSTERDAM, TARJETA 5167734667, COMISION 0,00"
 * - "COMPRA UBER *EATS, HELP.UBER.COM, TARJETA 51638301, COMISION 0,00"
 * Both normalize to: "compra uber eats"
 */
export function normalizeDescriptionFuzzy(description: string): string {
    let normalized = description.toLowerCase()

    // Remove common transaction prefixes
    normalized = normalized.replace(/^(compra|pago|transferencia|cargo|abono)\s*/i, '')

    // Remove card numbers (TARJETA XXXXXXXX patterns)
    normalized = normalized.replace(/tarjeta\s*\d+/gi, '')

    // Remove commission amounts (COMISION X,XX or COMISION 0.00)
    normalized = normalized.replace(/,?\s*comisi[oó]n\s*[\d.,]+/gi, '')

    // Remove PENDING suffix
    normalized = normalized.replace(/\s*pending\b/gi, '')

    // Remove URLs and domains
    normalized = normalized.replace(/\b[\w.-]+\.(com|es|org|net|io|eu|co\.uk|de|fr|nl)\b/gi, '')

    // Remove standalone numbers (card numbers, IDs, reference numbers) - but keep numbers attached to words
    normalized = normalized.replace(/\b\d{4,}\b/g, '')

    // Remove currency symbols and amounts
    normalized = normalized.replace(/[€$£]\s*[\d.,]+/g, '')
    normalized = normalized.replace(/[\d.,]+\s*[€$£]/g, '')

    // Normalize asterisks (sometimes used as separators)
    normalized = normalized.replace(/\s*\*\s*/g, ' ')

    // Remove extra punctuation and separators
    normalized = normalized.replace(/[,;:|\-_\/\\]+/g, ' ')

    // Collapse multiple spaces
    normalized = normalized.replace(/\s+/g, ' ')

    // Trim and remove trailing/leading punctuation
    normalized = normalized.trim().replace(/^[,.\s]+|[,.\s]+$/g, '')

    return normalized
}

/**
 * Group items by description using fuzzy matching.
 * Similar transactions (same merchant, different card numbers/IDs) are grouped together.
 */
export function groupItemsByDescription<T extends { description: string; id: number | string }>(
    items: T[]
): Array<{
    key: string
    description: string
    items: T[]
    count: number
}> {
    const groups = new Map<string, T[]>()

    items.forEach((item) => {
        // Use fuzzy normalization to group similar transactions together
        const key = normalizeDescriptionFuzzy(item.description)
        if (!groups.has(key)) {
            groups.set(key, [])
        }
        groups.get(key)!.push(item)
    })

    // Filter to only groups with 2+ items, sorted by count descending
    return Array.from(groups.entries())
        .filter(([_, items]) => items.length >= 2)
        .map(([key, items]) => ({
            key,
            description: items[0].description, // Use original casing from first item
            items,
            count: items.length,
        }))
        .sort((a, b) => b.count - a.count)
}

/**
 * Get the most common value from an array of items
 */
export function getMostCommonValue<T>(items: T[], key: keyof T): string | null {
    const counts = new Map<string, number>()

    items.forEach((item) => {
        const value = String(item[key] || "").trim()
        if (value) {
            counts.set(value, (counts.get(value) || 0) + 1)
        }
    })

    if (counts.size === 0) return null

    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1])[0][0]
}
