"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react"
import { useTheme } from "next-themes"
import type {
  HomePreferences,
  PageLayoutPreferences,
  SettingsPreferences,
  UserPreferences,
} from "@/lib/types/user-preferences"

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

interface UserPreferencesContextValue {
  /** The full preferences object (always defined, may be empty {}). */
  preferences: UserPreferences
  /** True once localStorage has been read (API may still be loading). */
  isLoaded: boolean
  /** True once the server round-trip has completed (or failed). */
  isServerSynced: boolean
  /**
   * Update a single page section.  Does a shallow merge into the section,
   * e.g. updatePagePreferences("home", { favorites: [...] }) preserves
   * home.order and home.sizes.
   */
  updatePagePreferences: (
    page: "home" | "analytics" | "fridge" | "settings",
    data:
      | Partial<HomePreferences>
      | Partial<PageLayoutPreferences>
      | Partial<SettingsPreferences>
  ) => void
}

const UserPreferencesContext = createContext<UserPreferencesContextValue | null>(
  null
)

// ---------------------------------------------------------------------------
// localStorage helpers (read / write the same keys the old code used)
// ---------------------------------------------------------------------------

const LS_KEYS = {
  // Home (Favorites)
  homeFavorites: "home-favorite-charts",
  homeOrder: "home-favorites-order",
  homeSizes: "home-favorites-chart-sizes",
  // Analytics
  analyticsOrder: "analytics-chart-order",
  analyticsSizes: "analytics-chart-sizes",
  analyticsVersion: "analytics-chart-sizes-version",
  analyticsUserSizes: "analytics-chart-sizes-user",
  // Fridge
  fridgeOrder: "fridge-chart-order",
  fridgeSizes: "fridge-chart-sizes",
  fridgeVersion: "fridge-chart-sizes-version",
  // Settings
  colorScheme: "trakzi-color-scheme",
  theme: "trakzi-theme",
  currency: "selected-currency",
  dateFilter: "global-date-filter",
  dateFilterLegacy: "dateFilter",
  defaultTimePeriod: "default-time-period",
  font: "trakzi-font",
  // Migration flag
  migrated: "preferences-migrated-to-db",
} as const

function safeJsonParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback
  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

/** Read all legacy localStorage keys into a single UserPreferences object. */
function loadAllFromLocalStorage(): UserPreferences {
  if (typeof window === "undefined") return {}

  const prefs: UserPreferences = {}

  try {
    // ---- Home ----
    const hFavs = localStorage.getItem(LS_KEYS.homeFavorites)
    const hOrder = localStorage.getItem(LS_KEYS.homeOrder)
    const hSizes = localStorage.getItem(LS_KEYS.homeSizes)

    if (hFavs || hOrder || hSizes) {
      prefs.home = {
        favorites: safeJsonParse<string[]>(hFavs, []),
        order: safeJsonParse<string[]>(hOrder, []),
        sizes: safeJsonParse<Record<string, { w: number; h: number }>>(
          hSizes,
          {}
        ),
      }
    }

    // ---- Analytics ----
    const aOrder = localStorage.getItem(LS_KEYS.analyticsOrder)
    const aSizes = localStorage.getItem(LS_KEYS.analyticsSizes)
    const aVer = localStorage.getItem(LS_KEYS.analyticsVersion)
    const aUser = localStorage.getItem(LS_KEYS.analyticsUserSizes)

    if (aOrder || aSizes) {
      prefs.analytics = {
        order: safeJsonParse<string[]>(aOrder, []),
        sizes: safeJsonParse<Record<string, any>>(aSizes, {}),
        user_sizes: safeJsonParse<Record<string, { w: number; h: number }>>(
          aUser,
          {}
        ),
        sizes_version: aVer || undefined,
      }
    }

    // ---- Fridge ----
    const fOrder = localStorage.getItem(LS_KEYS.fridgeOrder)
    const fSizes = localStorage.getItem(LS_KEYS.fridgeSizes)
    const fVer = localStorage.getItem(LS_KEYS.fridgeVersion)

    if (fOrder || fSizes) {
      prefs.fridge = {
        order: safeJsonParse<string[]>(fOrder, []),
        sizes: safeJsonParse<Record<string, any>>(fSizes, {}),
        sizes_version: fVer || undefined,
      }
    }

    // ---- Settings ----
    const sColorScheme = localStorage.getItem(LS_KEYS.colorScheme)
    const sTheme = localStorage.getItem(LS_KEYS.theme)
    const sCurrency = localStorage.getItem(LS_KEYS.currency)
    const sDateFilter =
      localStorage.getItem(LS_KEYS.dateFilter) ||
      localStorage.getItem(LS_KEYS.dateFilterLegacy) ||
      localStorage.getItem(LS_KEYS.defaultTimePeriod)
    const sFont = localStorage.getItem(LS_KEYS.font)

    if (sColorScheme || sTheme || sCurrency || sDateFilter || sFont) {
      prefs.settings = {
        color_scheme: sColorScheme || undefined,
        theme: sTheme || undefined,
        currency: sCurrency || undefined,
        date_filter: sDateFilter || undefined,
        font: sFont || undefined,
      }
    }
  } catch (error) {
    console.error("[UserPreferences] Failed to load from localStorage:", error)
  }

  return prefs
}

/** Write the whole preferences object back to the legacy localStorage keys. */
function saveAllToLocalStorage(prefs: UserPreferences) {
  if (typeof window === "undefined") return

  try {
    // ---- Home ----
    if (prefs.home) {
      localStorage.setItem(
        LS_KEYS.homeFavorites,
        JSON.stringify(prefs.home.favorites ?? [])
      )
      localStorage.setItem(
        LS_KEYS.homeOrder,
        JSON.stringify(prefs.home.order ?? [])
      )
      localStorage.setItem(
        LS_KEYS.homeSizes,
        JSON.stringify(prefs.home.sizes ?? {})
      )
    }

    // ---- Analytics ----
    if (prefs.analytics) {
      localStorage.setItem(
        LS_KEYS.analyticsOrder,
        JSON.stringify(prefs.analytics.order ?? [])
      )
      localStorage.setItem(
        LS_KEYS.analyticsSizes,
        JSON.stringify(prefs.analytics.sizes ?? {})
      )
      if (prefs.analytics.sizes_version) {
        localStorage.setItem(
          LS_KEYS.analyticsVersion,
          prefs.analytics.sizes_version
        )
      }
      if (prefs.analytics.user_sizes) {
        localStorage.setItem(
          LS_KEYS.analyticsUserSizes,
          JSON.stringify(prefs.analytics.user_sizes)
        )
      }
    }

    // ---- Fridge ----
    if (prefs.fridge) {
      localStorage.setItem(
        LS_KEYS.fridgeOrder,
        JSON.stringify(prefs.fridge.order ?? [])
      )
      localStorage.setItem(
        LS_KEYS.fridgeSizes,
        JSON.stringify(prefs.fridge.sizes ?? {})
      )
      if (prefs.fridge.sizes_version) {
        localStorage.setItem(
          LS_KEYS.fridgeVersion,
          prefs.fridge.sizes_version
        )
      }
    }

    // ---- Settings ----
    if (prefs.settings) {
      if (prefs.settings.color_scheme !== undefined) {
        localStorage.setItem(LS_KEYS.colorScheme, prefs.settings.color_scheme)
      }
      if (prefs.settings.theme !== undefined) {
        localStorage.setItem(LS_KEYS.theme, prefs.settings.theme)
      }
      if (prefs.settings.currency !== undefined) {
        localStorage.setItem(LS_KEYS.currency, prefs.settings.currency)
      }
      if (prefs.settings.date_filter !== undefined) {
        localStorage.setItem(LS_KEYS.dateFilter, prefs.settings.date_filter)
      }
      if (prefs.settings.font !== undefined) {
        localStorage.setItem(LS_KEYS.font, prefs.settings.font)
      }
    }
  } catch (error) {
    console.error("[UserPreferences] Failed to save to localStorage:", error)
  }
}

// ---------------------------------------------------------------------------
// ThemeSyncBridge — syncs next-themes ↔ DB settings.theme
// ---------------------------------------------------------------------------

function ThemeSyncBridge({
  preferences,
  isServerSynced,
  updatePagePreferences,
}: {
  preferences: UserPreferences
  isServerSynced: boolean
  updatePagePreferences: UserPreferencesContextValue["updatePagePreferences"]
}) {
  const { theme, setTheme } = useTheme()
  const hasSyncedFromDb = useRef(false)
  const lastThemeRef = useRef(theme)

  // On DB load: if DB has a saved theme and it differs, apply it.
  useEffect(() => {
    if (!isServerSynced || hasSyncedFromDb.current) return
    const dbTheme = preferences.settings?.theme
    if (dbTheme && dbTheme !== theme) {
      setTheme(dbTheme)
    }
    hasSyncedFromDb.current = true
  }, [isServerSynced, preferences.settings?.theme, theme, setTheme])

  // On user theme change: persist to DB.
  useEffect(() => {
    if (!hasSyncedFromDb.current) return
    if (theme && theme !== lastThemeRef.current) {
      lastThemeRef.current = theme
      updatePagePreferences("settings", { theme })
    }
  }, [theme, updatePagePreferences])

  return null
}

// ---------------------------------------------------------------------------
// FontSyncBridge — toggles font-mono class on <body>
// ---------------------------------------------------------------------------

function FontSyncBridge({
  preferences,
}: {
  preferences: UserPreferences
}) {
  useEffect(() => {
    const font = preferences.settings?.font
    if (font === "geist-mono") {
      document.body.classList.add("font-mono")
    } else {
      document.body.classList.remove("font-mono")
    }
  }, [preferences.settings?.font])

  return null
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function UserPreferencesProvider({
  children,
}: {
  children: ReactNode
}) {
  const [preferences, setPreferences] = useState<UserPreferences>({})
  const [isLoaded, setIsLoaded] = useState(false)
  const [isServerSynced, setIsServerSynced] = useState(false)

  // Ref that always holds the latest preferences (for debounced save).
  const latestRef = useRef<UserPreferences>({})
  // Timer for the debounced PUT.
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Gate: do NOT write back to the server until init is fully done.
  const readyToSaveRef = useRef(false)

  // ------------------------------------------------------------------
  // Mount: load localStorage → fetch API → reconcile
  // ------------------------------------------------------------------
  useEffect(() => {
    let cancelled = false

    async function init() {
      // 1. Read localStorage immediately.
      const localPrefs = loadAllFromLocalStorage()
      if (!cancelled) {
        setPreferences(localPrefs)
        latestRef.current = localPrefs
      }

      // 2. Fetch from server.
      try {
        const res = await fetch("/api/user-preferences")
        if (!res.ok) throw new Error(`HTTP ${res.status}`)

        const data = await res.json()
        const dbPrefs: UserPreferences = data?.preferences ?? {}

        if (cancelled) return

        const dbHasData = Object.keys(dbPrefs).length > 0
        const localHasData = Object.keys(localPrefs).length > 0

        if (dbHasData) {
          // DB is source of truth.
          setPreferences(dbPrefs)
          latestRef.current = dbPrefs
          saveAllToLocalStorage(dbPrefs)
        } else if (localHasData) {
          // First-time migration: push localStorage → DB.
          await fetch("/api/user-preferences", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ preferences: localPrefs }),
          })
          localStorage.setItem(LS_KEYS.migrated, "true")
        }

        if (!cancelled) setIsServerSynced(true)
      } catch {
        // Not authenticated, or network error — localStorage-only mode.
      }

      if (!cancelled) {
        setIsLoaded(true)
        // Allow save writes on the NEXT tick so the state from the API
        // response has settled and won't trigger a redundant save.
        requestAnimationFrame(() => {
          readyToSaveRef.current = true
        })
      }
    }

    init()
    return () => {
      cancelled = true
    }
  }, [])

  // ------------------------------------------------------------------
  // Debounced save to server
  // ------------------------------------------------------------------
  const flushToServer = useCallback(() => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current)
      saveTimerRef.current = null
    }
    const prefs = latestRef.current
    fetch("/api/user-preferences", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ preferences: prefs }),
    }).catch((err) =>
      console.error("[UserPreferences] Server save failed:", err)
    )
  }, [])

  const scheduleSave = useCallback(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(flushToServer, 500)
  }, [flushToServer])

  // Flush on tab hide (best-effort).
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (
        document.visibilityState === "hidden" &&
        readyToSaveRef.current &&
        saveTimerRef.current
      ) {
        flushToServer()
      }
    }
    document.addEventListener("visibilitychange", handleVisibilityChange)
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange)
      // Also flush on unmount.
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current)
        saveTimerRef.current = null
      }
    }
  }, [flushToServer])

  // ------------------------------------------------------------------
  // Public mutator
  // ------------------------------------------------------------------
  const updatePagePreferences = useCallback(
    (
      page: "home" | "analytics" | "fridge" | "settings",
      data:
        | Partial<HomePreferences>
        | Partial<PageLayoutPreferences>
        | Partial<SettingsPreferences>
    ) => {
      setPreferences((prev) => {
        const next: UserPreferences = {
          ...prev,
          [page]: { ...(prev[page] || {}), ...data },
        }

        // Keep ref in sync.
        latestRef.current = next

        // Write-through to localStorage (synchronous, instant).
        saveAllToLocalStorage(next)

        // Schedule debounced API write.
        if (readyToSaveRef.current && isServerSynced) {
          scheduleSave()
        }

        return next
      })
    },
    [isServerSynced, scheduleSave]
  )

  // ------------------------------------------------------------------
  // Memoised context value
  // ------------------------------------------------------------------
  const value = useMemo<UserPreferencesContextValue>(
    () => ({
      preferences,
      isLoaded,
      isServerSynced,
      updatePagePreferences,
    }),
    [preferences, isLoaded, isServerSynced, updatePagePreferences]
  )

  return (
    <UserPreferencesContext.Provider value={value}>
      <ThemeSyncBridge
        preferences={preferences}
        isServerSynced={isServerSynced}
        updatePagePreferences={updatePagePreferences}
      />
      <FontSyncBridge preferences={preferences} />
      {children}
    </UserPreferencesContext.Provider>
  )
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useUserPreferences(): UserPreferencesContextValue {
  const ctx = useContext(UserPreferencesContext)
  if (!ctx) {
    throw new Error(
      "useUserPreferences must be used within <UserPreferencesProvider>"
    )
  }
  return ctx
}

UserPreferencesProvider.displayName = "UserPreferencesProvider"
