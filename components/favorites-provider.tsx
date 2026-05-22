"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react"
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
  const [demoFavorites, setDemoFavorites] = useState<ChartId[]>(DEMO_DEFAULT_FAVORITES)

  useEffect(() => {
    if (!isDemoMode) return
    setDemoFavorites(DEMO_DEFAULT_FAVORITES)
  }, [isDemoMode])

  // Derive the Set from the preferences object (memoised).
  // In demo mode, provide default favorites when none are set.
  const favorites = useMemo<Set<ChartId>>(() => {
    if (isDemoMode) {
      return new Set(demoFavorites)
    }

    const arr = preferences.home?.favorites ?? []
    return new Set(arr as ChartId[])
  }, [demoFavorites, isDemoMode, preferences.home?.favorites])

  const toggleFavorite = useCallback(
    (chartId: ChartId) => {
      if (isDemoMode) {
        setDemoFavorites((current) =>
          current.includes(chartId)
            ? current.filter((id) => id !== chartId)
            : [...current, chartId]
        )
        return
      }

      const current = preferences.home?.favorites ?? []
      const next = current.includes(chartId)
        ? current.filter((id) => id !== chartId)
        : [...current, chartId]

      updatePagePreferences("home", { favorites: next })
    },
    [isDemoMode, preferences.home?.favorites, updatePagePreferences]
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
