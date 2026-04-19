/**
 * Compact K/M axis labels that stay distinct for nearby tick values.
 * Avoids `(v/1000).toFixed(0)+"K"` collapsing e.g. 1000 and 1100 both to "1K".
 */

export type CompactAxisBelowThreshold = (value: number) => string

function isWholeMultipleOf(value: number, unit: number): boolean {
  const q = value / unit
  return Math.abs(q - Math.round(q)) < 1e-9
}

/**
 * @param value - Tick value (currency, count, etc.)
 * @param options.belowThreshold - Format when |value| < 1000 (e.g. formatCurrency or plain number)
 */
export function formatCompactAxisMagnitude(
  value: number,
  options: { belowThreshold: CompactAxisBelowThreshold },
): string {
  const abs = Math.abs(value)
  if (abs < 1000) {
    return options.belowThreshold(value)
  }
  if (abs < 1_000_000) {
    const k = value / 1000
    const decimals = isWholeMultipleOf(value, 1000) ? 0 : 1
    return `${k.toFixed(decimals)}K`
  }
  const m = value / 1_000_000
  const decimals = isWholeMultipleOf(value, 1_000_000) ? 0 : 1
  return `${m.toFixed(decimals)}M`
}
