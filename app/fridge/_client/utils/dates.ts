export function parseIsoDateUtc(dateString: string) {
  return new Date(`${dateString}T00:00:00Z`)
}

export function monthKey(dateString: string) {
  return dateString.slice(0, 7)
}

export function formatMonthLabel(yyyyMm: string, includeYear: boolean) {
  const [y, m] = yyyyMm.split("-")
  const date = new Date(Date.UTC(Number(y), Number(m) - 1, 1))
  const month = date.toLocaleString("en-US", { month: "short" })
  return includeYear ? `${month} '${String(y).slice(-2)}` : month
}
