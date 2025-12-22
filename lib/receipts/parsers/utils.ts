/**
 * Utility functions for receipt PDF text parsing.
 * Reusable helpers for date, money, and text normalization.
 */

/**
 * Parse European money format to number.
 * Handles comma as decimal separator and dot as thousand separator.
 * @example parseEuMoneyToNumber("61,36") => 61.36
 * @example parseEuMoneyToNumber("1.234,56") => 1234.56
 * @example parseEuMoneyToNumber("61.36") => 61.36
 */
export function parseEuMoneyToNumber(value: string): number {
    if (!value || typeof value !== "string") return 0

    const trimmed = value.trim()

    // Count dots and commas to determine format
    const dotCount = (trimmed.match(/\./g) || []).length
    const commaCount = (trimmed.match(/,/g) || []).length

    let normalized: string

    if (commaCount === 1 && dotCount === 0) {
        // "61,36" -> European format, comma is decimal
        normalized = trimmed.replace(",", ".")
    } else if (commaCount === 1 && dotCount >= 1) {
        // "1.234,56" -> European format with thousand separator
        normalized = trimmed.replace(/\./g, "").replace(",", ".")
    } else if (dotCount === 1 && commaCount === 0) {
        // "61.36" -> Already US format
        normalized = trimmed
    } else if (commaCount >= 1 && dotCount === 0) {
        // Multiple commas? Take the last one as decimal
        const lastCommaIdx = trimmed.lastIndexOf(",")
        normalized = trimmed.slice(0, lastCommaIdx).replace(/,/g, "") + "." + trimmed.slice(lastCommaIdx + 1)
    } else {
        // Fallback: remove non-numeric except dots, then parse
        normalized = trimmed.replace(/[^0-9.]/g, "")
    }

    const parsed = parseFloat(normalized)
    return Number.isFinite(parsed) ? parsed : 0
}

/**
 * Convert various date formats to ISO YYYY-MM-DD.
 * Supports: DD/MM/YYYY, DD-MM-YYYY, YYYY-MM-DD, YYYY/MM/DD
 */
export function toIsoDateFromAny(input: string): string | null {
    if (!input || typeof input !== "string") return null

    const trimmed = input.trim()

    // Already ISO format: YYYY-MM-DD
    const isoMatch = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/)
    if (isoMatch) {
        const [, year, month, day] = isoMatch
        return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`
    }

    // ISO with slashes: YYYY/MM/DD
    const isoSlashMatch = trimmed.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/)
    if (isoSlashMatch) {
        const [, year, month, day] = isoSlashMatch
        return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`
    }

    // European format: DD/MM/YYYY or DD-MM-YYYY
    const euMatch = trimmed.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/)
    if (euMatch) {
        const [, day, month, year] = euMatch
        return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`
    }

    // Short year European: DD/MM/YY or DD-MM-YY
    const euShortMatch = trimmed.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2})$/)
    if (euShortMatch) {
        const [, day, month, shortYear] = euShortMatch
        const year = parseInt(shortYear, 10) >= 50 ? `19${shortYear}` : `20${shortYear}`
        return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`
    }

    return null
}

/**
 * Convert ISO date to display format DD-MM-YYYY.
 */
export function toDisplayDateDDMMYYYY(iso: string): string | null {
    if (!iso || typeof iso !== "string") return null

    const match = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/)
    if (!match) return null

    const [, year, month, day] = match
    return `${day}-${month}-${year}`
}

/**
 * Normalize time to HH:MM:SS format.
 * Adds :00 for seconds if missing.
 */
export function normalizeTimeToHHMMSS(input: string): string | null {
    if (!input || typeof input !== "string") return null

    const trimmed = input.trim()

    // Already HH:MM:SS
    const fullMatch = trimmed.match(/^(\d{1,2}):(\d{2}):(\d{2})$/)
    if (fullMatch) {
        const [, h, m, s] = fullMatch
        return `${h.padStart(2, "0")}:${m}:${s}`
    }

    // HH:MM only
    const shortMatch = trimmed.match(/^(\d{1,2}):(\d{2})$/)
    if (shortMatch) {
        const [, h, m] = shortMatch
        return `${h.padStart(2, "0")}:${m}:00`
    }

    return null
}

/**
 * Trim and collapse multiple whitespace characters to single spaces.
 */
export function trimAndCollapseSpaces(s: string): string {
    if (!s || typeof s !== "string") return ""
    return s.trim().replace(/\s+/g, " ")
}
