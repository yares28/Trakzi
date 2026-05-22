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

export const getSubCategoryLabel = (description?: string) => {
  if (!description) return "Misc"
  const delimiterSplit = description.split(/[-|]/)[0] ?? description
  const trimmed = delimiterSplit.trim()
  return trimmed.length > 24 ? `${trimmed.slice(0, 21)}...` : trimmed || "Misc"
}
