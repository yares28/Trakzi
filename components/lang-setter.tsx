"use client"

import { useEffect } from "react"
import { usePathname } from "next/navigation"

export function LangSetter() {
  const pathname = usePathname()

  useEffect(() => {
    if (pathname?.startsWith("/es")) {
      document.documentElement.lang = "es"
    } else {
      document.documentElement.lang = "en"
    }
  }, [pathname])

  return null
}
