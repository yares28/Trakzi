"use client"

import Link from "next/link"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { DocsSidebar } from "@/components/docs-sidebar"
import { LanguagePicker } from "@/components/language-picker"

import { StickyFooter } from "@/components/sticky-footer"

export function DocsShell({ children, locale = "en" }: { children: React.ReactNode; locale?: "en" | "es" }) {
  const isEs = locale === "es"

  return (
    <div className="min-h-screen w-full bg-black text-foreground">

      <div className="absolute inset-0 z-0" style={{ background: "radial-gradient(ellipse 50% 35% at 50% 0%, rgba(226, 232, 240, 0.12), transparent 60%), #000000" }} />

      <SidebarProvider defaultOpen={true}>
        <div className="relative z-10 flex min-h-screen w-full">
          <DocsSidebar locale={locale} />

          <SidebarInset className="flex-1 bg-transparent">
            <header className="sticky top-4 z-[9999] mx-4 flex items-center justify-between rounded-full bg-background/80 backdrop-blur-sm border border-border/50 shadow-lg px-4 py-2">
              <Link href="/" className="flex items-center gap-2">
                <img src="/Trakzi/TrakzilogoB.png" alt="Trakzi" className="h-8 w-auto" draggable={false} />
              </Link>

              <div className="absolute inset-0 hidden flex-1 flex-row items-center justify-center space-x-2 text-sm font-medium text-muted-foreground md:flex">
                <Link href="/features" className="relative px-4 py-2 text-muted-foreground hover:text-foreground transition-colors">
                  <span>Features</span>
                </Link>
                <Link href="/docs" className="relative px-4 py-2 text-muted-foreground hover:text-foreground transition-colors">
                  <span>Docs</span>
                </Link>
                <Link href="/pricing" className="relative px-4 py-2 text-muted-foreground hover:text-foreground transition-colors">
                  <span>Pricing</span>
                </Link>
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
                  className="rounded-md font-bold relative cursor-pointer hover:-translate-y-0.5 transition duration-200 inline-block text-center bg-gradient-to-b from-[#fe985b] to-[#fe985b]/80 text-white shadow-[0px_2px_0px_0px_rgba(255,255,255,0.3)_inset] px-4 py-2 text-sm"
                >
                  {isEs ? "Registrarse" : "Sign Up"}
                </Link>
              </div>
            </header>

            <main className="flex-1 bg-transparent">
              {children}
            </main>

            <StickyFooter />
          </SidebarInset>
        </div>
      </SidebarProvider>
    </div>
  )
}
