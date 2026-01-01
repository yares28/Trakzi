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
 * Group items by description
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
        const key = normalizeDescriptionForGrouping(item.description)
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
