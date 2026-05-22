"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

interface DocNavItem {
  title: string
  href: string
}

interface DocNavGroup {
  title: string
  items: DocNavItem[]
}

function getDocsNav(locale: "en" | "es"): DocNavGroup[] {
  if (locale === "es") {
    return [
      {
        title: "Para Empezar",
        items: [
          { title: "Introducción", href: "/es/docs" },
        ],
      },
      {
        title: "Guías",
        items: [
          { title: "Cómo Hacer un Presupuesto", href: "/es/docs/como-hacer-un-presupuesto" },
          { title: "Cómo Controlar Gastos", href: "/es/docs/como-controlar-gastos" },
          { title: "Dividir Gastos en un Piso", href: "/es/docs/como-dividir-gastos-piso" },
          { title: "Ahorro en Supermercado", href: "/es/docs/consejos-ahorro-supermercado" },
        ],
      },
      {
        title: "Comparaciones",
        items: [
          { title: "Trakzi vs YNAB", href: "/es/compare/trakzi-vs-ynab" },
          { title: "Trakzi vs Splitwise", href: "/es/compare/trakzi-vs-splitwise" },
          { title: "Trakzi vs Monarch", href: "/es/compare/trakzi-vs-monarch" },
        ],
      },
    ]
  }

  return [
    {
      title: "Getting Started",
      items: [
        { title: "Introduction", href: "/docs" },
      ],
    },
    {
      title: "Guides",
      items: [
        { title: "How to Budget Your Money", href: "/docs/how-to-budget-your-money" },
        { title: "How to Track Expenses", href: "/docs/how-to-track-expenses" },
        { title: "Split Bills With Roommates", href: "/docs/split-bills-with-roommates" },
        { title: "Grocery Budget Tips", href: "/docs/grocery-budget-tips" },
        { title: "Best Free Budgeting Apps", href: "/docs/budgeting-app-best-free-picks" },
        { title: "Help Me With My Budget", href: "/docs/help-me-with-my-budget" },
        { title: "Help With Budgeting", href: "/docs/help-with-budgeting" },
        { title: "Budgeting for Investors", href: "/docs/help-me-budget-for-investors" },
        { title: "How to Stop Overspending", href: "/docs/how-to-stop-overspending" },
      ],
    },
    {
      title: "Comparisons",
      items: [
        { title: "Trakzi vs YNAB", href: "/compare/trakzi-vs-ynab" },
        { title: "Trakzi vs Splitwise", href: "/compare/trakzi-vs-splitwise" },
        { title: "Trakzi vs Monarch", href: "/compare/trakzi-vs-monarch" },
      ],
    },
  ]
}

export function DocsSidebar({ locale = "en", mode = "fixed" }: { locale?: "en" | "es"; mode?: "fixed" | "sticky" }) {
  const pathname = usePathname()
  const nav = getDocsNav(locale)
  const [isDark, setIsDark] = useState(() => {
    if (typeof document !== "undefined") return document.documentElement.classList.contains("dark")
    return true
  })
  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains("dark"))
    })
    observer.observe(document.documentElement, { attributeFilter: ["class"] })
    return () => observer.disconnect()
  }, [])

  if (mode === "sticky") {
    return (
      <aside className="hidden lg:flex flex-col w-56 flex-shrink-0">
        <div className="sticky flex flex-col rounded-2xl border border-border/50 bg-background/80 backdrop-blur-sm shadow-xl overflow-hidden" style={{ top: "calc(var(--header-height, 3rem) + 1rem)" }}>
          <div className="flex-1 overflow-y-auto py-2">
            {nav.map((group) => (
              <div key={group.title} className="px-3 py-2">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground/60 px-2 mb-1.5">
                  {group.title}
                </p>
                <div className="space-y-0.5">
                  {group.items.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      aria-current={pathname === item.href ? "page" : undefined}
                      className={cn(
                        "block px-3 py-2 rounded-lg text-sm transition-colors",
                        pathname === item.href
                          ? "bg-muted text-primary font-medium"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                      )}
                    >
                      {item.title}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </aside>
    )
  }

  return (
    <aside className="hidden lg:flex fixed left-4 bottom-[340px] w-60 z-40 flex-col rounded-2xl border border-border/50 bg-background/80 backdrop-blur-sm shadow-xl overflow-hidden" style={{ top: "calc(var(--header-height, 3rem) + 1rem)" }}>
      {/* Logo */}
      <div className="border-b border-border/50 px-4 py-4 flex-shrink-0">
        <Link href="/" className="flex items-center gap-2">
          <img src="/Trakzi/LogoShort.svg" alt="Trakzi" className="h-6 w-auto" draggable={false} />
        </Link>
      </div>

      {/* Nav */}
      <div className="flex-1 overflow-y-auto py-2">
        {nav.map((group) => (
          <div key={group.title} className="px-3 py-2">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground/60 px-2 mb-1.5">
              {group.title}
            </p>
            <div className="space-y-0.5">
              {group.items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "block px-3 py-2 rounded-lg text-sm transition-colors",
                    pathname === item.href
                      ? "bg-muted text-primary font-medium"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  )}
                >
                  {item.title}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </aside>
  )
}
