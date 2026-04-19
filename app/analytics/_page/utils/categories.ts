export const normalizeCategoryName = (value?: string | null) => {
  const trimmed = (value ?? "").trim()
  return trimmed || "Other"
}

export const getSuggestedDemoRingLimit = (spent: number): number | null => {
  if (spent <= 0) return null

  const headroomMultiplier =
    spent < 500 ? 1.6 :
    spent < 1500 ? 1.35 :
    spent < 4000 ? 1.25 :
    1.2

  const suggested = spent * headroomMultiplier
  const roundingStep =
    suggested < 1000 ? 100 :
    suggested < 3000 ? 250 :
    suggested < 10000 ? 500 :
    1000

  return Math.max(roundingStep, Math.ceil(suggested / roundingStep) * roundingStep)
}

export const getDefaultRingLimit = (filter: string | null, isDemoMode = false): number => {
  // All time (no filter), specific year (e.g. "2024"), or last year use a higher default
  const isYearLike = !filter || filter === "lastyear" || /^\d{4}$/.test(filter)
  const base = isYearLike ? 5000 : 2000
  // Demo mode needs more headroom so the sample data shows ring variation instead of saturation.
  return isDemoMode ? base * 4 : base
}
