"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { LanguagePicker } from "@/components/language-picker"
import { StickyFooter } from "@/components/sticky-footer"

export function DocsShell({ children, locale = "en" }: { children: React.ReactNode; locale?: "en" | "es" }) {
  const isEs = locale === "es"
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  useEffect(() => {
    if (!isMobileMenuOpen) return
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setIsMobileMenuOpen(false) }
    document.addEventListener("keydown", onKey)
    document.body.style.overflow = "hidden"
    return () => {
      document.removeEventListener("keydown", onKey)
      document.body.style.overflow = ""
    }
  }, [isMobileMenuOpen])

  const navLinks = isEs
    ? [
        { label: "Características", href: "/es/features" },
        { label: "Documentación", href: "/es/docs" },
        { label: "Precios", href: "/es/precios" },
      ]
    : [
        { label: "Features", href: "/features" },
        { label: "Docs", href: "/docs" },
        { label: "Pricing", href: "/pricing" },
      ]

  return (
    <div className="min-h-screen w-full bg-background text-foreground">

      {/* Background radial gradient */}
      <div
        className="absolute inset-0 z-0 pointer-events-none"
        style={{ background: "radial-gradient(ellipse 50% 35% at 50% 0%, rgba(226, 232, 240, 0.12), transparent 60%)" }}
      />

      {/* Content column */}
      <div className="relative z-10">

        {/* Desktop Header */}
        <header className="sticky top-4 z-[9999] mx-auto max-w-5xl hidden md:flex items-center justify-between rounded-full bg-background/80 backdrop-blur-sm border border-border/50 shadow-lg px-4 py-2">
          <Link href={isEs ? "/es" : "/"} className="flex items-center gap-2">
            <Image src="/Trakzi/TrakzilogoB.png" alt="Trakzi" width={120} height={32} className="h-8 w-auto" draggable={false} />
          </Link>

          <div className="absolute inset-0 hidden flex-1 flex-row items-center justify-center space-x-2 text-sm font-medium text-muted-foreground md:flex pointer-events-none">
            {navLinks.map((link) => (
              <Link key={link.href} href={link.href} className="relative px-4 py-2 text-muted-foreground hover:text-foreground transition-colors pointer-events-auto">
                {link.label}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <LanguagePicker />
            <Link
              href="/sign-in"
              className="rounded-md font-medium relative cursor-pointer hover:-translate-y-0.5 transition duration-200 inline-block text-center border border-border bg-background/50 hover:bg-background/80 text-foreground px-4 py-2 text-sm"
            >
              {isEs ? "Iniciar Sesión" : "Log In"}
            </Link>
            <Link
              href="/sign-up"
              className="rounded-md font-bold relative cursor-pointer hover:-translate-y-0.5 transition duration-200 inline-block text-center bg-gradient-to-b from-primary to-primary/80 text-primary-foreground shadow-[0px_2px_0px_0px_rgba(255,255,255,0.3)_inset] px-4 py-2 text-sm"
            >
              {isEs ? "Registrarse" : "Sign Up"}
            </Link>
          </div>
        </header>

        {/* Mobile Header */}
        <header className="sticky top-4 z-[9999] mx-4 flex md:hidden items-center justify-between rounded-full bg-background/80 backdrop-blur-sm border border-border/50 shadow-lg px-4 py-3">
          <Link href={isEs ? "/es" : "/"} className="flex items-center gap-2">
            <Image src="/Trakzi/TrakzilogoB.png" alt="Trakzi" width={100} height={28} className="h-7 w-auto" draggable={false} />
          </Link>
          <div className="flex items-center gap-1">
            <LanguagePicker />
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="flex items-center justify-center w-10 h-10 rounded-full bg-background/50 border border-border/50 transition-colors hover:bg-background/80"
              aria-label="Toggle menu"
              aria-expanded={isMobileMenuOpen}
              aria-controls="docs-mobile-menu"
            >
              <div className="flex flex-col items-center justify-center w-5 h-5 space-y-1">
                <span className={`block w-4 h-0.5 bg-foreground transition-all duration-300 ${isMobileMenuOpen ? "rotate-45 translate-y-1.5" : ""}`} />
                <span className={`block w-4 h-0.5 bg-foreground transition-all duration-300 ${isMobileMenuOpen ? "opacity-0" : ""}`} />
                <span className={`block w-4 h-0.5 bg-foreground transition-all duration-300 ${isMobileMenuOpen ? "-rotate-45 -translate-y-1.5" : ""}`} />
              </div>
            </button>
          </div>
        </header>

        {/* Mobile Menu Overlay */}
        {isMobileMenuOpen && (
          <div
            className="fixed inset-0 z-[9998] bg-black/50 md:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <div
              id="docs-mobile-menu"
              className="absolute top-20 left-4 right-4 bg-background/95 backdrop-blur-md border border-border/50 rounded-2xl shadow-2xl p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <nav className="flex flex-col space-y-2">
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="px-4 py-3 text-lg font-medium text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-background/50"
                  >
                    {link.label}
                  </Link>
                ))}
                <div className="border-t border-border/50 pt-4 mt-2 flex flex-col space-y-3">
                  <Link
                    href="/sign-in"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="px-4 py-3 text-lg font-medium text-center border border-border bg-background/50 hover:bg-background/80 text-foreground rounded-lg transition-all"
                  >
                    {isEs ? "Iniciar Sesión" : "Log In"}
                  </Link>
                  <Link
                    href="/sign-up"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="px-4 py-3 text-lg font-bold text-center bg-gradient-to-b from-primary to-primary/80 text-primary-foreground rounded-lg shadow-lg"
                  >
                    {isEs ? "Registrarse" : "Sign Up"}
                  </Link>
                </div>
              </nav>
            </div>
          </div>
        )}

        <main className="flex-1 bg-transparent">
          {children}
        </main>

        <StickyFooter locale={locale} />
      </div>
    </div>
  )
}
