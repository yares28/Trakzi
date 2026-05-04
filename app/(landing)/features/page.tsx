"use client"

import { m } from "framer-motion"
import Image from "next/image"
import Link from "next/link"
import { Check, ArrowRight, Sparkles, Globe } from "lucide-react"
import { cn } from "@/lib/utils"
import { geist } from "@/lib/fonts"
import { PageHeader, CtaButtons } from "@/components/page-layout"
import { StickyFooter } from "@/components/sticky-footer"

import { SectionSeparator } from "@/components/section-separator"
import { Badge } from "@/components/ui/badge"
import { ReceiptFridgeAnimation } from "@/components/receipt-fridge-animation"
import { CsvUploadAnimation } from "@/components/csv-upload-animation"
import { RoomSplitAnimation } from "@/components/room-split-animation"
import { GroceryTrackAnimation } from "@/components/grocery-track-animation"
import { AiChatDemo } from "@/components/ai-chat-demo"
import { ChartCardsGrid } from "@/components/chart-cards-grid"
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
      <div className="relative w-full h-[500px] rounded-xl">
        <div className="absolute inset-0 overflow-hidden rounded-xl">
          <Image src="/orangeBackground.png" alt="" fill className="object-cover opacity-30" />
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
      <div className="relative w-full h-[500px] rounded-xl">
        <div className="absolute inset-0 overflow-hidden rounded-xl">
          <Image src="/orangeBackground.png" alt="" fill className="object-cover opacity-30" />
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
      <div className="relative w-full h-[500px] rounded-xl">
        <div className="absolute inset-0 overflow-hidden rounded-xl">
          <Image src="/orangeBackground.png" alt="" fill className="object-cover opacity-30" />
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
      <div className="relative w-full h-[500px] rounded-xl">
        <div className="absolute inset-0 overflow-hidden rounded-xl">
          <Image src="/orangeBackground.png" alt="" fill className="object-cover opacity-30" />
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
      <div className="relative w-full h-[500px] rounded-xl">
        <div className="absolute inset-0 overflow-hidden rounded-xl">
          <Image src="/orangeBackground.png" alt="" fill className="object-cover opacity-30" />
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
      <div className="relative w-full rounded-xl">
        <div className="absolute inset-0 overflow-hidden rounded-xl">
          <Image src="/orangeBackground.png" alt="" fill className="object-cover opacity-30" />
        </div>
        <div className="relative z-10 p-6">
          <ChartCardsGrid />
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
      <div className="relative w-full h-[500px] rounded-xl">
        <div className="absolute inset-0 overflow-hidden rounded-xl">
          <Image src="/orangeBackground.png" alt="" fill className="object-cover opacity-30" />
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
    <div className="min-h-screen w-full relative bg-background text-foreground">

      <PageHeader />

      {/* Hero */}
      <section className="relative min-h-screen flex flex-col" suppressHydrationWarning>
        <div className="container mx-auto px-4 py-32 sm:py-48 relative z-10 flex-1 flex flex-col">
          <div className="mx-auto max-w-4xl text-center flex-1 flex flex-col justify-center relative">

            {/* Background SVG — same as landing hero */}
            <m.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1.5, ease: "easeOut" }}
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 -z-10 pointer-events-none select-none flex items-center justify-center w-full h-full"
            >
              <m.div
                animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.3, 0.1] }}
                transition={{ duration: 80, repeat: Infinity, ease: "easeInOut" }}
                className="absolute w-[500px] h-[500px] sm:w-[800px] sm:h-[800px] bg-white/20 blur-[120px] rounded-full mix-blend-screen"
              />
              <m.div
                animate={{ scale: [0.95, 1.05, 0.95] }}
                transition={{ duration: 80, repeat: Infinity, ease: "easeInOut" }}
                className="absolute flex items-center justify-center w-[600px] h-[600px] sm:w-[1100px] sm:h-[1100px] opacity-[0.35] mix-blend-plus-lighter"
              >
                <img src="/Trakzi/fulleticonB.svg" alt="" className="absolute w-full h-full object-contain brightness-0 invert drop-shadow-[0_0_40px_rgba(255,255,255,1)]" />
                <img src="/Trakzi/fulleticonB.svg" alt="" className="absolute w-full h-full object-contain brightness-0 invert blur-[30px] opacity-80" />
                <img src="/Trakzi/fulleticonB.svg" alt="" className="absolute w-full h-full object-contain brightness-0 invert opacity-60 mix-blend-overlay" />
              </m.div>
            </m.div>

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
              className="text-4xl font-bold tracking-tight text-foreground sm:text-6xl lg:text-7xl mb-8"
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
            <m.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.3 }} className="flex flex-col items-center gap-6">
              <svg width="100" height="50" viewBox="0 0 100 50" fill="currentColor" xmlns="http://www.w3.org/2000/svg" className="text-foreground mt-8">
                <path d="M68.6958 5.40679C67.3329 12.7082 68.5287 20.1216 68.5197 27.4583C68.5189 29.5382 68.404 31.6054 68.1147 33.682C67.9844 34.592 69.4111 34.751 69.5414 33.8411C70.5618 26.5016 69.2488 19.104 69.4639 11.7325C69.5218 9.65887 69.7222 7.6012 70.0939 5.56265C70.1638 5.1949 69.831 4.81112 69.4601 4.76976C69.0891 4.72841 68.7689 5.01049 68.6958 5.40679Z" />
                <path d="M74.0117 26.1349C73.2662 27.1206 72.5493 28.1096 72.0194 29.235C71.5688 30.167 71.2007 31.137 70.7216 32.0658C70.4995 32.5033 70.252 32.9091 69.9475 33.3085C69.8142 33.4669 69.6779 33.654 69.5161 33.8093C69.4527 33.86 68.9199 34.2339 68.9167 34.2624C68.9263 34.1768 69.0752 34.3957 69.0055 34.2434C68.958 34.1515 68.8534 34.0531 68.8058 33.9612C68.6347 33.6821 68.4637 33.403 68.264 33.1208L67.1612 31.3512C66.3532 30.0477 65.5199 28.7126 64.7119 27.4093C64.5185 27.0699 63.9701 27.0666 63.7131 27.2979C63.396 27.5514 63.4053 27.9858 63.6018 28.2966C64.3845 29.5683 65.1956 30.8431 65.9783 32.1149L67.1572 33.9796C67.5025 34.5093 67.8225 35.2671 68.428 35.5368C69.6136 36.0446 70.7841 34.615 71.3424 33.7529C71.9992 32.786 72.4085 31.705 72.9035 30.6336C73.4842 29.3116 74.2774 28.1578 75.1306 26.9818C75.7047 26.2369 74.5573 25.3868 74.0117 26.1349ZM55.1301 12.2849C54.6936 18.274 54.6565 24.3076 55.0284 30.3003C55.1293 31.987 55.2555 33.7056 55.4419 35.4019C55.5431 36.3087 56.9541 36.0905 56.8529 35.1837C56.2654 29.3115 56.0868 23.3982 56.2824 17.4978C56.3528 15.8301 56.4263 14.1339 56.5537 12.4725C56.6301 11.5276 55.2034 11.3686 55.1301 12.2849Z" />
                <path d="M59.2642 30.6571C58.8264 31.475 58.36 32.2896 57.9222 33.1075C57.7032 33.5164 57.4843 33.9253 57.2369 34.3311C57.0528 34.6861 56.8656 35.0697 56.6278 35.3898C56.596 35.4152 56.5611 35.4691 56.5294 35.4944C56.4881 35.6054 56.5041 35.4627 56.5548 35.5261C56.7481 35.6055 56.8337 35.6151 56.7545 35.5484L56.6784 35.4533C56.6023 35.3581 56.5263 35.263 56.4534 35.1393C56.1778 34.7619 55.8734 34.3814 55.5946 34.0324C55.0146 33.2744 54.4315 32.545 53.8515 31.787C53.2685 31.0576 52.1584 31.945 52.7415 32.6744C53.4229 33.5592 54.1042 34.4441 54.7888 35.3004C55.1184 35.7127 55.4321 36.2677 55.8569 36.6039C56.3069 36.9719 56.884 36.9784 57.3533 36.6551C57.7624 36.3542 57.9845 35.9167 58.2067 35.4792C58.4636 34.9878 58.746 34.5282 59.003 34.0369C59.5423 33.0859 60.0563 32.1032 60.5957 31.1522C60.7765 30.8257 60.5104 30.3627 60.2092 30.2135C59.8161 30.112 59.4451 30.3305 59.2642 30.6571ZM44.5918 10.1569L42.2324 37.5406C42.0032 40.1151 41.8057 42.6641 41.5764 45.2386C41.5032 46.1549 42.9299 46.314 43.0032 45.3977L45.3626 18.014C45.5918 15.4396 45.7893 12.8905 46.0186 10.316C46.1235 9.37433 44.6968 9.21532 44.5918 10.1569Z" />
                <path d="M48.101 37.7616C46.7404 38.8232 45.8267 40.2814 44.9163 41.7109C44.0407 43.0866 43.1365 44.4592 41.738 45.3434C42.1247 45.5019 42.5146 45.6321 42.9014 45.7908C42.1324 41.8051 41.04 37.8699 39.6781 34.0203C39.545 33.6589 39.0695 33.5191 38.7365 33.6553C38.3719 33.817 38.2385 34.2353 38.3716 34.5969C39.7209 38.3007 40.7404 42.1121 41.4904 46.009C41.6012 46.5703 42.1877 46.7512 42.6539 46.4565C45.5462 44.6124 46.3877 40.9506 49.0169 38.8748C49.7178 38.2884 48.8304 37.1784 48.101 37.7616ZM25.9671 13.1014C25.7028 16.2497 26.0758 19.3824 26.5091 22.4929C26.9645 25.6636 27.4166 28.863 27.872 32.0337C28.1346 33.8253 28.3971 35.6167 28.631 37.4051C28.7607 38.3151 30.1717 38.0968 30.042 37.1868C29.5866 34.016 29.1281 30.8738 28.7012 27.7062C28.2647 24.6242 27.7396 21.5612 27.449 18.4666C27.2943 16.7449 27.2283 15.0042 27.3653 13.2572C27.4671 12.3442 26.0404 12.1851 25.9671 13.1014Z" />
                <path d="M30.5625 27.3357C29.9525 30.7343 29.3425 34.133 28.704 37.5284C29.1225 37.4018 29.5411 37.2751 29.9882 37.1516C28.6034 35.0617 27.2504 32.9465 25.8655 30.8565C25.6406 30.5425 25.1523 30.517 24.8669 30.7451C24.5497 30.9987 24.5305 31.4299 24.7555 31.7439C26.1403 33.8338 27.4933 35.9491 28.8781 38.039C29.2489 38.6003 30.0417 38.2265 30.1624 37.6621C30.7724 34.2635 31.3824 30.8648 32.0209 27.4694C32.0908 27.1016 31.758 26.7178 31.3871 26.6765C30.9559 26.6573 30.6324 26.9679 30.5625 27.3357Z" />
              </svg>
              <Link href="/sign-up">
                <div className="group cursor-pointer border border-border bg-card gap-2 h-[60px] flex items-center p-[10px] rounded-full">
                  <div className="border border-border bg-primary h-[40px] rounded-full flex items-center justify-center text-primary-foreground">
                    <p className="font-medium tracking-tight mr-3 ml-3 flex items-center gap-2 justify-center text-base">
                      <Globe className="w-[18px] h-[18px] animate-spin" />
                      Get started for free
                    </p>
                  </div>
                  <div className="text-muted-foreground group-hover:ml-4 ease-in-out transition-all size-[24px] flex items-center justify-center rounded-full border-2 border-border">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-arrow-right group-hover:rotate-180 ease-in-out transition-all">
                      <path d="M5 12h14" /><path d="m12 5 7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </Link>
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
                <div className={cn("flex flex-col md:flex-row gap-12 items-center", !isEven && "md:flex-row-reverse")}>
                  {/* Visual */}
                  <m.div
                    initial={{ opacity: 0, x: isEven ? -30 : 30 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6 }}
                    className={cn("group border-secondary/40 text-card-foreground relative rounded-xl border-2 shadow-xl transition-all ease-in-out shrink-0 hover:border-primary/60", isEven ? "md:basis-[65%] lg:-ml-16" : "md:basis-[65%] lg:-mr-16")}
                    whileHover={{
                      scale: 1.02,
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
                    className="md:basis-[45%]"
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
                          <Check className="h-4 w-4 text-primary flex-shrink-0" />
                          {b}
                        </li>
                      ))}
                    </ul>
                    {feature.detailHref ? (
                      <Link
                        href={feature.detailHref}
                        className="inline-flex items-center gap-2 rounded-full font-bold text-sm bg-primary text-primary-foreground shadow-[0px_2px_0px_0px_rgba(255,255,255,0.3)_inset] px-6 py-2.5 transition-all hover:-translate-y-0.5"
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
      <section className="relative overflow-hidden pt-48 pb-96 px-4 z-10">
        <div className="bg-primary/20 absolute top-1/2 -right-20 z-[-1] h-64 w-64 rounded-full opacity-80 blur-3xl pointer-events-none" />
        <div className="bg-primary/20 absolute top-1/2 -left-20 z-[-1] h-64 w-64 rounded-full opacity-80 blur-3xl pointer-events-none" />
        <div className="container mx-auto max-w-2xl text-center relative z-10">
          <m.h2
            className={cn("mb-8 text-5xl md:text-[72px] md:leading-[80px] font-semibold tracking-tighter", geist.className)}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            Ready to take control?
          </m.h2>
          <m.p
            className="mx-auto mb-12 max-w-2xl text-lg text-muted-foreground"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            viewport={{ once: true }}
          >
            Free to start. No credit card required. Works with any bank worldwide.
          </m.p>
          <m.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            viewport={{ once: true }}
            className="flex justify-center"
          >
            <Link href="/sign-up">
              <div className="group cursor-pointer border border-border bg-card gap-2 h-[60px] flex items-center p-[10px] rounded-full">
                <div className="border border-border bg-primary h-[40px] rounded-full flex items-center justify-center text-primary-foreground">
                  <p className="font-medium tracking-tight mr-3 ml-3 flex items-center gap-2 justify-center text-base">
                    <Globe className="w-[18px] h-[18px] animate-spin" />
                    Get started for free
                  </p>
                </div>
                <div className="text-muted-foreground group-hover:ml-4 ease-in-out transition-all size-[24px] flex items-center justify-center rounded-full border-2 border-border">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-arrow-right group-hover:rotate-180 ease-in-out transition-all">
                    <path d="M5 12h14" /><path d="m12 5 7 7-7 7" />
                  </svg>
                </div>
              </div>
            </Link>
          </m.div>
        </div>
      </section>

      <StickyFooter />
    </div>
  )
}
