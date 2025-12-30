export function formatNumber(num: number): string {
  if (Math.abs(num) >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`
  }
  if (Math.abs(num) >= 1000) {
    return `${(num / 1000).toFixed(1)}K`
  }
  return num.toString()
}

export function formatCurrency(num: number): string {
  const formatted = Math.abs(num) >= 1000
    ? `$${(Math.abs(num) / 1000).toFixed(1)}K`
    : `$${Math.abs(num).toFixed(0)}`
  return num < 0 ? `-${formatted}` : formatted
}
