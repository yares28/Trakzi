"use client"

import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from "react"
import { useTheme } from "next-themes"
import { useUserPreferences } from "@/components/user-preferences-provider"

type ColorScheme = "sunset" | "dark" | "colored" | "gold" | "aqua" | "dull" | "dry" | "greens" | "chrome" | "beach" | "jolly" | "gothic"

interface ColorSchemeContextType {
  colorScheme: ColorScheme
  setColorScheme: (scheme: ColorScheme) => void
  getPalette: () => string[]
  /** Returns the theme-aware palette with colors in a shuffled (non-sequential) order */
  getShuffledPalette: () => string[]
  /** Returns palette indices 1 to n-2 (middle only), shuffled. Re-randomizes on hard reload. */
  getMiddleShuffledPalette: () => string[]
  /** Returns the raw palette without any theme-based trimming or neutral filtering */
  getRawPalette: () => string[]
}

const COLOR_SCHEME_STORAGE_KEY = "trakzi-color-scheme"

// Color palettes ordered from darkest to lightest
export const colorPalettes: Record<ColorScheme, string[]> = {
  sunset: ["#331300", "#5e2401", "#893401", "#b44401", "#df5501", "#fe680e", "#fe8339", "#fe9e64", "#feb98f", "#ffd4bb", "#ffefe6"],
  dark: ["#151515", "#2B2B2B", "#414141", "#575757", "#6D6D6D", "#838383", "#999999", "#B0B0B0", "#C6C6C6", "#DCDCDC", "#F2F2F2"],
  colored: ["#2F1B15", "#3A4E48", "#4B3621", "#2A7A6B", "#4A5B6E", "#8B5A0E", "#B83D2A", "#9D7A1F", "#D88C6C", "#C3C3C3", "#E8DCCA"],
  gold: ["#000000", "#361c1b", "#2d2433", "#4f4254", "#754232", "#cd894a", "#b092a7", "#e6b983", "#c3c3c3", "#fff8bc", "#ffffff"],
  aqua: ["#000924", "#041b38", "#093659", "#145d87", "#228399", "#31b0b0", "#46cfb3", "#73f0c6", "#abffd1", "#d9ffe2", "#c3c3c3"],
  dull: ["#372f3a", "#464459", "#545e72", "#5d7680", "#6a9395", "#7bad9f", "#8eb29a", "#b3c6b4", "#c5d2ce", "#d3d8d9", "#c3c3c3"],
  dry: ["#2f2a35", "#443d38", "#625653", "#9a5d40", "#a98143", "#3b4262", "#6f7777", "#989da0", "#c2b8a9", "#d9dbba", "#c3c3c3"],
  greens: ["#e8f1a6", "#cad670", "#a3c255", "#6fa341", "#498f45", "#387450", "#2d5c56", "#1f3741", "#1e2029", "#16161c", "#c3c3c3"],
  chrome: ["#cdc9b6", "#8e8c82", "#504f49", "#131311", "#9bb5a4", "#6da392", "#48907f", "#23937f", "#34665a", "#223c35", "#c3c3c3"],
  beach: ["#e43113", "#ed8848", "#f2bf87", "#f5deb3", "#f6e9c7", "#d6f4e9", "#aaebda", "#7be2d2", "#23d2d2", "#229bb9", "#c3c3c3"],
  jolly: ["#a64848", "#e96464", "#cdb195", "#ebccae", "#c6c9bd", "#ecf0da", "#383857", "#5254b1", "#5b6ee1", "#639bff", "#c3c3c3"],
  gothic: ["#0e0e12", "#1a1a24", "#333346", "#535373", "#6a6a8c", "#8080a4", "#9393b2", "#a6a6bf", "#c1c1d2", "#c3c3c3", "#e6e6ec"],
}

const PALETTE_SESSION_SEED_KEY = "trakzi-chart-palette-seed"

/**
 * Shuffle a palette so adjacent colors are visually distinct.
 * If sessionSeed is provided, uses that for the PRNG so the order is stable for the session
 * but re-randomizes on hard reload (new session, new seed). If omitted (e.g. SSR), seed is
 * derived from palette content for deterministic output.
 */
function shufflePaletteColors(palette: string[], sessionSeed?: number): string[] {
  if (palette.length <= 2) return palette
  let seed: number
  if (sessionSeed !== undefined) {
    seed = (sessionSeed >>> 0) || 1
  } else {
    seed = 0
    for (const color of palette) {
      for (let i = 0; i < color.length; i++) {
        seed = ((seed << 5) - seed + color.charCodeAt(i)) | 0
      }
    }
  }
  const seededRandom = () => {
    seed = (seed * 1664525 + 1013904223) | 0
    return (seed >>> 0) / 4294967296
  }
  const shuffled = [...palette]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(seededRandom() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

const ColorSchemeContext = createContext<ColorSchemeContextType | undefined>(undefined)

export function ColorSchemeProvider({ children }: { children: ReactNode }) {
  const [colorScheme, setColorSchemeState] = useState<ColorScheme>("sunset")
  const [mounted, setMounted] = useState(false)
  const { resolvedTheme } = useTheme()
  const { preferences, isServerSynced, updatePagePreferences } = useUserPreferences()
  const hasSyncedFromDb = useRef(false)
  const sessionSeedRef = useRef<number | null>(null)

  // Load from localStorage on mount (instant display)
  useEffect(() => {
    setMounted(true)
    const saved = localStorage.getItem(COLOR_SCHEME_STORAGE_KEY)
    if (saved && colorPalettes[saved as ColorScheme]) {
      setColorSchemeState(saved as ColorScheme)
    }
  }, [])

  // Sync from DB when available (DB is source of truth)
  useEffect(() => {
    if (!isServerSynced || hasSyncedFromDb.current) return
    hasSyncedFromDb.current = true
    const dbScheme = preferences.settings?.color_scheme
    if (dbScheme && colorPalettes[dbScheme as ColorScheme]) {
      setColorSchemeState(dbScheme as ColorScheme)
    }
  }, [isServerSynced, preferences.settings?.color_scheme])

  // Save to localStorage + DB when changed
  const setColorScheme = useCallback((scheme: ColorScheme) => {
    setColorSchemeState(scheme)
    if (typeof window !== 'undefined') {
      localStorage.setItem(COLOR_SCHEME_STORAGE_KEY, scheme)
    }
    updatePagePreferences("settings", { color_scheme: scheme })
  }, [updatePagePreferences])

  // Returns the raw palette without any theme-based trimming or neutral filtering
  const getRawPalette = useCallback(() => {
    return colorPalettes[colorScheme] || colorPalettes.sunset
  }, [colorScheme])

  // Returns a theme-aware palette:
  // - Filters out the neutral #c3c3c3
  // - Dark mode: skips the first (darkest) color so charts remain visible
  // - Light mode: skips the last (lightest) color so charts remain visible
  const getPalette = useCallback(() => {
    const raw = colorPalettes[colorScheme] || colorPalettes.sunset
    const filtered = raw.filter(c => c !== "#c3c3c3")
    const isDark = resolvedTheme === "dark"
    if (isDark) {
      return filtered.slice(1)     // skip darkest
    }
    return filtered.slice(0, -1)   // skip lightest
  }, [colorScheme, resolvedTheme])

  // Returns the theme-aware palette shuffled so adjacent colors are visually distinct.
  // Uses a session-stored seed: same order for the tab session; new order on hard reload (new session).
  const getShuffledPalette = useCallback(() => {
    const palette = getPalette()
    if (typeof window === "undefined") {
      return shufflePaletteColors(palette)
    }
    if (sessionSeedRef.current === null) {
      const stored = sessionStorage.getItem(PALETTE_SESSION_SEED_KEY)
      if (stored) {
        const parsed = parseInt(stored, 10)
        sessionSeedRef.current = Number.isNaN(parsed) ? null : parsed
      }
      if (sessionSeedRef.current === null) {
        const newSeed = Math.floor(Math.random() * 0xffffffff)
        sessionStorage.setItem(PALETTE_SESSION_SEED_KEY, String(newSeed))
        sessionSeedRef.current = newSeed
      }
    }
    return shufflePaletteColors(palette, sessionSeedRef.current ?? undefined)
  }, [getPalette])

  // Returns palette indices 1 to n-2 (middle only), shuffled. Same session seed as getShuffledPalette.
  const getMiddleShuffledPalette = useCallback(() => {
    const palette = getPalette()
    const middle = palette.length > 2 ? palette.slice(1, -1) : palette
    if (typeof window === "undefined") {
      return shufflePaletteColors(middle)
    }
    if (sessionSeedRef.current === null) {
      const stored = sessionStorage.getItem(PALETTE_SESSION_SEED_KEY)
      if (stored) {
        const parsed = parseInt(stored, 10)
        sessionSeedRef.current = Number.isNaN(parsed) ? null : parsed
      }
      if (sessionSeedRef.current === null) {
        const newSeed = Math.floor(Math.random() * 0xffffffff)
        sessionStorage.setItem(PALETTE_SESSION_SEED_KEY, String(newSeed))
        sessionSeedRef.current = newSeed
      }
    }
    return shufflePaletteColors(middle, sessionSeedRef.current ?? undefined)
  }, [getPalette])

  // Avoid hydration mismatch
  if (!mounted) {
    const fallback = colorPalettes.sunset.slice(0, -1)
    const middleFallback = fallback.length > 2 ? fallback.slice(1, -1) : fallback
    return (
      <ColorSchemeContext.Provider value={{ colorScheme: "sunset", setColorScheme, getPalette: () => fallback, getShuffledPalette: () => shufflePaletteColors(fallback), getMiddleShuffledPalette: () => shufflePaletteColors(middleFallback), getRawPalette: () => colorPalettes.sunset }}>
        {children}
      </ColorSchemeContext.Provider>
    )
  }

  return (
    <ColorSchemeContext.Provider value={{ colorScheme, setColorScheme, getPalette, getShuffledPalette, getMiddleShuffledPalette, getRawPalette }}>
      {children}
    </ColorSchemeContext.Provider>
  )
}

export function useColorScheme() {
  const context = useContext(ColorSchemeContext)
  if (context === undefined) {
    throw new Error("useColorScheme must be used within a ColorSchemeProvider")
  }
  return context
}
