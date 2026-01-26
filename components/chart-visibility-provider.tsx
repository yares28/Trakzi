"use client"

import * as React from "react"
import { ChartInfoPopoverCategoryControls } from "@/components/chart-info-popover"

const defaultNormalizeCategory = (value?: string | null) => {
  const trimmed = (value ?? "").trim()
  return trimmed || "Other"
}

interface ChartVisibilityState {
  /** Map of chartId -> Set of hidden categories */
  hiddenByChart: Map<string, Set<string>>
}

interface ChartVisibilityContextValue {
  getHiddenCategories: (chartId: string) => string[]
  getHiddenCategorySet: (chartId: string) => Set<string>
  toggleHiddenCategory: (chartId: string, category: string, normalizeCategory?: (value?: string | null) => string) => void
  clearHiddenCategories: (chartId: string) => void
  buildCategoryControls: (
    chartId: string,
    categories: string[],
    options?: {
      title?: string
      description?: string
      emptyState?: string
      normalizeCategory?: (value?: string | null) => string
    }
  ) => ChartInfoPopoverCategoryControls | undefined
}

const ChartVisibilityContext = React.createContext<ChartVisibilityContextValue | null>(null)

interface ChartVisibilityProviderProps {
  children: React.ReactNode
  /** Storage key prefix (default: "global") */
  storageScope?: string
}

/**
 * ChartVisibilityProvider - Centralized context for chart category visibility
 *
 * Instead of each chart component reading localStorage separately,
 * this provider:
 * 1. Reads ALL chart visibility preferences once on mount
 * 2. Shares state across all consumer components
 * 3. Batches localStorage writes
 *
 * This reduces 13+ separate localStorage reads to just 1.
 */
export function ChartVisibilityProvider({
  children,
  storageScope = "global",
}: ChartVisibilityProviderProps) {
  const [state, setState] = React.useState<ChartVisibilityState>(() => ({
    hiddenByChart: new Map(),
  }))
  const initializedRef = React.useRef(false)

  // Read all chart visibility preferences from localStorage once on mount
  React.useEffect(() => {
    if (typeof window === "undefined" || initializedRef.current) return
    initializedRef.current = true

    try {
      // Find all chart visibility keys in localStorage
      const prefix = `${storageScope}:chartHiddenCategories:`
      const newMap = new Map<string, Set<string>>()

      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key?.startsWith(prefix)) {
          const chartId = key.slice(prefix.length)
          try {
            const stored = localStorage.getItem(key)
            if (stored) {
              const parsed = JSON.parse(stored)
              if (Array.isArray(parsed)) {
                const normalized = parsed
                  .map((cat) => defaultNormalizeCategory(cat))
                  .filter((cat) => cat && cat.length > 0)
                newMap.set(chartId, new Set(normalized))
              }
            }
          } catch {
            // Ignore parse errors for individual keys
          }
        }
      }

      if (newMap.size > 0) {
        setState({ hiddenByChart: newMap })
      }
    } catch (error) {
      console.warn("[ChartVisibilityProvider] Failed to read localStorage", error)
    }
  }, [storageScope])

  const getStorageKey = React.useCallback(
    (chartId: string) => `${storageScope}:chartHiddenCategories:${chartId}`,
    [storageScope]
  )

  const getHiddenCategories = React.useCallback(
    (chartId: string): string[] => {
      const set = state.hiddenByChart.get(chartId)
      return set ? Array.from(set) : []
    },
    [state.hiddenByChart]
  )

  const getHiddenCategorySet = React.useCallback(
    (chartId: string): Set<string> => {
      return state.hiddenByChart.get(chartId) || new Set()
    },
    [state.hiddenByChart]
  )

  const toggleHiddenCategory = React.useCallback(
    (chartId: string, category: string, normalizeCategory: (value?: string | null) => string = defaultNormalizeCategory) => {
      const normalized = normalizeCategory(category)
      if (!normalized) return

      setState((prev) => {
        const newMap = new Map(prev.hiddenByChart)
        const currentSet = newMap.get(chartId) || new Set()
        const newSet = new Set(currentSet)

        if (newSet.has(normalized)) {
          newSet.delete(normalized)
        } else {
          newSet.add(normalized)
        }

        if (newSet.size === 0) {
          newMap.delete(chartId)
        } else {
          newMap.set(chartId, newSet)
        }

        // Persist to localStorage
        if (typeof window !== "undefined") {
          const key = `${storageScope}:chartHiddenCategories:${chartId}`
          if (newSet.size === 0) {
            localStorage.removeItem(key)
          } else {
            localStorage.setItem(key, JSON.stringify(Array.from(newSet)))
          }
        }

        return { hiddenByChart: newMap }
      })
    },
    [storageScope]
  )

  const clearHiddenCategories = React.useCallback(
    (chartId: string) => {
      setState((prev) => {
        const newMap = new Map(prev.hiddenByChart)
        newMap.delete(chartId)

        // Remove from localStorage
        if (typeof window !== "undefined") {
          localStorage.removeItem(`${storageScope}:chartHiddenCategories:${chartId}`)
        }

        return { hiddenByChart: newMap }
      })
    },
    [storageScope]
  )

  const buildCategoryControls = React.useCallback(
    (
      chartId: string,
      categories: string[],
      options?: {
        title?: string
        description?: string
        emptyState?: string
        normalizeCategory?: (value: string) => string
      }
    ): ChartInfoPopoverCategoryControls | undefined => {
      if (!categories || categories.length === 0) {
        return undefined
      }

      const normalizeCategory = options?.normalizeCategory || defaultNormalizeCategory

      const normalizedCategories = Array.from(
        new Set(
          categories
            .map((category) => {
              const cleaned = (category ?? "").trim()
              return cleaned || "Other"
            })
            .filter(Boolean)
        )
      ).sort((a, b) => a.localeCompare(b))

      if (!normalizedCategories.length) {
        return undefined
      }

      const hiddenCategories = getHiddenCategories(chartId)

      return {
        title: options?.title ?? "Category visibility",
        description: options?.description ?? "Toggle a category to hide it in this chart only.",
        categories: normalizedCategories,
        hiddenCategories,
        onToggle: (category) => toggleHiddenCategory(chartId, category, (v) => normalizeCategory(v ?? "")),
        onClear: hiddenCategories.length ? () => clearHiddenCategories(chartId) : undefined,
        emptyState: options?.emptyState ?? "No categories available yet.",
        // Wrap normalizeCategory to match the expected interface signature
        normalizeCategory: (category: string) => normalizeCategory(category),
      }
    },
    [getHiddenCategories, toggleHiddenCategory, clearHiddenCategories]
  )

  const value = React.useMemo(
    () => ({
      getHiddenCategories,
      getHiddenCategorySet,
      toggleHiddenCategory,
      clearHiddenCategories,
      buildCategoryControls,
    }),
    [getHiddenCategories, getHiddenCategorySet, toggleHiddenCategory, clearHiddenCategories, buildCategoryControls]
  )

  return (
    <ChartVisibilityContext.Provider value={value}>
      {children}
    </ChartVisibilityContext.Provider>
  )
}

/**
 * Hook to access chart visibility controls from the context
 *
 * Compatible with the existing useChartCategoryVisibility interface
 * for easy migration.
 */
export function useChartVisibility(chartId: string) {
  const context = React.useContext(ChartVisibilityContext)

  if (!context) {
    // Fallback for when provider is not available
    // Returns empty defaults so components still work
    return {
      hiddenCategories: [] as string[],
      hiddenCategorySet: new Set<string>(),
      buildCategoryControls: () => undefined,
    }
  }

  return {
    hiddenCategories: context.getHiddenCategories(chartId),
    hiddenCategorySet: context.getHiddenCategorySet(chartId),
    buildCategoryControls: (
      categories: string[],
      options?: { title?: string; description?: string; emptyState?: string; normalizeCategory?: (value?: string | null) => string }
    ) => context.buildCategoryControls(chartId, categories, options),
  }
}

ChartVisibilityProvider.displayName = "ChartVisibilityProvider"
