"use client"

import { useEffect } from "react"

export function ForceDark() {
  useEffect(() => {
    document.documentElement.classList.add("dark")
    return () => {
      // When leaving a landing page, restore the user's stored app theme
      try {
        const stored = localStorage.getItem("trakzi-theme")
        if (stored === "light") {
          document.documentElement.classList.remove("dark")
        }
        // If stored is "dark" or missing, keep the dark class — ThemeProvider will manage it
      } catch {
        // ignore
      }
    }
  }, [])

  return null
}
