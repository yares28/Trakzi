"use client"

import * as React from "react"
import { useUserPreferences } from "@/components/user-preferences-provider"

const CURRENCY_STORAGE_KEY = "selected-currency"
const COMPACT_NUMBERS_STORAGE_KEY = "compact-numbers"

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

// Abbreviate a number: 42616.68 → "42.6K", 1234567 → "1.2M"
function abbreviateNumber(num: number): string {
    const abs = Math.abs(num)
    if (abs >= 1_000_000) return `${(abs / 1_000_000).toFixed(1)}M`
    if (abs >= 10_000) return `${(abs / 1_000).toFixed(1)}K`
    return ""
}

interface CurrencyContextType {
    currency: string
    setCurrency: (currency: string) => void
    symbol: string
    compactNumbers: boolean
    setCompactNumbers: (compact: boolean) => void
    formatCurrency: (amount: number, options?: { minimumFractionDigits?: number; maximumFractionDigits?: number; showSign?: boolean; forceFullNumber?: boolean }) => string
}

const CurrencyContext = React.createContext<CurrencyContextType | undefined>(undefined)

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
    const [currency, setCurrencyState] = React.useState<string>("USD")
    const [compactNumbers, setCompactNumbersState] = React.useState(true) // Default: abbreviated
    const [mounted, setMounted] = React.useState(false)
    const { preferences, isServerSynced, updatePagePreferences } = useUserPreferences()
    const hasSyncedFromDb = React.useRef(false)

    // Load from localStorage on mount (instant display)
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

        // Load compact numbers preference
        const savedCompact = localStorage.getItem(COMPACT_NUMBERS_STORAGE_KEY)
        if (savedCompact !== null) {
            setCompactNumbersState(savedCompact !== "false")
        }
    }, [])

    // Sync from DB when available (DB is source of truth)
    React.useEffect(() => {
        if (!isServerSynced || hasSyncedFromDb.current) return
        hasSyncedFromDb.current = true
        const dbCurrency = preferences.settings?.currency
        if (dbCurrency && currencies[dbCurrency]) {
            setCurrencyState(dbCurrency)
        }
        // Sync compact numbers from DB
        const dbCompact = preferences.settings?.compactNumbers
        if (dbCompact !== undefined) {
            setCompactNumbersState(dbCompact)
        }
    }, [isServerSynced, preferences.settings?.currency, preferences.settings?.compactNumbers])

    React.useEffect(() => {
        if (mounted) {
            localStorage.setItem(CURRENCY_STORAGE_KEY, currency)
        }
    }, [currency, mounted])

    React.useEffect(() => {
        if (mounted) {
            localStorage.setItem(COMPACT_NUMBERS_STORAGE_KEY, String(compactNumbers))
        }
    }, [compactNumbers, mounted])

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

    // Listen for compact numbers changes from settings
    React.useEffect(() => {
        const handleCompactChange = (event: CustomEvent) => {
            setCompactNumbersState(event.detail as boolean)
        }

        window.addEventListener("compactNumbersChanged", handleCompactChange as EventListener)
        return () => {
            window.removeEventListener("compactNumbersChanged", handleCompactChange as EventListener)
        }
    }, [])

    const setCurrency = React.useCallback((newCurrency: string) => {
        if (currencies[newCurrency]) {
            setCurrencyState(newCurrency)
            localStorage.setItem(CURRENCY_STORAGE_KEY, newCurrency)
            window.dispatchEvent(new CustomEvent("currencyChanged", { detail: newCurrency }))
            updatePagePreferences("settings", { currency: newCurrency })
        }
    }, [updatePagePreferences])

    const setCompactNumbers = React.useCallback((compact: boolean) => {
        setCompactNumbersState(compact)
        localStorage.setItem(COMPACT_NUMBERS_STORAGE_KEY, String(compact))
        window.dispatchEvent(new CustomEvent("compactNumbersChanged", { detail: compact }))
        updatePagePreferences("settings", { compactNumbers: compact })
    }, [updatePagePreferences])

    const currencyConfig = currencies[currency] || currencies.USD

    const formatCurrency = React.useCallback((
        amount: number,
        options?: { minimumFractionDigits?: number; maximumFractionDigits?: number; showSign?: boolean; forceFullNumber?: boolean }
    ): string => {
        const forceFullNumber = options?.forceFullNumber ?? false
        const showSign = options?.showSign ?? false

        // Determine sign prefix
        let sign = ""
        if (showSign) {
            sign = amount >= 0 ? "+" : "-"
        } else if (amount < 0) {
            sign = "-"
        }

        // Compact mode: abbreviate large numbers (unless forced full)
        if (compactNumbers && !forceFullNumber) {
            const abbreviated = abbreviateNumber(amount)
            if (abbreviated) {
                if (currencyConfig.position === "after") {
                    return `${sign}${abbreviated}${currencyConfig.symbol}`
                } else {
                    return `${sign}${currencyConfig.symbol}${abbreviated}`
                }
            }
        }

        // Full number formatting
        const maxDigits = options?.maximumFractionDigits ?? 2
        const minDigits = options?.minimumFractionDigits ?? Math.min(2, maxDigits)

        const absAmount = Math.abs(amount)
        const formatted = absAmount.toLocaleString("en-US", {
            minimumFractionDigits: minDigits,
            maximumFractionDigits: maxDigits,
        })

        // Position symbol based on currency convention
        if (currencyConfig.position === "after") {
            return `${sign}${formatted}${currencyConfig.symbol}`
        } else {
            return `${sign}${currencyConfig.symbol}${formatted}`
        }
    }, [currencyConfig, compactNumbers])

    const value = React.useMemo(() => ({
        currency,
        setCurrency,
        symbol: currencyConfig.symbol,
        compactNumbers,
        setCompactNumbers,
        formatCurrency,
    }), [currency, setCurrency, currencyConfig.symbol, compactNumbers, setCompactNumbers, formatCurrency])

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
            compactNumbers: true,
            setCompactNumbers: () => { },
            formatCurrency: (amount: number, options?: { minimumFractionDigits?: number; maximumFractionDigits?: number; showSign?: boolean; forceFullNumber?: boolean }) => {
                const forceFullNumber = options?.forceFullNumber ?? false
                const showSign = options?.showSign ?? false

                let sign = ""
                if (showSign) {
                    sign = amount >= 0 ? "+" : "-"
                } else if (amount < 0) {
                    sign = "-"
                }

                // Compact mode by default in SSR fallback
                if (!forceFullNumber) {
                    const abbreviated = abbreviateNumber(amount)
                    if (abbreviated) {
                        return `${sign}$${abbreviated}`
                    }
                }

                const maxDigits = options?.maximumFractionDigits ?? 2
                const minDigits = options?.minimumFractionDigits ?? Math.min(2, maxDigits)

                const absAmount = Math.abs(amount)
                const formatted = absAmount.toLocaleString("en-US", {
                    minimumFractionDigits: minDigits,
                    maximumFractionDigits: maxDigits,
                })

                return `${sign}$${formatted}`
            },
        }
    }
    return context
}
