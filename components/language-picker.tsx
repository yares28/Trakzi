"use client"

import { useState, useRef, useEffect } from "react"
import { usePathname, useRouter } from "next/navigation"
import { Globe } from "lucide-react"

const enToEs: Record<string, string> = {
  "/": "/es",
  "/features": "/es/features",
  "/receipt-scanner": "/es/escaner-tickets",
  "/split-expenses": "/es/dividir-gastos",
  "/grocery-tracker": "/es/gastos-supermercado",
  "/csv-import": "/es/importar-csv",
}

const esToEn: Record<string, string> = {
  "/es": "/",
  "/es/features": "/features",
  "/es/escaner-tickets": "/receipt-scanner",
  "/es/dividir-gastos": "/split-expenses",
  "/es/gastos-supermercado": "/grocery-tracker",
  "/es/importar-csv": "/csv-import",
}

export function LanguagePicker() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const pathname = usePathname()
  const router = useRouter()

  const isEs = pathname?.startsWith("/es")
  const currentLang = isEs ? "ES" : "EN"
  const otherLang = isEs ? "EN" : "ES"
  const otherHref = isEs ? esToEn[pathname!] || "/" : enToEs[pathname!] || "/es"

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  function switchLang() {
    document.cookie = `trakzi-lang=${isEs ? "en" : "es"}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`
    router.push(otherHref)
    setOpen(false)
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-sm text-zinc-400 hover:text-white hover:bg-zinc-800/50 transition-colors"
        aria-label="Switch language"
      >
        <Globe className="h-4 w-4" />
        <span className="text-xs font-medium">{currentLang}</span>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-32 rounded-lg border border-zinc-800 bg-zinc-950 shadow-xl py-1 z-[10000]">
          <button
            onClick={() => {
              if (isEs) switchLang()
              else setOpen(false)
            }}
            className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 transition-colors ${
              !isEs ? "text-[#fe985b] bg-[#fe985b]/5" : "text-zinc-400 hover:text-white hover:bg-zinc-800/50"
            }`}
          >
            🇬🇧 English
            {!isEs && <span className="ml-auto text-xs text-[#fe985b]">✓</span>}
          </button>
          <button
            onClick={() => {
              if (!isEs) switchLang()
              else setOpen(false)
            }}
            className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 transition-colors ${
              isEs ? "text-[#fe985b] bg-[#fe985b]/5" : "text-zinc-400 hover:text-white hover:bg-zinc-800/50"
            }`}
          >
            🇪🇸 Español
            {isEs && <span className="ml-auto text-xs text-[#fe985b]">✓</span>}
          </button>
        </div>
      )}
    </div>
  )
}
