const ISO_DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/

export function parseIsoDateOnlyToUtcDate(dateString: string): Date | null {
  if (!ISO_DATE_ONLY_RE.test(dateString)) return null

  const [yearRaw, monthRaw, dayRaw] = dateString.split("-")
  const year = Number(yearRaw)
  const month = Number(monthRaw)
  const day = Number(dayRaw)

  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null
  if (month < 1 || month > 12) return null
  if (day < 1 || day > 31) return null

  const date = new Date(Date.UTC(year, month - 1, day))
  if (Number.isNaN(date.getTime())) return null

  // Reject impossible calendar dates like 2025-02-30.
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null
  }

  return date
}

export function formatDateForDisplay(
  input: string | Date | null | undefined,
  locales: Intl.LocalesArgument = "en-US",
  options: Intl.DateTimeFormatOptions = { year: "numeric", month: "short", day: "numeric" }
): string {
  if (!input) return ""

  if (input instanceof Date) {
    if (Number.isNaN(input.getTime())) return ""
    return input.toLocaleDateString(locales, options)
  }

  if (typeof input !== "string") return ""

  const trimmed = input.trim()
  if (!trimmed) return ""

  const isoDateOnly = ISO_DATE_ONLY_RE.test(trimmed)
  const parsed = isoDateOnly ? parseIsoDateOnlyToUtcDate(trimmed) : new Date(trimmed)

  if (!parsed || Number.isNaN(parsed.getTime())) return trimmed

  const finalOptions = isoDateOnly ? { ...options, timeZone: options.timeZone ?? "UTC" } : options
  return parsed.toLocaleDateString(locales, finalOptions)
}

