"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { LanguagePicker } from "@/components/language-picker"

export interface LandingNavLink {
  label: string
  href: string
}

export interface LandingHeaderProps {
  locale: "en" | "es"
  logoHref: string
  navLinks: LandingNavLink[]
  faqLabel: string
  faqScrollId?: string
  loginLabel: string
  loginHref: string
  signupLabel: string
  signupHref: string
}

export function LandingHeader({
  logoHref,
  navLinks,
  faqLabel,
  faqScrollId,
  loginLabel,
  loginHref,
  signupLabel,
  signupHref,
}: LandingHeaderProps) {
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 100)
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  const scrollToSection = (id: string) => {
    setIsMobileMenuOpen(false)
    setTimeout(() => {
      const el = document.getElementById(id)
      if (!el) return
      const offset = el.getBoundingClientRect().top + window.pageYOffset - 120
      window.scrollTo({ top: offset, behavior: "smooth" })
    }, 100)
  }

  return (
    <>
      {/* Desktop Header — hidden on mobile via CSS */}
      <header
        className={`sticky top-4 z-50 mx-auto hidden w-full flex-row items-center justify-between self-start rounded-full bg-background md:flex border border-border/50 shadow-lg transition-all duration-300 ${
          isScrolled ? "max-w-3xl px-2" : "max-w-5xl px-4"
        } py-2`}
        style={{
          willChange: "transform",
          transform: "translateZ(0)",
          backfaceVisibility: "hidden",
          perspective: "1000px",
        }}
      >
        <Link
          className={`z-50 flex items-center justify-center gap-2 transition-all duration-300 ${isScrolled ? "ml-4" : ""}`}
          href={logoHref}
        >
          <Image
            src="/Trakzi/TrakzilogoB.png"
            alt=""
            width={120}
            height={32}
            className="h-8 w-auto"
            draggable={false}
          />
        </Link>

        <div className="absolute inset-0 hidden flex-1 flex-row items-center justify-center space-x-2 text-sm font-medium text-muted-foreground pointer-events-none md:flex md:space-x-2">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="relative px-4 py-2 text-muted-foreground hover:text-foreground transition-colors pointer-events-auto"
            >
              <span className="relative z-20">{link.label}</span>
            </Link>
          ))}
          {faqScrollId && (
            <button
              type="button"
              className="relative px-4 py-2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer pointer-events-auto"
              onClick={() => scrollToSection(faqScrollId)}
            >
              <span className="relative z-20">{faqLabel}</span>
            </button>
          )}
        </div>

        {!isMobileMenuOpen && (
          <div className="flex items-center gap-3">
            <LanguagePicker />
            <Link
              href={loginHref}
              className="rounded-md font-medium relative cursor-pointer hover:-translate-y-0.5 transition duration-200 inline-block text-center border border-border bg-background/50 hover:bg-background/80 text-foreground px-4 py-2 text-sm"
            >
              {loginLabel}
            </Link>
            <Link
              href={signupHref}
              className="rounded-md font-bold relative cursor-pointer hover:-translate-y-0.5 transition duration-200 inline-block text-center bg-gradient-to-b from-primary to-primary/80 text-primary-foreground shadow-[0px_2px_0px_0px_rgba(255,255,255,0.3)_inset] px-4 py-2 text-sm"
            >
              {signupLabel}
            </Link>
          </div>
        )}
      </header>

      {/* Mobile Header — visible on mobile, hidden on desktop via CSS */}
      <header className="sticky top-4 z-50 mx-4 flex w-auto flex-row items-center justify-between rounded-full bg-background border border-border/50 shadow-lg md:hidden px-4 py-3">
        <Link className="flex items-center justify-center gap-2" href={logoHref}>
          <Image src="/Trakzi/TrakzilogoB.png" alt="Trakzi" width={120} height={28} className="h-7 w-auto" draggable={false} />
        </Link>
        <div className="flex items-center gap-1">
          <LanguagePicker />
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="flex items-center justify-center w-10 h-10 rounded-full bg-background/50 border border-border/50 transition-colors hover:bg-background/80"
            aria-label="Toggle menu"
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
        <div className="fixed inset-0 z-50 bg-black/50 md:hidden">
          <div className="absolute top-20 left-4 right-4 bg-background/95 backdrop-blur-md border border-border/50 rounded-2xl shadow-2xl p-6">
            <nav className="flex flex-col space-y-4">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="text-left px-4 py-3 text-lg font-medium text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-background/50"
                >
                  {link.label}
                </Link>
              ))}
              {faqScrollId && (
                <button
                  onClick={() => scrollToSection(faqScrollId)}
                  className="text-left px-4 py-3 text-lg font-medium text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-background/50"
                >
                  {faqLabel}
                </button>
              )}
              <div className="border-t border-border/50 pt-4 mt-4 flex flex-col space-y-3">
                <Link
                  href={loginHref}
                  className="px-4 py-3 text-lg font-medium text-center border border-border bg-background/50 hover:bg-background/80 text-foreground rounded-lg transition-all duration-200 hover:-translate-y-0.5"
                >
                  {loginLabel}
                </Link>
                <Link
                  href={signupHref}
                  className="px-4 py-3 text-lg font-bold text-center bg-gradient-to-b from-primary to-primary/80 text-primary-foreground rounded-lg shadow-lg hover:-translate-y-0.5 transition-all duration-200"
                >
                  {signupLabel}
                </Link>
              </div>
            </nav>
          </div>
        </div>
      )}
    </>
  )
}
