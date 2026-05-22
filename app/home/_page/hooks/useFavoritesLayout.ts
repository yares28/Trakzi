import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import { useFavorites } from "@/components/favorites-provider"
import { useUserPreferences } from "@/components/user-preferences-provider"
import { useDemoMode } from "@/lib/demo/demo-context"
import type { ChartId } from "@/lib/chart-card-sizes.config"

import type { FavoriteChartSize } from "../types"

type SavedFavoriteSizes = Record<string, FavoriteChartSize>

export function useFavoritesLayout() {
  const { favorites } = useFavorites()
  const { preferences, updatePagePreferences } = useUserPreferences()
  const { isDemoMode } = useDemoMode()

  const homePrefs = preferences.home

  // ---- Order ----
  const [favoritesOrder, setFavoritesOrder] = useState<string[]>([])

  useEffect(() => {
    const favoritesArray = Array.from(favorites)
    if (favoritesArray.length === 0) {
      setFavoritesOrder([])
      return
    }

    const savedOrder = isDemoMode ? [] : (homePrefs?.order ?? [])
    const existingInOrder = savedOrder.filter((id) =>
      favoritesArray.includes(id as ChartId)
    )
    const newFavorites = favoritesArray.filter(
      (id) => !savedOrder.includes(id)
    )
    setFavoritesOrder([...existingInOrder, ...newFavorites])
  }, [favorites, homePrefs?.order, isDemoMode])

  const [demoFavoriteSizes, setDemoFavoriteSizes] = useState<SavedFavoriteSizes>({})

  useEffect(() => {
    if (!isDemoMode) return
    setDemoFavoriteSizes({})
  }, [isDemoMode])

  // ---- Sizes ----
  const savedFavoriteSizes: SavedFavoriteSizes = useMemo(
    () => (isDemoMode ? demoFavoriteSizes : (homePrefs?.sizes ?? {})),
    [demoFavoriteSizes, homePrefs?.sizes, isDemoMode]
  )

  // Keep a ref so rapid resize events always build on the latest sizes.
  const sizesRef = useRef<SavedFavoriteSizes>(savedFavoriteSizes)
  useEffect(() => {
    sizesRef.current = savedFavoriteSizes
  }, [savedFavoriteSizes])

  // ---- Handlers ----
  const handleFavoritesOrderChange = useCallback(
    (newOrder: string[]) => {
      setFavoritesOrder(newOrder)
      if (isDemoMode) return
      updatePagePreferences("home", { order: newOrder })
    },
    [isDemoMode, updatePagePreferences]
  )

  const handleFavoritesResize = useCallback(
    (chartId: string, w: number, h: number) => {
      const next = { ...sizesRef.current, [chartId]: { w, h } }
      sizesRef.current = next
      if (isDemoMode) {
        setDemoFavoriteSizes(next)
        return
      }
      updatePagePreferences("home", { sizes: next })
    },
    [isDemoMode, updatePagePreferences]
  )

  return {
    favorites,
    favoritesOrder,
    savedFavoriteSizes,
    handleFavoritesOrderChange,
    handleFavoritesResize,
  }
}
