"use client"

import { createContext, useContext, useState, ReactNode } from "react"

type ColorScheme = "dark" | "colored" | "gold" | "aqua" | "dull" | "dry" | "greens" | "chrome" | "beach" | "jolly" | "gothic"

interface ColorSchemeContextType {
  colorScheme: ColorScheme
  setColorScheme: (scheme: ColorScheme) => void
  getPalette: () => string[]
}

// Color palettes
export const colorPalettes: Record<ColorScheme, string[]> = {
  dark: ["#DFDFDF", "#C3C3C3", "#ACACAC", "#8B8B8B", "#696969", "#464646", "#2F2F2F", "#252525"],
  colored: ["#8b6f47", "#b83d2a", "#9d7a1f", "#8b5a0e", "#2a7a6b", "#C3C3C3"],
  gold: ["#000000", "#361c1b", "#754232", "#cd894a", "#e6b983", "#fff8bc", "#ffffff", "#2d2433", "#4f4254", "#b092a7", "#c3c3c3"],
  aqua: ["#000924", "#041b38", "#093659", "#145d87", "#228399", "#31b0b0", "#46cfb3", "#73f0c6", "#abffd1", "#d9ffe2", "#c3c3c3"],
  dull: ["#372f3a", "#464459", "#545e72", "#5d7680", "#6a9395", "#7bad9f", "#8eb29a", "#b3c6b4", "#c5d2ce", "#d3d8d9", "#c3c3c3"],
  dry: ["#2f2a35", "#443d38", "#625653", "#9a5d40", "#a98143", "#3b4262", "#6f7777", "#989da0", "#c2b8a9", "#d9dbba", "#c3c3c3"],
  greens: ["#e8f1a6", "#cad670", "#a3c255", "#6fa341", "#498f45", "#387450", "#2d5c56", "#1f3741", "#1e2029", "#16161c", "#c3c3c3"],
  chrome: ["#cdc9b6", "#8e8c82", "#504f49", "#131311", "#9bb5a4", "#6da392", "#48907f", "#23937f", "#34665a", "#223c35", "#c3c3c3"],
  beach: ["#e43113", "#ed8848", "#f2bf87", "#f5deb3", "#f6e9c7", "#d6f4e9", "#aaebda", "#7be2d2", "#23d2d2", "#229bb9", "#c3c3c3"],
  jolly: ["#a64848", "#e96464", "#cdb195", "#ebccae", "#c6c9bd", "#ecf0da", "#383857", "#5254b1", "#5b6ee1", "#639bff", "#c3c3c3"],
  gothic: ["#0e0e12", "#1a1a24", "#333346", "#535373", "#8080a4", "#a6a6bf", "#c1c1d2", "#e6e6ec", "#c3c3c3"],
}

const ColorSchemeContext = createContext<ColorSchemeContextType | undefined>(undefined)

export function ColorSchemeProvider({ children }: { children: ReactNode }) {
  const [colorScheme, setColorScheme] = useState<ColorScheme>("colored")

  const getPalette = () => {
    return colorPalettes[colorScheme] || colorPalettes.colored
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


