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

export const FALLBACK_DATE_FILTER: DateFilterType = "ytd"

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
