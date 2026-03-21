"use client"

import { m } from "framer-motion"
import Link from "next/link"
import { CheckCircle2, ChevronRight, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"
import { PageHeader, CtaButtons } from "@/components/page-layout"
import { StickyFooter } from "@/components/sticky-footer"

import { SectionSeparator } from "@/components/section-separator"
import { Badge } from "@/components/ui/badge"

interface FeatureStep {
  step: number
  title: string
  description: string
}

interface FeatureBenefit {
  title: string
  description: string
}

interface FeaturePageProps {
  headline: string
  subheadline: string
  heroDescription: string
  benefits: FeatureBenefit[]
  steps: FeatureStep[]
  statsLabel: string
  statsValue: string
  ctaText: string
  relatedPages: { href: string; label: string }[]
  locale?: "en" | "es"
}

export default function FeaturePage({
  headline,
  subheadline,
  heroDescription,
  benefits,
  steps,
  statsLabel,
  statsValue,
  ctaText,
  relatedPages,
  locale = "en",
}: FeaturePageProps) {
  const isEs = locale === "es"

  return (
    <div className="min-h-screen w-full relative bg-black text-foreground">

      <div className="absolute inset-0 z-0" style={{ background: "radial-gradient(ellipse 50% 35% at 50% 0%, rgba(226, 232, 240, 0.12), transparent 60%), #000000" }} />

      <PageHeader locale={locale} />

      {/* Hero */}
      <section className="relative min-h-screen flex flex-col">
        <div className="container mx-auto px-4 py-32 sm:py-48 relative z-10 flex-1 flex flex-col">
          <div className="mx-auto max-w-4xl text-center flex-1 flex flex-col justify-center">
            <m.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="mb-8">
              <Badge variant="secondary" className="inline-flex items-center gap-2 px-4 py-2 text-sm">
                <Sparkles className="h-4 w-4" />
                {subheadline}
              </Badge>
            </m.div>
            <m.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-4xl font-bold tracking-tight text-foreground sm:text-7xl lg:text-9xl mb-8"
            >
              {headline}
            </m.h1>
            <m.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="mx-auto mb-12 max-w-2xl text-lg text-muted-foreground"
            >
              {heroDescription}
            </m.p>
            <m.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.3 }}>
              <CtaButtons locale={locale} />
            </m.div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-48 px-4 relative z-10">
        <div className="container mx-auto">
          <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-8">
            <div className="flex items-center justify-center gap-12 flex-wrap text-center">
              <div>
                <p className="text-4xl font-bold text-foreground">{statsValue}</p>
                <p className="text-sm text-muted-foreground mt-2">{statsLabel}</p>
              </div>
              <div className="w-px h-12 bg-white/10 hidden sm:block" />
              <div>
                <p className="text-4xl font-bold text-foreground">100%</p>
                <p className="text-sm text-muted-foreground mt-2">{isEs ? "Gratis para empezar" : "Free to start"}</p>
              </div>
              <div className="w-px h-12 bg-white/10 hidden sm:block" />
              <div>
                <p className="text-4xl font-bold text-foreground">{isEs ? "Cualquier banco" : "Any bank"}</p>
                <p className="text-sm text-muted-foreground mt-2">{isEs ? "Funciona en todo el mundo" : "Works worldwide"}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <SectionSeparator />

      {/* Benefits */}
      <section className="py-48 px-4 relative z-10">
        <div className="container mx-auto">
          <m.div initial={{ opacity: 0, y: 50 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.1 }} transition={{ duration: 0.5 }}>
            <h2 className="via-foreground mb-12 bg-gradient-to-b from-zinc-800 to-zinc-700 bg-clip-text text-center text-5xl font-semibold tracking-tighter text-transparent md:text-[72px] md:leading-[80px]">
              {isEs ? "¿Por qué Trakzi?" : "Why Trakzi"}
            </h2>
            <div className="grid sm:grid-cols-2 gap-4">
              {benefits.map((benefit, i) => (
                <m.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: i * 0.1 }}
                  whileHover={{
                    scale: 1.02,
                    borderColor: "rgba(231, 138, 83, 0.6)",
                    boxShadow: "0 0 30px rgba(231, 138, 83, 0.2)",
                  }}
                  className="group border-secondary/40 text-card-foreground relative col-span-1 flex flex-col overflow-hidden rounded-xl border-2 p-6 shadow-xl transition-all ease-in-out"
                >
                  <CheckCircle2 className="h-5 w-5 text-[#e78a53] mb-4" />
                  <h3 className="text-2xl leading-none font-semibold tracking-tight text-foreground mb-2">
                    {benefit.title}
                  </h3>
                  <p className="text-sm text-muted-foreground">{benefit.description}</p>
                </m.div>
              ))}
            </div>
          </m.div>
        </div>
      </section>

      <SectionSeparator />

      {/* How It Works */}
      <section className="py-48 px-4 relative z-10">
        <div className="container mx-auto max-w-4xl">
          <m.div initial={{ opacity: 0, y: 50 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.1 }} transition={{ duration: 0.5 }}>
            <h2 className="via-foreground mb-12 bg-gradient-to-b from-zinc-800 to-zinc-700 bg-clip-text text-center text-5xl font-semibold tracking-tighter text-transparent md:text-[72px] md:leading-[80px]">
              {isEs ? "Cómo Funciona" : "How It Works"}
            </h2>
            <div className="space-y-12">
              {steps.map((step, i) => (
                <m.div
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: i * 0.15 }}
                  className="flex gap-6"
                >
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-[#e78a53]/10 border border-[#e78a53]/30 flex items-center justify-center text-[#e78a53] font-bold text-sm">
                    {step.step}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-1">{step.title}</h3>
                    <p className="text-muted-foreground">{step.description}</p>
                  </div>
                </m.div>
              ))}
            </div>
          </m.div>
        </div>
      </section>

      <SectionSeparator />

      {/* Related Pages */}
      <section className="py-24 px-4 relative z-10">
        <div className="container mx-auto max-w-3xl text-center">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-8">
            {isEs ? "Descubre Más" : "Explore More Features"}
          </h3>
          <div className="flex flex-wrap justify-center gap-4">
            {relatedPages.map((page) => (
              <Link key={page.href} href={page.href} className="flex items-center gap-1 text-muted-foreground hover:text-foreground text-sm transition-colors group">
                {page.label} <ChevronRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            ))}
            <Link href={isEs ? "/es/features" : "/features"} className="flex items-center gap-1 text-muted-foreground hover:text-foreground text-sm transition-colors group">
              {isEs ? "Todas las Características" : "All Features"} <ChevronRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>
        </div>
      </section>

      <SectionSeparator />

      {/* CTA */}
      <section className="py-48 px-4 relative z-10">
        <div className="container mx-auto max-w-2xl text-center">
          <h2 className="via-foreground mb-8 bg-gradient-to-b from-zinc-800 to-zinc-700 bg-clip-text text-5xl font-semibold tracking-tighter text-transparent md:text-[72px] md:leading-[80px]">
            {isEs ? "¿Listo para empezar?" : "Ready to get started?"}
          </h2>
          <p className="mx-auto mb-12 max-w-2xl text-lg text-muted-foreground">
            {isEs
              ? "Únete a miles de usuarios que controlan sus finanzas con Trakzi. Gratis para empezar, sin tarjeta de crédito."
              : "Join thousands of users who track their finances with Trakzi. Free to start, no credit card required."}
          </p>
          <CtaButtons locale={locale} />
        </div>
      </section>

      <StickyFooter />
    </div>
  )
}
