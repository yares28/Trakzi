"use client"

import { m } from "framer-motion"
import Link from "next/link"
import { ChevronRight, Check, ArrowRight, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"
import { PageHeader, CtaButtons } from "@/components/page-layout"
import { StickyFooter } from "@/components/sticky-footer"

import { SectionSeparator } from "@/components/section-separator"
import { Badge } from "@/components/ui/badge"
import { ReceiptFridgeAnimation } from "@/components/receipt-fridge-animation"
import { CsvUploadAnimation } from "@/components/csv-upload-animation"
import { RoomSplitAnimation } from "@/components/room-split-animation"
import { GroceryTrackAnimation } from "@/components/grocery-track-animation"
import { AiChatDemo } from "@/components/ai-chat-demo"
import { AnimatedCharts } from "@/components/animated-charts"
import Earth from "@/components/globe"

const features = [
  {
    badge: "Receipt Scanner",
    subtitle: "AI-Powered OCR",
    title: "Scan Any Receipt. Track Every Expense.",
    description: "Snap a photo of any grocery, retail, or restaurant receipt. Trakzi extracts the store, date, and total automatically with AI-powered OCR.",
    benefits: ["AI-powered extraction", "No manual entry", "Works with any receipt"],
    detailHref: "/receipt-scanner",
    detailLabel: "See how receipt scanning works",
    visual: (
      <div className="relative w-full h-[500px] rounded-xl overflow-hidden">
        <div className="absolute inset-0">
          <img src="/orangeBackground.png" alt="" className="w-full h-full object-cover rounded-xl opacity-30" />
        </div>
        <div className="relative z-10 h-full flex items-center justify-center">
          <ReceiptFridgeAnimation />
        </div>
      </div>
    ),
  },
  {
    badge: "CSV Import",
    subtitle: "Bank-First Privacy",
    title: "Import Any Bank CSV. See Your Spending Come Alive.",
    description: "Upload any CSV export from your bank. Trakzi normalizes the data and generates 20+ interactive charts instantly. No bank connection required.",
    benefits: ["Works with any bank worldwide", "Instant charts & analytics", "AI auto-categorization"],
    detailHref: "/csv-import",
    detailLabel: "See how CSV import works",
    visual: (
      <div className="relative w-full h-[500px] rounded-xl overflow-hidden">
        <div className="absolute inset-0">
          <img src="/orangeBackground.png" alt="" className="w-full h-full object-cover rounded-xl opacity-30" />
        </div>
        <div className="relative z-10 h-full flex items-center justify-center">
          <CsvUploadAnimation />
        </div>
      </div>
    ),
  },
  {
    badge: "Split Expenses",
    subtitle: "Shared Rooms",
    title: "Split Bills. Share Costs. Stay Friends.",
    description: "Create rooms with friends or roommates. Add shared expenses, split them any way you like, and see who owes whom.",
    benefits: ["Instant balance tracking", "Flexible splitting", "Multiple rooms"],
    detailHref: "/split-expenses",
    detailLabel: "See how shared expenses work",
    visual: (
      <div className="relative w-full h-[500px] rounded-xl overflow-hidden">
        <div className="absolute inset-0">
          <img src="/orangeBackground.png" alt="" className="w-full h-full object-cover rounded-xl opacity-30" />
        </div>
        <div className="relative z-10 h-full flex items-center justify-center">
          <RoomSplitAnimation />
        </div>
      </div>
    ),
  },
  {
    badge: "Grocery Tracker",
    subtitle: "Smart Receipts",
    title: "Know Where Your Grocery Money Goes.",
    description: "Scan grocery receipts from any store. Track spending by store, category, and week. Take control of your food budget.",
    benefits: ["Scan receipts from any store", "Spending by category", "Weekly trend charts"],
    detailHref: "/grocery-tracker",
    detailLabel: "See how grocery tracking works",
    visual: (
      <div className="relative w-full h-[500px] rounded-xl overflow-hidden">
        <div className="absolute inset-0">
          <img src="/orangeBackground.png" alt="" className="w-full h-full object-cover rounded-xl opacity-30" />
        </div>
        <div className="relative z-10 h-full flex items-center justify-center">
          <GroceryTrackAnimation />
        </div>
      </div>
    ),
  },
  {
    badge: "AI Analytics",
    subtitle: "Ask Anything",
    title: "Your Personal Finance Assistant.",
    description: "Ask questions about your spending. Get instant insights with charts. Trakzi's AI spots patterns you'd miss.",
    benefits: ["Ask anything about spending", "Automatic pattern detection", "Chart-backed answers"],
    detailHref: undefined,
    detailLabel: "Start chatting with AI",
    visual: (
      <div className="relative w-full h-[500px] rounded-xl overflow-hidden">
        <div className="absolute inset-0">
          <img src="/orangeBackground.png" alt="" className="w-full h-full object-cover rounded-xl opacity-30" />
        </div>
        <div className="relative z-10 h-full flex items-center justify-center">
          <AiChatDemo />
        </div>
      </div>
    ),
  },
  {
    badge: "Advanced Charts",
    subtitle: "20+ Types",
    title: "20+ Ways to See Your Money.",
    description: "From line charts to heatmaps, scatter plots to funnels. Every expense tells a story — Trakzi helps you read it.",
    benefits: ["Line, bar, pie, scatter, area charts", "Heatmaps & treemaps", "Export & share"],
    detailHref: undefined,
    detailLabel: "Explore all chart types",
    visual: (
      <div className="relative w-full h-[500px] rounded-xl overflow-hidden">
        <div className="absolute inset-0">
          <img src="/orangeBackground.png" alt="" className="w-full h-full object-cover rounded-xl opacity-30" />
        </div>
        <div className="relative z-10 h-full flex items-center justify-center">
          <AnimatedCharts />
        </div>
      </div>
    ),
  },
  {
    badge: "Globally Usable",
    subtitle: "Works Worldwide",
    title: "Works With Any Bank. Anywhere in the World.",
    description: "From Spain to the US, from CaixaBank to Chase. Upload any CSV export and Trakzi handles it. No bank connection required.",
    benefits: ["Supports any bank worldwide", "No credentials shared", "Privacy-first approach"],
    detailHref: "/csv-import",
    detailLabel: "See how CSV import works",
    visual: (
      <div className="relative w-full h-[500px] rounded-xl overflow-hidden">
        <div className="absolute inset-0">
          <img src="/orangeBackground.png" alt="" className="w-full h-full object-cover rounded-xl opacity-30" />
        </div>
        <div className="relative z-10 flex items-center justify-center">
          <Earth className="w-full h-full" baseColor={[0.9, 0.6, 0.4]} glowColor={[0.91, 0.54, 0.33]} markerColor={[0.91, 0.54, 0.33]} />
        </div>
      </div>
    ),
  },
]

export default function FeaturesPage() {
  return (
    <div className="min-h-screen w-full relative bg-black text-foreground">

      <div className="absolute inset-0 z-0" style={{ background: "radial-gradient(ellipse 50% 35% at 50% 0%, rgba(226, 232, 240, 0.12), transparent 60%), #000000" }} />

      <PageHeader />

      {/* Hero — matches landing page exactly */}
      <section className="relative min-h-screen flex flex-col" suppressHydrationWarning>
        <div className="container mx-auto px-4 py-32 sm:py-48 relative z-10 flex-1 flex flex-col">
          <div className="mx-auto max-w-4xl text-center flex-1 flex flex-col justify-center">
            <m.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="mb-8">
              <Badge variant="secondary" className="inline-flex items-center gap-2 px-4 py-2 text-sm">
                <Sparkles className="h-4 w-4" />
                Everything You Need
              </Badge>
            </m.div>
            <m.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-4xl font-bold tracking-tight text-foreground sm:text-7xl lg:text-9xl mb-8"
            >
              All Your <strong>Finances.</strong> <br />
              <em className="italic">One Workspace.</em>
            </m.h1>
            <m.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="mx-auto mb-12 max-w-2xl text-lg text-muted-foreground"
            >
              Import bank statements, scan receipts, split bills with friends, and visualize spending with AI-powered charts — all without connecting your bank.
            </m.p>
            <m.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.3 }}>
              <CtaButtons />
            </m.div>
          </div>
        </div>
      </section>

      {/* Feature Sections — alternating */}
      {features.map((feature, i) => {
        const isEven = i % 2 === 0
        return (
          <div key={feature.badge}>
            <SectionSeparator />
            <section className="py-48 px-4 relative z-10">
              <div className="container mx-auto max-w-6xl">
                <div className="grid md:grid-cols-2 gap-12 items-center">
                  {/* Visual */}
                  <m.div
                    initial={{ opacity: 0, x: isEven ? -30 : 30 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6 }}
                    className={cn(
                      "group border-secondary/40 text-card-foreground relative overflow-hidden rounded-xl border-2 shadow-xl transition-all ease-in-out",
                      isEven ? "" : "md:order-2"
                    )}
                    whileHover={{
                      scale: 1.02,
                      borderColor: "rgba(231, 138, 83, 0.6)",
                      boxShadow: "0 0 30px rgba(231, 138, 83, 0.2)",
                    }}
                  >
                    {feature.visual}
                  </m.div>

                  {/* Text */}
                  <m.div
                    initial={{ opacity: 0, x: isEven ? 30 : -30 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, delay: 0.1 }}
                    className={cn(!isEven && "md:order-1")}
                  >
                    <Badge variant="secondary" className="inline-flex items-center gap-2 px-3 py-1 text-xs mb-4">
                      {feature.badge}
                    </Badge>
                    <p className="text-sm text-muted-foreground mb-2">{feature.subtitle}</p>
                    <h2 className="text-2xl leading-none font-semibold tracking-tight text-foreground mb-4">
                      {feature.title}
                    </h2>
                    <p className="text-muted-foreground mb-6 leading-relaxed text-sm">
                      {feature.description}
                    </p>
                    <ul className="space-y-2.5 mb-8">
                      {feature.benefits.map((b) => (
                        <li key={b} className="flex items-center gap-2.5 text-sm text-muted-foreground">
                          <Check className="h-4 w-4 text-[#e78a53] flex-shrink-0" />
                          {b}
                        </li>
                      ))}
                    </ul>
                    {feature.detailHref ? (
                      <Link
                        href={feature.detailHref}
                        className="inline-flex items-center gap-2 rounded-full font-bold text-sm bg-gradient-to-b from-[#fe985b] to-[#fe985b]/80 text-white shadow-[0px_2px_0px_0px_rgba(255,255,255,0.3)_inset] px-6 py-2.5 transition-all hover:-translate-y-0.5"
                      >
                        {feature.detailLabel}
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    ) : (
                      <Link
                        href="/sign-up"
                        className="inline-flex items-center gap-2 rounded-full font-medium text-sm border border-border bg-card text-foreground px-6 py-2.5 transition-all hover:-translate-y-0.5"
                      >
                        {feature.detailLabel}
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    )}
                  </m.div>
                </div>
              </div>
            </section>
          </div>
        )
      })}

      <SectionSeparator />

      {/* CTA */}
      <section className="py-48 px-4 relative z-10">
        <div className="container mx-auto max-w-2xl text-center">
          <h2 className="via-foreground mb-8 bg-gradient-to-b from-zinc-800 to-zinc-700 bg-clip-text text-5xl font-semibold tracking-tighter text-transparent md:text-[72px] md:leading-[80px]">
            Ready to take control?
          </h2>
          <p className="mx-auto mb-12 max-w-2xl text-lg text-muted-foreground">
            Free to start. No credit card required. Works with any bank worldwide.
          </p>
          <CtaButtons />
        </div>
      </section>

      <StickyFooter />
    </div>
  )
}
