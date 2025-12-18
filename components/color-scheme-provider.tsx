"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from "react"

type ColorScheme = "sunset" | "dark" | "colored" | "gold" | "aqua" | "dull" | "dry" | "greens" | "chrome" | "beach" | "jolly" | "gothic"

interface ColorSchemeContextType {
  colorScheme: ColorScheme
  setColorScheme: (scheme: ColorScheme) => void
  getPalette: () => string[]
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

const ColorSchemeContext = createContext<ColorSchemeContextType | undefined>(undefined)

export function ColorSchemeProvider({ children }: { children: ReactNode }) {
  const [colorScheme, setColorSchemeState] = useState<ColorScheme>("sunset")
  const [mounted, setMounted] = useState(false)

  // Load from localStorage on mount
  useEffect(() => {
    setMounted(true)
    const saved = localStorage.getItem(COLOR_SCHEME_STORAGE_KEY)
    if (saved && colorPalettes[saved as ColorScheme]) {
      setColorSchemeState(saved as ColorScheme)
    }
  }, [])

  // Save to localStorage when changed
  const setColorScheme = (scheme: ColorScheme) => {
    setColorSchemeState(scheme)
    if (typeof window !== 'undefined') {
      localStorage.setItem(COLOR_SCHEME_STORAGE_KEY, scheme)
    }
  }

  const getPalette = () => {
    return colorPalettes[colorScheme] || colorPalettes.sunset
  }

  // Avoid hydration mismatch
  if (!mounted) {
    return (
      <ColorSchemeContext.Provider value={{ colorScheme: "sunset", setColorScheme, getPalette: () => colorPalettes.sunset }}>
        {children}
      </ColorSchemeContext.Provider>
    )
  }

  return (
    <ColorSchemeContext.Provider value={{ colorScheme, setColorScheme, getPalette }}>
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
