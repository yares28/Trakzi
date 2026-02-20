"use client"

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react"
import { useRouter } from "next/navigation"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface DemoModeContextValue {
  isDemoMode: boolean
  enterDemo: () => void
  exitDemo: () => void
}

const COOKIE_NAME = "trakzi-demo-mode"

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------
const DemoModeContext = createContext<DemoModeContextValue>({
  isDemoMode: false,
  enterDemo: () => {},
  exitDemo: () => {},
})

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`))
  return match ? decodeURIComponent(match[1]) : null
}

function setCookie(name: string, value: string, days = 1) {
  const expires = new Date(Date.now() + days * 864e5).toUTCString()
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`
}

function deleteCookie(name: string) {
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax`
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------
export function DemoModeProvider({ children }: { children: ReactNode }) {
  const router = useRouter()
  const [isDemoMode, setIsDemoMode] = useState(false)

  // Hydrate from cookie on mount
  useEffect(() => {
    setIsDemoMode(getCookie(COOKIE_NAME) === "true")
  }, [])

  const enterDemo = useCallback(() => {
    setCookie(COOKIE_NAME, "true")
    setIsDemoMode(true)
    router.push("/home")
  }, [router])

  const exitDemo = useCallback(() => {
    deleteCookie(COOKIE_NAME)
    setIsDemoMode(false)
    router.push("/")
  }, [router])

  return (
    <DemoModeContext.Provider value={{ isDemoMode, enterDemo, exitDemo }}>
      {children}
    </DemoModeContext.Provider>
  )
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------
export function useDemoMode() {
  return useContext(DemoModeContext)
}

// ---------------------------------------------------------------------------
// Server-side helper (for use in server components / middleware)
// ---------------------------------------------------------------------------
export function isDemoCookie(cookieHeader: string | null): boolean {
  if (!cookieHeader) return false
  return cookieHeader.includes(`${COOKIE_NAME}=true`)
}
