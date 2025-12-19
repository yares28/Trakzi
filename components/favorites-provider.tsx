"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from "react"
import { type ChartId } from "@/lib/chart-card-sizes.config"

interface FavoritesContextType {
  favorites: Set<ChartId>
  toggleFavorite: (chartId: ChartId) => void
  isFavorite: (chartId: ChartId) => boolean
}

const FavoritesContext = createContext<FavoritesContextType | undefined>(undefined)

const FAVORITES_STORAGE_KEY = "home-favorite-charts"

export function useFavorites() {
  const context = useContext(FavoritesContext)
  if (!context) {
    throw new Error("useFavorites must be used within FavoritesProvider")
  }
  return context
}

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const [favorites, setFavorites] = useState<Set<ChartId>>(new Set())

  // Load favorites from localStorage on mount
  useEffect(() => {
    if (typeof window === "undefined") return
    
    try {
      const stored = localStorage.getItem(FAVORITES_STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        if (Array.isArray(parsed)) {
          setFavorites(new Set(parsed))
        }
      }
    } catch (error) {
      console.error("Failed to load favorites from localStorage:", error)
    }
  }, [])

  // Save favorites to localStorage whenever they change
  useEffect(() => {
    if (typeof window === "undefined") return
    
    try {
      localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(Array.from(favorites)))
    } catch (error) {
      console.error("Failed to save favorites to localStorage:", error)
    }
  }, [favorites])

  const toggleFavorite = (chartId: ChartId) => {
    setFavorites((prev) => {
      const next = new Set(prev)
      if (next.has(chartId)) {
        next.delete(chartId)
      } else {
        next.add(chartId)
      }
      return next
    })
  }

  const isFavorite = (chartId: ChartId) => {
    return favorites.has(chartId)
  }

  return (
    <FavoritesContext.Provider value={{ favorites, toggleFavorite, isFavorite }}>
      {children}
    </FavoritesContext.Provider>
  )
}
































