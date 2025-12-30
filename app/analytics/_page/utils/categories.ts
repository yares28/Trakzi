export const normalizeCategoryName = (value?: string | null) => {
  const trimmed = (value ?? "").trim()
  return trimmed || "Other"
}

export const getDefaultRingLimit = (filter: string | null): number => {
  // All time (no filter), specific year (e.g. "2024"), or last year use a higher default
  const isYearLike = !filter || filter === "lastyear" || /^\d{4}$/.test(filter)
  return isYearLike ? 5000 : 2000
}
