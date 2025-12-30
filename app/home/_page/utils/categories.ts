export const normalizeCategoryName = (value?: string | null) => {
  const trimmed = (value ?? "").trim()
  return trimmed || "Other"
}

export const getSubCategoryLabel = (description?: string) => {
  if (!description) return "Misc"
  const delimiterSplit = description.split(/[-|]/)[0] ?? description
  const trimmed = delimiterSplit.trim()
  return trimmed.length > 24 ? `${trimmed.slice(0, 21)}...` : trimmed || "Misc"
}
