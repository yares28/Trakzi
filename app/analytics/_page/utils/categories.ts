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

/**
 * Default ring limit for unbudgeted categories.
 *
 * Real users: returns null — we don't invent budgets the user didn't set.
 * Unbudgeted rings render as "no cap" and the Spending Activity Rings chart
 * stays in lockstep with what's actually in `category_budgets`.
 *
 * Demo mode: keeps the synthetic fallback so demo data shows ring variation
 * instead of empty rings.
 */
export const getDefaultRingLimit = (filter: string | null, isDemoMode = false): number | null => {
  if (!isDemoMode) return null
  const isYearLike = !filter || filter === "lastyear" || /^\d{4}$/.test(filter)
  const base = isYearLike ? 5000 : 2000
  return base * 4
}
