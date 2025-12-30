export function normalizeCategoryName(value: string | null | undefined) {
  const trimmed = (value ?? "").trim()
  return trimmed || "Other"
}

export function normalizeMerchantName(value: string | null | undefined) {
  const raw = (value ?? "").trim()
  if (!raw) return "Unknown"

  const cleaned = raw
    .replace(/^PAYPAL\s+\*/i, "")
    .replace(/^CARD\s+PURCHASE\s*-\s*/i, "")
    .replace(/^POS\s+/i, "")
    .replace(/^DEBIT\s+/i, "")
    .replace(/[\d]{2,}$/g, "")
    .replace(/\s+/g, " ")
    .trim()

  const tokens = cleaned.split(" ").filter(Boolean)
  const compact = tokens.slice(0, 3).join(" ")
  return compact || "Unknown"
}
