"use client"

import * as React from "react"

const CURRENCY_STORAGE_KEY = "selected-currency"

// Currency configuration with locale info
export const currencies: Record<string, {
    symbol: string;
    code: string;
    name: string;
    position: "before" | "after";
    locale: string; // Locale for number formatting
}> = {
    USD: { symbol: "$", code: "USD", name: "US Dollar", position: "before", locale: "en-US" },
    EUR: { symbol: "€", code: "EUR", name: "Euro", position: "after", locale: "de-DE" },
    GBP: { symbol: "£", code: "GBP", name: "British Pound", position: "before", locale: "en-GB" },
}

// Detect default currency from browser locale
function detectDefaultCurrency(): string {
    if (typeof window === "undefined") return "USD"

    const locale = navigator.language || "en-US"
    const region = locale.split("-")[1]?.toUpperCase()

    // Map regions to currencies
    const regionToCurrency: Record<string, string> = {
        US: "USD", GB: "GBP",
        // European countries use EUR
        DE: "EUR", FR: "EUR", ES: "EUR", IT: "EUR", NL: "EUR",
        BE: "EUR", AT: "EUR", PT: "EUR", IE: "EUR", FI: "EUR",
        GR: "EUR", LU: "EUR", CY: "EUR", MT: "EUR", SK: "EUR",
        SI: "EUR", EE: "EUR", LV: "EUR", LT: "EUR",
    }

    return regionToCurrency[region] || "USD"
}

interface CurrencyContextType {
    currency: string
    setCurrency: (currency: string) => void
    symbol: string
    formatCurrency: (amount: number, options?: { minimumFractionDigits?: number; maximumFractionDigits?: number; showSign?: boolean }) => string
}

const CurrencyContext = React.createContext<CurrencyContextType | undefined>(undefined)

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
    const [currency, setCurrencyState] = React.useState<string>("USD")
    const [mounted, setMounted] = React.useState(false)

    React.useEffect(() => {
        setMounted(true)
        const savedCurrency = localStorage.getItem(CURRENCY_STORAGE_KEY)
        if (savedCurrency && currencies[savedCurrency]) {
            setCurrencyState(savedCurrency)
        } else {
            // Auto-detect based on locale
            const detected = detectDefaultCurrency()
            setCurrencyState(detected)
        }
    }, [])

    React.useEffect(() => {
        if (mounted) {
            localStorage.setItem(CURRENCY_STORAGE_KEY, currency)
        }
    }, [currency, mounted])

    // Listen for currency changes from settings popover
    React.useEffect(() => {
        const handleCurrencyChange = (event: CustomEvent) => {
            if (event.detail && currencies[event.detail]) {
                setCurrencyState(event.detail)
            }
        }

        window.addEventListener("currencyChanged", handleCurrencyChange as EventListener)
        return () => {
            window.removeEventListener("currencyChanged", handleCurrencyChange as EventListener)
        }
    }, [])

    const setCurrency = React.useCallback((newCurrency: string) => {
        if (currencies[newCurrency]) {
            setCurrencyState(newCurrency)
            localStorage.setItem(CURRENCY_STORAGE_KEY, newCurrency)
            window.dispatchEvent(new CustomEvent("currencyChanged", { detail: newCurrency }))
        }
    }, [])

    const currencyConfig = currencies[currency] || currencies.USD

    const formatCurrency = React.useCallback((
        amount: number,
        options?: { minimumFractionDigits?: number; maximumFractionDigits?: number; showSign?: boolean }
    ): string => {
        const maxDigits = options?.maximumFractionDigits ?? 2
        const minDigits = options?.minimumFractionDigits ?? Math.min(2, maxDigits)
        const showSign = options?.showSign ?? false

        // Use the currency's native locale for formatting
        const absAmount = Math.abs(amount)
        const formatted = absAmount.toLocaleString(currencyConfig.locale, {
            minimumFractionDigits: minDigits,
            maximumFractionDigits: maxDigits,
        })

        // Determine sign prefix
        let sign = ""
        if (showSign) {
            sign = amount >= 0 ? "+" : "-"
        } else if (amount < 0) {
            sign = "-"
        }

        // Position symbol based on currency convention
        if (currencyConfig.position === "after") {
            return `${sign}${formatted}${currencyConfig.symbol}`
        } else {
            return `${sign}${currencyConfig.symbol}${formatted}`
        }
    }, [currencyConfig])

    const value = React.useMemo(() => ({
        currency,
        setCurrency,
        symbol: currencyConfig.symbol,
        formatCurrency,
    }), [currency, setCurrency, currencyConfig.symbol, formatCurrency])

    return (
        <CurrencyContext.Provider value={value}>
            {children}
        </CurrencyContext.Provider>
    )
}

export function useCurrency() {
    const context = React.useContext(CurrencyContext)
    if (context === undefined) {
        // Return USD default for SSR or when used outside provider
        return {
            currency: "USD",
            setCurrency: () => { },
            symbol: "$",
            formatCurrency: (amount: number, options?: { minimumFractionDigits?: number; maximumFractionDigits?: number; showSign?: boolean }) => {
                const maxDigits = options?.maximumFractionDigits ?? 2
                const minDigits = options?.minimumFractionDigits ?? Math.min(2, maxDigits)
                const showSign = options?.showSign ?? false

                const absAmount = Math.abs(amount)
                const formatted = absAmount.toLocaleString("en-US", {
                    minimumFractionDigits: minDigits,
                    maximumFractionDigits: maxDigits,
                })

                let sign = ""
                if (showSign) {
                    sign = amount >= 0 ? "+" : "-"
                } else if (amount < 0) {
                    sign = "-"
                }

                return `${sign}$${formatted}`
            },
        }
    }
    return context
}
