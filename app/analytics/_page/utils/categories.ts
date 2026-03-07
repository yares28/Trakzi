export const normalizeCategoryName = (value?: string | null) => {
  const trimmed = (value ?? "").trim()
  return trimmed || "Other"
}

export const getDefaultRingLimit = (filter: string | null, isDemoMode = false): number => {
  // All time (no filter), specific year (e.g. "2024"), or last year use a higher default
  const isYearLike = !filter || filter === "lastyear" || /^\d{4}$/.test(filter)
  const base = isYearLike ? 5000 : 2000
  // Demo mode uses higher limits so rings show variation instead of all at 100%
  return isDemoMode ? base * 3 : base
}
