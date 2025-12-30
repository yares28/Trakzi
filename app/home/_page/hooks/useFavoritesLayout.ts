import { useCallback, useEffect, useState } from "react"

import { useFavorites } from "@/components/favorites-provider"
import type { ChartId } from "@/lib/chart-card-sizes.config"

import {
  FAVORITES_ORDER_STORAGE_KEY,
  FAVORITE_SIZES_STORAGE_KEY,
} from "../constants"
import type { FavoriteChartSize } from "../types"

type SavedFavoriteSizes = Record<string, FavoriteChartSize>

export function useFavoritesLayout() {
  const { favorites } = useFavorites()
  const [favoritesOrder, setFavoritesOrder] = useState<string[]>([])
  const [savedFavoriteSizes, setSavedFavoriteSizes] =
    useState<SavedFavoriteSizes>({})

  useEffect(() => {
    const favoritesArray = Array.from(favorites)
    if (favoritesArray.length === 0) {
      setFavoritesOrder([])
      return
    }
    try {
      const saved = localStorage.getItem(FAVORITES_ORDER_STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved) as ChartId[]
        const existingInOrder = parsed.filter((id) =>
          favoritesArray.includes(id)
        )
        const newFavorites = favoritesArray.filter(
          (id) => !parsed.includes(id)
        )
        setFavoritesOrder([...existingInOrder, ...newFavorites])
      } else {
        setFavoritesOrder(favoritesArray)
      }
    } catch {
      setFavoritesOrder(favoritesArray)
    }
  }, [favorites])

  useEffect(() => {
    if (typeof window === "undefined") return
    try {
      const saved = localStorage.getItem(FAVORITE_SIZES_STORAGE_KEY)
      setSavedFavoriteSizes(saved ? JSON.parse(saved) : {})
    } catch (error) {
      console.error("Failed to load favorite chart sizes:", error)
      setSavedFavoriteSizes({})
    }
  }, [])

  const handleFavoritesOrderChange = useCallback((newOrder: string[]) => {
    setFavoritesOrder(newOrder)
    try {
      localStorage.setItem(
        FAVORITES_ORDER_STORAGE_KEY,
        JSON.stringify(newOrder)
      )
    } catch (error) {
      console.error("Failed to save favorites order:", error)
    }
  }, [])

  const handleFavoritesResize = useCallback((chartId: string, w: number, h: number) => {
    setSavedFavoriteSizes((prev) => {
      const next = { ...prev, [chartId]: { w, h } }
      try {
        localStorage.setItem(
          FAVORITE_SIZES_STORAGE_KEY,
          JSON.stringify(next)
        )
      } catch (error) {
        console.error("Failed to save favorites size:", error)
      }
      return next
    })
  }, [])

  return {
    favorites,
    favoritesOrder,
    savedFavoriteSizes,
    handleFavoritesOrderChange,
    handleFavoritesResize,
  }
}
