"use client"

import { useEffect } from "react"
import { usePathname } from "next/navigation"

export function LangSetter() {
  const pathname = usePathname()

  useEffect(() => {
    const isEs = pathname?.startsWith("/es")
    const locale = isEs ? "es" : "en"
    document.documentElement.lang = locale
    // Keep cookie in sync with actual URL so server-side middleware/redirects agree
    document.cookie = `trakzi-lang=${locale}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`
  }, [pathname])

  return null
}
