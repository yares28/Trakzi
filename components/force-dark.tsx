"use client"

import { useEffect } from "react"

export function ForceDark() {
  useEffect(() => {
    document.documentElement.classList.add("dark")
    return () => {
      // Don't remove — let ThemeProvider handle cleanup
    }
  }, [])

  return null
}
