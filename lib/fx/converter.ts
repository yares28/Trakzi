// lib/fx/converter.ts
// FX conversion using Frankfurter (https://api.frankfurter.app) — free, no API key, ECB data.
//
// Usage pattern in import routes:
//   const rates = await fetchRatesForBase("EUR", ["USD", "GBP"])
//   const eurAmount = convertWithRates(100, "USD", "EUR", rates) // → ~92.59

const FRANKFURTER_URL = "https://api.frankfurter.app/latest"

/**
 * Fetches exchange rates with baseCurrency as the reference (1 unit of base).
 * Returns a map of { [symbol]: rate } where rate is how many `symbol` units equal 1 `baseCurrency`.
 *
 * e.g. fetchRatesForBase("EUR", ["USD", "GBP"]) → { USD: 1.08, GBP: 0.85 }
 * meaning 1 EUR = 1.08 USD = 0.85 GBP
 *
 * Uses Next.js fetch caching (revalidate 1 h) so the same base+symbols combo
 * within an hour hits the edge cache, not the Frankfurter server.
 */
export async function fetchRatesForBase(
    baseCurrency: string,
    symbols: string[]
): Promise<Record<string, number>> {
    const unique = [...new Set(symbols.map(s => s.toUpperCase()))].filter(
        s => s !== baseCurrency.toUpperCase() && /^[A-Z]{3}$/.test(s)
    )
    if (unique.length === 0) return {}

    const url = `${FRANKFURTER_URL}?base=${baseCurrency.toUpperCase()}&symbols=${unique.join(",")}`

    const res = await fetch(url, {
        next: { revalidate: 3600 },
    })

    if (!res.ok) {
        throw new Error(
            `FX rate fetch failed (${res.status}). Check that all currency codes are valid ISO 4217.`
        )
    }

    const data = await res.json() as { base: string; date: string; rates: Record<string, number> }
    return data.rates ?? {}
}

/**
 * Converts `amount` from `fromCurrency` to `targetCurrency` using pre-fetched rates
 * where the rates object was fetched with base = targetCurrency.
 *
 * Formula: amount_in_target = amount_in_from / rates[fromCurrency]
 * (because rates[fromCurrency] = how many fromCurrency units per 1 targetCurrency unit)
 *
 * Returns the original amount unchanged if currencies match or rate is unavailable.
 */
export function convertWithRates(
    amount: number,
    fromCurrency: string,
    targetCurrency: string,
    ratesBaseTarget: Record<string, number>
): number {
    const from = fromCurrency.toUpperCase()
    const to = targetCurrency.toUpperCase()
    if (from === to) return amount

    const rate = ratesBaseTarget[from]
    if (!rate || rate === 0) {
        throw new Error(`No FX rate available for ${from} → ${to}. Ensure the currency code is valid.`)
    }

    // Round to 2 decimal places to avoid floating-point noise in financial amounts
    return Math.round((amount / rate) * 100) / 100
}
