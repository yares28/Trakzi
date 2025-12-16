"use client"

import * as React from "react"

const CURRENCY_STORAGE_KEY = "selected-currency"

// Currency configuration
export const currencies: Record<string, { symbol: string; code: string; name: string; position: "before" | "after" }> = {
    USD: { symbol: "$", code: "USD", name: "US Dollar", position: "before" },
    EUR: { symbol: "€", code: "EUR", name: "Euro", position: "before" },
    GBP: { symbol: "£", code: "GBP", name: "British Pound", position: "before" },
    JPY: { symbol: "¥", code: "JPY", name: "Japanese Yen", position: "before" },
    CAD: { symbol: "C$", code: "CAD", name: "Canadian Dollar", position: "before" },
    AUD: { symbol: "A$", code: "AUD", name: "Australian Dollar", position: "before" },
    CHF: { symbol: "Fr", code: "CHF", name: "Swiss Franc", position: "after" },
    CNY: { symbol: "¥", code: "CNY", name: "Chinese Yuan", position: "before" },
}

interface CurrencyContextType {
    currency: string
    setCurrency: (currency: string) => void
    symbol: string
    formatCurrency: (amount: number, options?: { minimumFractionDigits?: number; maximumFractionDigits?: number }) => string
}

const CurrencyContext = React.createContext<CurrencyContextType | undefined>(undefined)

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
    const [currency, setCurrencyState] = React.useState<string>("EUR")
    const [mounted, setMounted] = React.useState(false)

    React.useEffect(() => {
        setMounted(true)
        const savedCurrency = localStorage.getItem(CURRENCY_STORAGE_KEY)
        if (savedCurrency && currencies[savedCurrency]) {
            setCurrencyState(savedCurrency)
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

    const currencyConfig = currencies[currency] || currencies.EUR

    const formatCurrency = React.useCallback((
        amount: number,
        options?: { minimumFractionDigits?: number; maximumFractionDigits?: number; showSign?: boolean }
    ): string => {
        const maxDigits = options?.maximumFractionDigits ?? 2
        const minDigits = options?.minimumFractionDigits ?? Math.min(2, maxDigits)
        const showSign = options?.showSign ?? false

        // Use de-DE locale for European format (comma as decimal separator)
        const absAmount = Math.abs(amount)
        const formatted = absAmount.toLocaleString("de-DE", {
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

        // Always put symbol after for European format (100,34€)
        return `${sign}${formatted}${currencyConfig.symbol}`
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
        // Return a default implementation for SSR or when used outside provider
        return {
            currency: "EUR",
            setCurrency: () => { },
            symbol: "€",
            formatCurrency: (amount: number, options?: { minimumFractionDigits?: number; maximumFractionDigits?: number; showSign?: boolean }) => {
                const maxDigits = options?.maximumFractionDigits ?? 2
                const minDigits = options?.minimumFractionDigits ?? Math.min(2, maxDigits)
                const showSign = options?.showSign ?? false

                const absAmount = Math.abs(amount)
                const formatted = absAmount.toLocaleString("de-DE", {
                    minimumFractionDigits: minDigits,
                    maximumFractionDigits: maxDigits,
                })

                let sign = ""
                if (showSign) {
                    sign = amount >= 0 ? "+" : "-"
                } else if (amount < 0) {
                    sign = "-"
                }

                return `${sign}${formatted}€`
            },
        }
    }
    return context
}
