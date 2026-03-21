"use client"

import Link from "next/link"
import { Play } from "lucide-react"
import { LanguagePicker } from "@/components/language-picker"

export function PageHeader({ locale = "en" }: { locale?: "en" | "es" }) {
  const isEs = locale === "es"

  return (
    <header className="sticky top-4 z-[9999] mx-auto max-w-5xl hidden md:flex items-center justify-between rounded-full bg-background/80 backdrop-blur-sm border border-border/50 shadow-lg px-4 py-2">
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
  )
}

export function CtaButtons({ locale = "en" }: { locale?: "en" | "es" }) {
  return (
    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
      {/* Get started button — matches landing hero exactly */}
      <Link href="/sign-up">
        <div className="group cursor-pointer border border-border bg-card gap-2 h-[60px] flex items-center p-[10px] rounded-full">
          <div className="border border-border bg-primary h-[40px] rounded-full flex items-center justify-center text-primary-foreground">
            <p className="font-medium tracking-tight mr-3 ml-3 flex items-center gap-2 justify-center text-base">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-globe animate-spin">
                <circle cx="12" cy="12" r="10"></circle>
                <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"></path>
                <path d="M2 12h20"></path>
              </svg>
              Get started for free
            </p>
          </div>
          <div className="text-muted-foreground group-hover:ml-4 ease-in-out transition-all size-[24px] flex items-center justify-center rounded-full border-2 border-border">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-arrow-right group-hover:rotate-180 ease-in-out transition-all">
              <path d="M5 12h14"></path>
              <path d="m12 5 7 7-7 7"></path>
            </svg>
          </div>
        </div>
      </Link>

      {/* Try Demo button — matches landing hero exactly */}
      <Link href="/sign-up">
        <div className="group cursor-pointer border border-border bg-card gap-2 h-[60px] flex items-center p-[10px] rounded-full">
          <div className="border border-border bg-primary h-[40px] rounded-full flex items-center justify-center text-primary-foreground">
            <p className="font-medium tracking-tight mr-3 ml-3 flex items-center gap-2 justify-center text-base">
              <Play className="h-4 w-4 animate-spin" fill="currentColor" />
              Try Demo
            </p>
          </div>
          <div className="text-muted-foreground group-hover:ml-4 ease-in-out transition-all size-[24px] flex items-center justify-center rounded-full border-2 border-border">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-arrow-right group-hover:rotate-180 ease-in-out transition-all">
              <path d="M5 12h14"></path>
              <path d="m12 5 7 7-7 7"></path>
            </svg>
          </div>
        </div>
      </Link>
    </div>
  )
}
