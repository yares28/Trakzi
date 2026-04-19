/**
 * Returns the ISO Monday (week start) for a given date string "YYYY-MM-DD".
 * ISO week: Monday = day 1, Sunday = day 7.
 */
export function getIsoWeekStart(dateStr: string): string {
  const d = new Date(dateStr.split("T")[0] + "T00:00:00")
  const day = d.getDay() // 0 = Sun, 1 = Mon … 6 = Sat
  const diff = day === 0 ? -6 : 1 - day // shift back to Monday
  d.setDate(d.getDate() + diff)
  // Return as YYYY-MM-DD in local time
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, "0")
  const dd = String(d.getDate()).padStart(2, "0")
  return `${yyyy}-${mm}-${dd}`
}

export interface WeeklyNetPoint {
  /** Monday of the week, formatted YYYY-MM-DD */
  date: string
  /** Sum of all transaction amounts for that week (income positive, expenses negative) */
  net: number
}

/**
 * Groups transactions by ISO week and returns net (income − expenses) per week.
 * Respects the same category visibility as the Basic view.
 */
export function computeWeeklyNet(
  transactions: Array<{ date: string; amount: number; category?: string | null }>,
  hiddenCategorySet: Set<string>,
  normalizeCategoryName: (cat: string) => string,
): WeeklyNetPoint[] {
  const filtered =
    hiddenCategorySet.size === 0
      ? transactions
      : transactions.filter((tx) => {
          const cat = normalizeCategoryName(tx.category ?? "")
          return !hiddenCategorySet.has(cat)
        })

  const weekMap = new Map<string, number>()
  for (const tx of filtered) {
    const weekStart = getIsoWeekStart(tx.date.split("T")[0])
    weekMap.set(weekStart, (weekMap.get(weekStart) ?? 0) + tx.amount)
  }

  return Array.from(weekMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    // Rounding applied at output only; mid-accumulation float drift is negligible for typical financial amounts
    .map(([date, net]) => ({ date, net: Math.round(net * 100) / 100 }))
}
