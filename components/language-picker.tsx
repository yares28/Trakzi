"use client"

import React, { useState, useRef, useEffect } from "react"
import { usePathname, useRouter } from "next/navigation"
import { Globe } from "lucide-react"

const enToEs: Record<string, string> = {
  "/": "/es",
  "/features": "/es/features",
  "/pricing": "/es/precios",
  "/docs": "/es/docs",
  "/receipt-scanner": "/es/escaner-tickets",
  "/split-expenses": "/es/dividir-gastos",
  "/grocery-tracker": "/es/gastos-supermercado",
  "/csv-import": "/es/importar-csv",
}

const esToEn: Record<string, string> = {
  "/es": "/",
  "/es/features": "/features",
  "/es/precios": "/pricing",
  "/es/docs": "/docs",
  "/es/escaner-tickets": "/receipt-scanner",
  "/es/dividir-gastos": "/split-expenses",
  "/es/gastos-supermercado": "/grocery-tracker",
  "/es/importar-csv": "/csv-import",
}

function getOtherHref(pathname: string, isEs: boolean): string {
  if (isEs) {
    if (esToEn[pathname]) return esToEn[pathname]
    if (pathname.startsWith("/es/docs/")) return "/docs"
    if (pathname.startsWith("/es/compare/")) return pathname.replace("/es/compare/", "/compare/")
    return "/"
  } else {
    if (enToEs[pathname]) return enToEs[pathname]
    if (pathname.startsWith("/docs/")) return "/es/docs"
    if (pathname.startsWith("/compare/")) return pathname.replace("/compare/", "/es/compare/")
    return "/es"
  }
}

export function LanguagePicker() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const pathname = usePathname()
  const router = useRouter()

  const isEs = pathname?.startsWith("/es")
  const currentLang = isEs ? "ES" : "EN"
  const otherHref = getOtherHref(pathname!, !!isEs)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") setOpen(false)
  }

  function switchLang() {
    document.cookie = `trakzi-lang=${isEs ? "en" : "es"}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`
    const search = typeof window !== "undefined" ? window.location.search : ""
    const hash = typeof window !== "undefined" ? window.location.hash : ""
    router.push(otherHref + search + hash)
    setOpen(false)
  }

  return (
    <div ref={ref} className="relative" onKeyDown={handleKeyDown}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
        aria-label="Switch language"
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <Globe className="h-4 w-4" />
        <span className="text-xs font-medium">{currentLang}</span>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-32 rounded-lg border border-border bg-popover shadow-xl py-1 z-[10000]" role="listbox" aria-label="Language">
          <button
            type="button"
            role="option"
            aria-selected={!isEs}
            onClick={() => {
              if (isEs) switchLang()
              else setOpen(false)
            }}
            className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 transition-colors ${
              !isEs ? "text-primary bg-primary/5" : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
            }`}
          >
            🇬🇧 English
            {!isEs && <span className="ml-auto text-xs text-primary">✓</span>}
          </button>
          <button
            type="button"
            role="option"
            aria-selected={!!isEs}
            onClick={() => {
              if (!isEs) switchLang()
              else setOpen(false)
            }}
            className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 transition-colors ${
              isEs ? "text-primary bg-primary/5" : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
            }`}
          >
            🇪🇸 Español
            {isEs && <span className="ml-auto text-xs text-primary">✓</span>}
          </button>
        </div>
      )}
    </div>
  )
}
