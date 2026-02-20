export const KNOWN_DATE_FILTERS = [
  "last7days",
  "last30days",
  "last3months",
  "last6months",
  "lastyear",
  "ytd",
] as const

export type DateFilterType = (typeof KNOWN_DATE_FILTERS)[number] | string

const INVALID_FILTER_VALUES = new Set(["null", "all", "all_time", "undefined"])
const YEAR_FILTER_RE = /^\d{4}$/

export const FALLBACK_DATE_FILTER: DateFilterType = "last6months"

export function isValidDateFilterValue(
  value: string | null | undefined,
): value is DateFilterType {
  if (typeof value !== "string") return false
  const trimmed = value.trim()
  if (!trimmed) return false
  if (INVALID_FILTER_VALUES.has(trimmed)) return false
  return (
    KNOWN_DATE_FILTERS.includes(trimmed as (typeof KNOWN_DATE_FILTERS)[number]) ||
    YEAR_FILTER_RE.test(trimmed)
  )
}

export function normalizeDateFilterValue(
  value: string | null | undefined,
  fallback: DateFilterType = FALLBACK_DATE_FILTER,
): DateFilterType {
  if (!isValidDateFilterValue(value)) return fallback
  return value.trim()
}

/** Approximate number of days in the period for the given filter (for per-day calculations). */
export function getPeriodDaysFromFilter(filter: string | null | undefined): number {
  if (!filter || typeof filter !== "string") return 0
  const f = filter.trim().toLowerCase()
  switch (f) {
    case "last7days":
      return 7
    case "last30days":
      return 30
    case "last3months":
      return 91
    case "last6months":
      return 182
    case "lastyear":
      return 365
    case "ytd": {
      const now = new Date()
      const start = new Date(now.getFullYear(), 0, 1)
      return Math.max(1, Math.ceil((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)))
    }
    default:
      if (YEAR_FILTER_RE.test(f)) {
        const year = parseInt(f, 10)
        return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0) ? 366 : 365
      }
      return 0
  }
}
