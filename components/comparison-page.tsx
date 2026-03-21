"use client"

import { m } from "framer-motion"
import Link from "next/link"
import { Check, X, Minus, ChevronRight, Sparkles } from "lucide-react"
import { PageHeader, CtaButtons } from "@/components/page-layout"
import { StickyFooter } from "@/components/sticky-footer"

import { SectionSeparator } from "@/components/section-separator"
import { Badge } from "@/components/ui/badge"

interface ComparisonFeature {
  feature: string
  trakzi: "yes" | "no" | "partial" | string
  competitor: "yes" | "no" | "partial" | string
}

interface ComparisonPageProps {
  competitorName: string
  headline: string
  heroDescription: string
  features: ComparisonFeature[]
  trakziAdvantages: string[]
  competitorStrengths: string[]
  conclusion: string
  ctaText: string
  locale?: "en" | "es"
}

function StatusIcon({ status }: { status: string }) {
  if (status === "yes") return <Check className="h-4 w-4 text-emerald-400" />
  if (status === "no") return <X className="h-4 w-4 text-white/20" />
  if (status === "partial") return <Minus className="h-4 w-4 text-yellow-400" />
  return <span className="text-xs text-muted-foreground">{status}</span>
}

export default function ComparisonPage({
  competitorName,
  headline,
  heroDescription,
  features,
  trakziAdvantages,
  competitorStrengths,
  conclusion,
  ctaText,
  locale = "en",
}: ComparisonPageProps) {
  const isEs = locale === "es"
  const whyLabel = isEs ? "¿Por qué elegir Trakzi?" : "Why choose Trakzi?"
  const whereLabel = isEs ? `Dónde brilla ${competitorName}` : `Where ${competitorName} shines`
  const verdictLabel = isEs ? "Veredicto" : "Verdict"
  const moreLabel = isEs ? "Más Comparaciones" : "More Comparisons"
  const allLabel = isEs ? "Todas las Características" : "All Features"
  const featureLabel = isEs ? "Característica" : "Feature"
  const compLabel = isEs ? "Competencia" : "Competitor"

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
                Comparison
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
              className="mx-auto max-w-2xl text-lg text-muted-foreground"
            >
              {heroDescription}
            </m.p>
          </div>
        </div>
      </section>

      <SectionSeparator />

      {/* Table */}
      <section className="py-48 px-4 relative z-10">
        <div className="container mx-auto max-w-4xl">
          <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-4 px-6 text-muted-foreground font-medium">{featureLabel}</th>
                  <th className="text-center py-4 px-6 text-[#e78a53] font-bold">Trakzi</th>
                  <th className="text-center py-4 px-6 text-muted-foreground font-medium">{compLabel}</th>
                </tr>
              </thead>
              <tbody>
                {features.map((f, i) => (
                  <tr key={i} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="py-3 px-6 text-foreground">{f.feature}</td>
                    <td className="py-3 px-6 text-center"><div className="flex justify-center"><StatusIcon status={f.trakzi} /></div></td>
                    <td className="py-3 px-6 text-center"><div className="flex justify-center"><StatusIcon status={f.competitor} /></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <SectionSeparator />

      {/* Advantages */}
      <section className="py-48 px-4 relative z-10">
        <div className="container mx-auto max-w-4xl">
          <h2 className="via-foreground mb-12 bg-gradient-to-b from-zinc-800 to-zinc-700 bg-clip-text text-center text-5xl font-semibold tracking-tighter text-transparent md:text-[72px] md:leading-[80px]">
            {whyLabel}
          </h2>
          <ul className="space-y-4">
            {trakziAdvantages.map((adv, i) => (
              <m.li key={i} initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }} className="flex items-start gap-3">
                <Check className="h-5 w-5 text-[#e78a53] flex-shrink-0 mt-0.5" />
                <span className="text-foreground">{adv}</span>
              </m.li>
            ))}
          </ul>
        </div>
      </section>

      <SectionSeparator />

      {/* Competitor Strengths */}
      <section className="py-48 px-4 relative z-10">
        <div className="container mx-auto max-w-4xl">
          <h2 className="via-foreground mb-12 bg-gradient-to-b from-zinc-800 to-zinc-700 bg-clip-text text-center text-5xl font-semibold tracking-tighter text-transparent md:text-[72px] md:leading-[80px]">
            {whereLabel}
          </h2>
          <ul className="space-y-4">
            {competitorStrengths.map((str, i) => (
              <li key={i} className="flex items-start gap-3">
                <Minus className="h-5 w-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                <span className="text-foreground">{str}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <SectionSeparator />

      {/* Verdict */}
      <section className="py-48 px-4 relative z-10">
        <div className="container mx-auto max-w-4xl">
          <h2 className="via-foreground mb-8 bg-gradient-to-b from-zinc-800 to-zinc-700 bg-clip-text text-center text-5xl font-semibold tracking-tighter text-transparent md:text-[72px] md:leading-[80px]">
            {verdictLabel}
          </h2>
          <p className="text-lg text-muted-foreground leading-relaxed">{conclusion}</p>
        </div>
      </section>

      <SectionSeparator />

      {/* CTA */}
      <section className="py-48 px-4 relative z-10">
        <div className="container mx-auto max-w-2xl text-center">
          <h2 className="via-foreground mb-8 bg-gradient-to-b from-zinc-800 to-zinc-700 bg-clip-text text-5xl font-semibold tracking-tighter text-transparent md:text-[72px] md:leading-[80px]">
            {isEs ? "¿Listo para probar?" : "Ready to try?"}
          </h2>
          <p className="mx-auto mb-12 max-w-2xl text-lg text-muted-foreground">
            {isEs ? "Gratis para empezar. Sin tarjeta de crédito." : "Free to start. No credit card required."}
          </p>
          <CtaButtons locale={locale} />
        </div>
      </section>

      {/* Other Comparisons */}
      <section className="py-16 px-4 relative z-10">
        <div className="container mx-auto max-w-3xl">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-6 text-center">{moreLabel}</h3>
          <div className="flex flex-wrap justify-center gap-4">
            {[
              { href: "/compare/trakzi-vs-ynab", label: "vs YNAB" },
              { href: "/compare/trakzi-vs-splitwise", label: "vs Splitwise" },
              { href: "/compare/trakzi-vs-monarch", label: "vs Monarch Money" },
            ].filter(c => !headline.toLowerCase().includes(c.label.replace("vs ", "").toLowerCase())).map((c) => (
              <Link key={c.href} href={c.href} className="flex items-center gap-1 text-muted-foreground hover:text-foreground text-sm transition-colors group">
                {c.label} <ChevronRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            ))}
            <Link href={isEs ? "/es/features" : "/features"} className="flex items-center gap-1 text-muted-foreground hover:text-foreground text-sm transition-colors group">
              {allLabel} <ChevronRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>
        </div>
      </section>

      <StickyFooter />
    </div>
  )
}
