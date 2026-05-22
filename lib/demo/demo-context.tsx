"use client"

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react"
import { useAuth } from "@clerk/nextjs"
import { usePathname, useRouter } from "next/navigation"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface DemoModeContextValue {
  isDemoMode: boolean
  isBannerVisible: boolean
  enterDemo: () => void
  exitDemo: () => void
  clearDemoMode: () => void
  dismissBanner: () => void
}

const COOKIE_NAME = "trakzi-demo-mode"
const BANNER_DISMISSED_KEY = "trakzi-demo-banner-dismissed"

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------
const DemoModeContext = createContext<DemoModeContextValue>({
  isDemoMode: false,
  isBannerVisible: false,
  enterDemo: () => {},
  exitDemo: () => {},
  clearDemoMode: () => {},
  dismissBanner: () => {},
})

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`))
  return match ? decodeURIComponent(match[1]) : null
}

function setCookie(name: string, value: string) {
  // Session-scoped on purpose: demo mode is a temporary preview state, not a login.
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; SameSite=Lax`
}

function deleteCookie(name: string) {
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax`
}

function getSessionFlag(name: string): boolean {
  if (typeof window === "undefined") return false
  return window.sessionStorage.getItem(name) === "true"
}

function setSessionFlag(name: string, value: boolean) {
  if (typeof window === "undefined") return
  if (value) {
    window.sessionStorage.setItem(name, "true")
    return
  }
  window.sessionStorage.removeItem(name)
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------
export function DemoModeProvider({ children }: { children: ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { isLoaded, userId } = useAuth()
  const [isDemoMode, setIsDemoMode] = useState(false)
  const [isBannerVisible, setIsBannerVisible] = useState(false)

  const clearDemoState = useCallback(() => {
    deleteCookie(COOKIE_NAME)
    setSessionFlag(BANNER_DISMISSED_KEY, false)
    setIsDemoMode(false)
    setIsBannerVisible(false)
  }, [])

  // Hydrate from cookie on mount
  useEffect(() => {
    const demoActive = getCookie(COOKIE_NAME) === "true"
    setIsDemoMode(demoActive)
    setIsBannerVisible(demoActive && !getSessionFlag(BANNER_DISMISSED_KEY))
  }, [])

  useEffect(() => {
    if (!isLoaded) return

    if (userId) {
      clearDemoState()
      return
    }

    const demoActive = getCookie(COOKIE_NAME) === "true"
    setIsDemoMode(demoActive)
    setIsBannerVisible(demoActive && !getSessionFlag(BANNER_DISMISSED_KEY))
  }, [clearDemoState, isLoaded, userId])

  useEffect(() => {
    if (!pathname) return
    if (pathname.startsWith("/sign-in") || pathname.startsWith("/sign-up")) {
      clearDemoState()
    }
  }, [clearDemoState, pathname])

  const enterDemo = useCallback(() => {
    setCookie(COOKIE_NAME, "true")
    setSessionFlag(BANNER_DISMISSED_KEY, false)
    setIsDemoMode(true)
    setIsBannerVisible(true)
    router.push("/home")
  }, [router])

  const exitDemo = useCallback(() => {
    clearDemoState()
    router.push("/")
  }, [clearDemoState, router])

  const clearDemoMode = useCallback(() => {
    clearDemoState()
  }, [clearDemoState])

  const dismissBanner = useCallback(() => {
    setSessionFlag(BANNER_DISMISSED_KEY, true)
    setIsBannerVisible(false)
  }, [])

  return (
    // suppressHydrationWarning: isDemoMode is hydrated from cookie on mount,
    // so server (false) and client may differ until first paint.
    <DemoModeContext.Provider value={{ isDemoMode, isBannerVisible, enterDemo, exitDemo, clearDemoMode, dismissBanner }}>
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
