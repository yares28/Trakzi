"use client"

import { createContext, useCallback, useContext, useMemo, type ReactNode } from "react"
import { type ChartId } from "@/lib/chart-card-sizes.config"
import { useUserPreferences } from "@/components/user-preferences-provider"
import { useDemoMode } from "@/lib/demo/demo-context"

const DEMO_DEFAULT_FAVORITES: ChartId[] = [
  "netWorthAllocation" as ChartId,
  "spendingCategoryRankings" as ChartId,
]

interface FavoritesContextType {
  favorites: Set<ChartId>
  toggleFavorite: (chartId: ChartId) => void
  isFavorite: (chartId: ChartId) => boolean
}

const FavoritesContext = createContext<FavoritesContextType | undefined>(undefined)

export function useFavorites() {
  const context = useContext(FavoritesContext)
  if (!context) {
    throw new Error("useFavorites must be used within FavoritesProvider")
  }
  return context
}

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const { preferences, updatePagePreferences } = useUserPreferences()
  const { isDemoMode } = useDemoMode()

  // Derive the Set from the preferences object (memoised).
  // In demo mode, provide default favorites when none are set.
  const favorites = useMemo<Set<ChartId>>(() => {
    const arr = preferences.home?.favorites ?? []
    if (arr.length === 0 && isDemoMode) {
      return new Set(DEMO_DEFAULT_FAVORITES)
    }
    return new Set(arr as ChartId[])
  }, [preferences.home?.favorites, isDemoMode])

  const toggleFavorite = useCallback(
    (chartId: ChartId) => {
      const current = preferences.home?.favorites ?? []
      const next = current.includes(chartId)
        ? current.filter((id) => id !== chartId)
        : [...current, chartId]

      updatePagePreferences("home", { favorites: next })
    },
    [preferences.home?.favorites, updatePagePreferences]
  )

  const isFavorite = useCallback(
    (chartId: ChartId) => favorites.has(chartId),
    [favorites]
  )

  return (
    <FavoritesContext.Provider value={{ favorites, toggleFavorite, isFavorite }}>
      {children}
    </FavoritesContext.Provider>
  )
}
