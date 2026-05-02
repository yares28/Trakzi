"use client"

import { createContext, useContext, useState, useEffect, useRef, ReactNode } from "react"
import { useUserPreferences } from "@/components/user-preferences-provider"

interface AccountFilterContextType {
    /** Selected account IDs. Empty array = "all accounts". */
    selected: string[]
    /** Replace the full selection (canonical sort + dedup applied internally). */
    setSelected: (ids: string[]) => void
    /** Toggle a single account in/out of the selection. */
    toggle: (id: string) => void
    /** Reset to "all accounts". */
    clear: () => void
    /** True once the initial selection has been resolved (localStorage + server). */
    isReady: boolean
}

const AccountFilterContext = createContext<AccountFilterContextType | undefined>(undefined)

const STORAGE_KEY = "global-account-filter"

const canonicalize = (ids: string[]): string[] => {
    const unique = Array.from(new Set(ids.filter((id) => typeof id === "string" && id.length > 0)))
    return unique.sort()
}

const readStored = (): string[] => {
    if (typeof window === "undefined") return []
    try {
        const raw = localStorage.getItem(STORAGE_KEY)
        if (!raw) return []
        const parsed = JSON.parse(raw)
        if (!Array.isArray(parsed)) return []
        return canonicalize(parsed.filter((v): v is string => typeof v === "string"))
    } catch {
        return []
    }
}

export function useAccountFilter() {
    const ctx = useContext(AccountFilterContext)
    if (!ctx) {
        throw new Error("useAccountFilter must be used within AccountFilterProvider")
    }
    return ctx
}

export function AccountFilterProvider({ children }: { children: ReactNode }) {
    const [selected, setSelectedState] = useState<string[]>([])
    const [isReady, setIsReady] = useState(true)
    const { preferences, isServerSynced, updatePagePreferences } = useUserPreferences()
    const hasSyncedFromDb = useRef(false)

    useEffect(() => {
        if (typeof window === "undefined") return
        const stored = readStored()
        setSelectedState(stored)
        setIsReady(true)
    }, [])

    useEffect(() => {
        if (!isServerSynced || hasSyncedFromDb.current) return
        hasSyncedFromDb.current = true
        const dbFilter = preferences.settings?.account_filter
        if (Array.isArray(dbFilter)) {
            const canonical = canonicalize(dbFilter)
            setSelectedState((prev) => {
                if (prev.length === canonical.length && prev.every((id, i) => id === canonical[i])) return prev
                return canonical
            })
        }
    }, [isServerSynced, preferences.settings?.account_filter])

    const persist = (next: string[]) => {
        if (typeof window === "undefined") return
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
        } catch (err) {
            console.warn("[AccountFilter] localStorage write failed", err)
        }
        updatePagePreferences("settings", { account_filter: next })
    }

    const setSelected = (ids: string[]) => {
        const canonical = canonicalize(ids)
        setSelectedState(canonical)
        persist(canonical)
    }

    const toggle = (id: string) => {
        setSelectedState((prev) => {
            const has = prev.includes(id)
            const next = canonicalize(has ? prev.filter((x) => x !== id) : [...prev, id])
            persist(next)
            return next
        })
    }

    const clear = () => {
        setSelectedState([])
        persist([])
    }

    return (
        <AccountFilterContext.Provider value={{ selected, setSelected, toggle, clear, isReady }}>
            {children}
        </AccountFilterContext.Provider>
    )
}
