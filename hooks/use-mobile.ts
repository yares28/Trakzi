import * as React from "react"

const MOBILE_BREAKPOINT = 768

/** Matches Tailwind `lg` — chart grids use a single full-width column below this width (phones + tablets). */
const CHART_GRID_LG_PX = 1024

export function useIsBelowLg() {
  const [isBelowLg, setIsBelowLg] = React.useState<boolean>(() => {
    if (typeof window === "undefined") return false
    return window.matchMedia(`(max-width: ${CHART_GRID_LG_PX - 1}px)`).matches
  })

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${CHART_GRID_LG_PX - 1}px)`)
    const onChange = () => setIsBelowLg(mql.matches)
    mql.addEventListener("change", onChange)
    setIsBelowLg(mql.matches)
    return () => mql.removeEventListener("change", onChange)
  }, [])

  return isBelowLg
}

export function useIsMobile() {
  // Synchronous initialization: return correct value on first render
  // This fixes the stale closure issue in sidebar toggleSidebar callback
  const [isMobile, setIsMobile] = React.useState<boolean>(() => {
    if (typeof window === 'undefined') return false
    return window.innerWidth < MOBILE_BREAKPOINT
  })

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    }
    mql.addEventListener("change", onChange)
    // Still set on mount in case SSR value differs (though it shouldn't with lazy init)
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    return () => mql.removeEventListener("change", onChange)
  }, [])

  return isMobile
}
