"use client"

import { m } from "framer-motion"
import Link from "next/link"
import Image from "next/image"
import { Check, X, Sparkles } from "lucide-react"
import { useState } from "react"
import { geist } from "@/lib/fonts"
import { cn } from "@/lib/utils"
import { PageHeader } from "@/components/page-layout"
import { HeroBackgroundLogo } from "@/components/hero-background-logo"
import { Globe } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { StickyFooter } from "@/components/sticky-footer"
import { FAQSection } from "@/components/faq-section"

import { useRouter } from "next/navigation"
import { useAuth } from "@clerk/nextjs"
import { toast } from "sonner"

const fadeInUp = { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 } }
const heroFade = { initial: { opacity: 0, y: 30 }, animate: { opacity: 1, y: 0 } }
const viewportOnce = { once: true }
const cardHover = { y: -5 }

const plans = [
  {
    name: "Starter",
    monthlyPrice: 0,
    description: "Try it out",
    icon: "/Trakzi/subs/freeiconB.png",
    iconLight: "/Trakzi/subs/freeicon.png",
    popular: false,
    features: [
      { text: "300 transactions", included: true },
      { text: "50 transactions/month", included: true },
      { text: "10 receipt scans/month", included: true },
      { text: "10 AI chats/week", included: true },
      { text: "Basic charts", included: true },
      { text: "2 rooms, 5 friends", included: true },
      { text: "AI insights", included: false },
      { text: "Advanced charts", included: false },
    ],
    cta: "Get Started Free",
    priceId: null,
  },
  {
    name: "PRO",
    monthlyPrice: 4.99,
    annualPrice: 49.99,
    description: "For serious trackers",
    icon: "/Trakzi/subs/TrakziProIconB.png",
    iconLight: "/Trakzi/subs/TrakziProIcon.png",
    popular: true,
    features: [
      { text: "1,500 transactions (2,000 annual)", included: true },
      { text: "250 transactions/month", included: true },
      { text: "50 receipt scans/month", included: true },
      { text: "50 AI chats/week", included: true },
      { text: "AI insights & categorization", included: true },
      { text: "Advanced charts", included: true },
      { text: "10 rooms, 50 friends", included: true },
      { text: "10 custom categories", included: true },
    ],
    cta: "Go PRO",
    monthlyPriceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_PRO_MONTHLY,
    annualPriceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_PRO_ANNUAL,
  },
  {
    name: "MAX",
    monthlyPrice: 19.99,
    annualPrice: 199.99,
    description: "For power users",
    icon: "/Trakzi/subs/TrakziMaxIconB.png",
    iconLight: "/Trakzi/subs/trakziMaxIcon.png",
    popular: false,
    features: [
      { text: "5,000 transactions (6,000 annual)", included: true },
      { text: "750 transactions/month", included: true },
      { text: "150 receipt scans/month", included: true },
      { text: "100 AI chats/week", included: true },
      { text: "Everything in PRO", included: true },
      { text: "Unlimited rooms & friends", included: true },
      { text: "25 custom categories", included: true },
      { text: "Priority support", included: true },
    ],
    cta: "Go MAX",
    monthlyPriceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_MAX_MONTHLY,
    annualPriceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_MAX_ANNUAL,
  },
]

const transactionPacks = [
  { tx: 500, price: 10, priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_TRANSACTION_PACK_500 },
  { tx: 1500, price: 20, priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_TRANSACTION_PACK_1500 },
  { tx: 5000, price: 50, priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_TRANSACTION_PACK_5000 },
]

export default function PricingPage() {
  const [isAnnual, setIsAnnual] = useState(false)
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null)
  const [loadingPack, setLoadingPack] = useState<number | null>(null)
  const router = useRouter()
  const { isSignedIn } = useAuth()

  const handleSelectPack = async (pack: typeof transactionPacks[0]) => {
    if (!pack.priceId) {
      toast.error("Pack not available")
      return
    }
    setLoadingPack(pack.tx)
    try {
      if (!isSignedIn) {
        localStorage.setItem("pendingCheckoutPriceId", pack.priceId)
        router.push("/sign-up")
        return
      }
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceId: pack.priceId }),
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        toast.error(data.error || "Checkout failed")
      }
    } catch {
      toast.error("Something went wrong")
    } finally {
      setLoadingPack(null)
    }
  }

  const handleSelect = async (plan: typeof plans[0]) => {
    if (plan.name === "Starter") {
      if (isSignedIn) {
        router.push("/dashboard")
      } else {
        router.push("/sign-up")
      }
      return
    }

    const priceId = isAnnual ? plan.annualPriceId : plan.monthlyPriceId
    if (!priceId) {
      toast.error("Pricing not configured")
      return
    }

    setLoadingPlan(plan.name)
    try {
      if (!isSignedIn) {
        localStorage.setItem("pendingCheckoutPriceId", priceId)
        router.push("/sign-up")
        return
      }
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceId }),
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        toast.error(data.error || "Checkout failed")
      }
    } catch {
      toast.error("Something went wrong")
    } finally {
      setLoadingPlan(null)
    }
  }

  return (
    <div className="min-h-screen w-full relative bg-background text-foreground">

      {/* Header */}
      <PageHeader />

      {/* Hero */}
      <section className="relative min-h-screen flex flex-col">
        <div className="container mx-auto px-4 py-24 sm:py-32 relative z-10 flex-1 flex flex-col">
          <div className="mx-auto max-w-4xl text-center flex-1 flex flex-col justify-center relative">

            {/* Background SVG — same as landing hero old outline design, contained within hero */}
            <HeroBackgroundLogo />

            {/* Badge — exact landing page Badge component */}
            <m.div {...heroFade} transition={{ duration: 0.5 }} className="mb-8">
              <Badge variant="secondary" className="inline-flex items-center gap-2 px-4 py-2 text-sm">
                <Sparkles className="h-4 w-4" />
                Simple, Transparent Pricing
              </Badge>
            </m.div>

            {/* Heading — exact landing page typography */}
            <m.div {...heroFade} transition={{ duration: 0.5, delay: 0.1 }} className="mb-8">
              <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-6xl lg:text-7xl">
                Start free. <strong>Upgrade</strong> <br />
                <strong>when you </strong> <em className="italic">need more.</em>
              </h1>
            </m.div>

            {/* Description */}
            <m.p
              {...heroFade}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="mx-auto mb-12 max-w-2xl text-lg text-muted-foreground"
            >
              No hidden fees. Cancel anytime. Your data is always yours.
            </m.p>

            <m.div {...heroFade} transition={{ duration: 0.5, delay: 0.3 }} className="flex flex-col items-center gap-6">
              {/* Decorative squiggle — same as landing hero */}
              <svg width="100" height="50" viewBox="0 0 100 50" fill="currentColor" xmlns="http://www.w3.org/2000/svg" className="text-foreground mt-8">
                <path d="M68.6958 5.40679C67.3329 12.7082 68.5287 20.1216 68.5197 27.4583C68.5189 29.5382 68.404 31.6054 68.1147 33.682C67.9844 34.592 69.4111 34.751 69.5414 33.8411C70.5618 26.5016 69.2488 19.104 69.4639 11.7325C69.5218 9.65887 69.7222 7.6012 70.0939 5.56265C70.1638 5.1949 69.831 4.81112 69.4601 4.76976C69.0891 4.72841 68.7689 5.01049 68.6958 5.40679Z" />
                <path d="M74.0117 26.1349C73.2662 27.1206 72.5493 28.1096 72.0194 29.235C71.5688 30.167 71.2007 31.137 70.7216 32.0658C70.4995 32.5033 70.252 32.9091 69.9475 33.3085C69.8142 33.4669 69.6779 33.654 69.5161 33.8093C69.4527 33.86 68.9199 34.2339 68.9167 34.2624C68.9263 34.1768 69.0752 34.3957 69.0055 34.2434C68.958 34.1515 68.8534 34.0531 68.8058 33.9612C68.6347 33.6821 68.4637 33.403 68.264 33.1208L67.1612 31.3512C66.3532 30.0477 65.5199 28.7126 64.7119 27.4093C64.5185 27.0699 63.9701 27.0666 63.7131 27.2979C63.396 27.5514 63.4053 27.9858 63.6018 28.2966C64.3845 29.5683 65.1956 30.8431 65.9783 32.1149L67.1572 33.9796C67.5025 34.5093 67.8225 35.2671 68.428 35.5368C69.6136 36.0446 70.7841 34.615 71.3424 33.7529C71.9992 32.786 72.4085 31.705 72.9035 30.6336C73.4842 29.3116 74.2774 28.1578 75.1306 26.9818C75.7047 26.2369 74.5573 25.3868 74.0117 26.1349ZM55.1301 12.2849C54.6936 18.274 54.6565 24.3076 55.0284 30.3003C55.1293 31.987 55.2555 33.7056 55.4419 35.4019C55.5431 36.3087 56.9541 36.0905 56.8529 35.1837C56.2654 29.3115 56.0868 23.3982 56.2824 17.4978C56.3528 15.8301 56.4263 14.1339 56.5537 12.4725C56.6301 11.5276 55.2034 11.3686 55.1301 12.2849Z" />
                <path d="M59.2642 30.6571C58.8264 31.475 58.36 32.2896 57.9222 33.1075C57.7032 33.5164 57.4843 33.9253 57.2369 34.3311C57.0528 34.6861 56.8656 35.0697 56.6278 35.3898C56.596 35.4152 56.5611 35.4691 56.5294 35.4944C56.4881 35.6054 56.5041 35.4627 56.5548 35.5261C56.7481 35.6055 56.8337 35.6151 56.7545 35.5484L56.6784 35.4533C56.6023 35.3581 56.5263 35.263 56.4534 35.1393C56.1778 34.7619 55.8734 34.3814 55.5946 34.0324C55.0146 33.2744 54.4315 32.545 53.8515 31.787C53.2685 31.0576 52.1584 31.945 52.7415 32.6744C53.4229 33.5592 54.1042 34.4441 54.7888 35.3004C55.1184 35.7127 55.4321 36.2677 55.8569 36.6039C56.3069 36.9719 56.884 36.9784 57.3533 36.6551C57.7624 36.3542 57.9845 35.9167 58.2067 35.4792C58.4636 34.9878 58.746 34.5282 59.003 34.0369C59.5423 33.0859 60.0563 32.1032 60.5957 31.1522C60.7765 30.8257 60.5104 30.3627 60.2092 30.2135C59.8161 30.112 59.4451 30.3305 59.2642 30.6571ZM44.5918 10.1569L42.2324 37.5406C42.0032 40.1151 41.8057 42.6641 41.5764 45.2386C41.5032 46.1549 42.9299 46.314 43.0032 45.3977L45.3626 18.014C45.5918 15.4396 45.7893 12.8905 46.0186 10.316C46.1235 9.37433 44.6968 9.21532 44.5918 10.1569Z" />
                <path d="M48.101 37.7616C46.7404 38.8232 45.8267 40.2814 44.9163 41.7109C44.0407 43.0866 43.1365 44.4592 41.738 45.3434C42.1247 45.5019 42.5146 45.6321 42.9014 45.7908C42.1324 41.8051 41.04 37.8699 39.6781 34.0203C39.545 33.6589 39.0695 33.5191 38.7365 33.6553C38.3719 33.817 38.2385 34.2353 38.3716 34.5969C39.7209 38.3007 40.7404 42.1121 41.4904 46.009C41.6012 46.5703 42.1877 46.7512 42.6539 46.4565C45.5462 44.6124 46.3877 40.9506 49.0169 38.8748C49.7178 38.2884 48.8304 37.1784 48.101 37.7616ZM25.9671 13.1014C25.7028 16.2497 26.0758 19.3824 26.5091 22.4929C26.9645 25.6636 27.4166 28.863 27.872 32.0337C28.1346 33.8253 28.3971 35.6167 28.631 37.4051C28.7607 38.3151 30.1717 38.0968 30.042 37.1868C29.5866 34.016 29.1281 30.8738 28.7012 27.7062C28.2647 24.6242 27.7396 21.5612 27.449 18.4666C27.2943 16.7449 27.2283 15.0042 27.3653 13.2572C27.4671 12.3442 26.0404 12.1851 25.9671 13.1014Z" />
                <path d="M30.5625 27.3357C29.9525 30.7343 29.3425 34.133 28.704 37.5284C29.1225 37.4018 29.5411 37.2751 29.9882 37.1516C28.6034 35.0617 27.2504 32.9465 25.8655 30.8565C25.6406 30.5425 25.1523 30.517 24.8669 30.7451C24.5497 30.9987 24.5305 31.4299 24.7555 31.7439C26.1403 33.8338 27.4933 35.9491 28.8781 38.039C29.2489 38.6003 30.0417 38.2265 30.1624 37.6621C30.7724 34.2635 31.3824 30.8648 32.0209 27.4694C32.0908 27.1016 31.758 26.7178 31.3871 26.6765C30.9559 26.6573 30.6324 26.9679 30.5625 27.3357Z" />
              </svg>

              {/* Single CTA — Get started for free only */}
              <Link href="/sign-up">
                <div className="group cursor-pointer border border-border bg-card gap-2 h-[60px] flex items-center p-[10px] rounded-full">
                  <div className="border border-border bg-primary h-[40px] rounded-full flex items-center justify-center text-primary-foreground">
                    <p className="font-medium tracking-tight mr-3 ml-3 flex items-center gap-2 justify-center text-base">
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-globe animate-spin">
                        <circle cx="12" cy="12" r="10" /><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" /><path d="M2 12h20" />
                      </svg>
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

      {/* Toggle — sits directly above plan cards */}
      <section className="pt-16 pb-8 px-4 relative z-10">
        <m.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
          className="flex justify-center"
        >
          <div className="rounded-full bg-foreground/5 border border-foreground/10 p-1 flex items-center">
            <button
              onClick={() => setIsAnnual(false)}
              aria-pressed={!isAnnual}
              className={cn("px-6 py-2 rounded-full text-sm font-medium transition-all", !isAnnual ? "bg-primary text-primary-foreground shadow-lg" : "text-foreground/60 hover:text-foreground/80")}
            >
              Monthly
            </button>
            <button
              onClick={() => setIsAnnual(true)}
              aria-pressed={isAnnual}
              className={cn("px-6 py-2 rounded-full text-sm font-medium transition-all relative", isAnnual ? "bg-primary text-primary-foreground shadow-lg" : "text-foreground/60 hover:text-foreground/80")}
            >
              Annual
              <span className="absolute -top-2 -right-6 bg-secondary text-secondary-foreground text-[10px] px-1.5 py-0.5 rounded-full">-20%</span>
            </button>
          </div>
        </m.div>
      </section>

      {/* Plan Cards */}
      <section className="pb-24 px-4 relative z-10">
        <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-6 px-4 sm:px-0">
          {plans.map((plan, i) => (
            <m.div
              key={plan.name}
              {...fadeInUp}
              whileInView={fadeInUp.animate}
              viewport={viewportOnce}
              transition={{ duration: 0.4, delay: i * 0.1 }}
              whileHover={cardHover}
              className={cn(
                "relative rounded-2xl p-8 border transition-all duration-300 flex flex-col h-full",
                plan.popular
                  ? "bg-gradient-to-b from-primary/10 to-transparent border-primary/30 shadow-lg shadow-primary/10"
                  : "bg-card border-white/10 shadow-[0px_2px_0px_0px_rgba(255,255,255,0.1)_inset] hover:border-white/20"
              )}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-primary text-primary-foreground text-xs font-medium px-4 py-1.5 rounded-full">Most Popular</span>
                </div>
              )}

              <Image src={plan.icon} alt={plan.name} width={48} height={48} className="mb-4 object-contain hidden dark:block" draggable={false} />
              <Image src={plan.iconLight ?? plan.icon} alt={plan.name} width={48} height={48} className="mb-4 object-contain block dark:hidden" draggable={false} />

              <h3 className="text-lg font-semibold text-foreground">{plan.name}</h3>
              <p className="text-sm text-muted-foreground mb-4">{plan.description}</p>

              <div className="mb-6">
                {plan.monthlyPrice === 0 ? (
                  <p className="text-4xl font-bold text-foreground">Free</p>
                ) : (
                  <>
                    <p className="text-4xl font-bold text-foreground">
                      €{isAnnual ? (plan.annualPrice! / 12).toFixed(2) : plan.monthlyPrice.toFixed(2)}
                      <span className="text-base font-normal text-muted-foreground">/mo</span>
                    </p>
                    {isAnnual && (
                      <p className="text-sm text-muted-foreground mt-1">€{plan.annualPrice}/year billed annually</p>
                    )}
                  </>
                )}
              </div>

              <ul className="space-y-3 mb-8 flex-1">
                {plan.features.map((f) => (
                  <li key={f.text} className="flex items-start gap-2.5 text-sm">
                    {f.included ? (
                      <Check className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                    ) : (
                      <X className="h-4 w-4 text-foreground/20 flex-shrink-0 mt-0.5" />
                    )}
                    <span className={f.included ? "text-foreground/80" : "text-foreground/30"}>{f.text}</span>
                  </li>
                ))}
              </ul>

              <m.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleSelect(plan)}
                disabled={loadingPlan === plan.name}
                className={cn(
                  "w-full py-3 px-6 rounded-full font-medium text-sm transition-all",
                  plan.popular
                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25"
                    : "bg-foreground/10 text-foreground border border-foreground/20 hover:bg-foreground/20"
                )}
              >
                {loadingPlan === plan.name ? "Loading..." : plan.cta}
              </m.button>
            </m.div>
          ))}
        </div>
      </section>

      {/* Comparison Table */}
      <section className="py-24 px-4 relative z-10">
        <div className="max-w-4xl mx-auto">
          <m.div
            className="flex justify-center mb-4"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <div className="border-primary/40 text-primary inline-flex items-center gap-2 rounded-full border px-3 py-1 uppercase">
              <span>✶</span>
              <span className="text-sm">Compare</span>
            </div>
          </m.div>
          <m.h2
            className={cn("text-5xl md:text-[72px] md:leading-[80px] font-semibold tracking-tighter text-center mb-12", geist.className)}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            viewport={{ once: true }}
          >
            All Features.
          </m.h2>
          <div className="rounded-2xl border border-white/10 bg-card shadow-[0px_2px_0px_0px_rgba(255,255,255,0.1)_inset] overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-4 px-6 text-muted-foreground font-medium">Feature</th>
                  <th className="text-center py-4 px-4 text-muted-foreground">Starter</th>
                  <th className="text-center py-4 px-4 text-primary font-bold">PRO</th>
                  <th className="text-center py-4 px-4 text-muted-foreground">MAX</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["Transactions", "300", "1,500", "5,000"],
                  ["Monthly bonus", "50", "250", "750"],
                  ["Receipt scans/mo", "10", "50", "150"],
                  ["AI chats/week", "10", "50", "100"],
                  ["AI insights", "3 free", "Full", "Full"],
                  ["Advanced charts", "—", "✓", "✓"],
                  ["Custom categories", "1", "10", "25"],
                  ["Rooms", "2", "10", "Unlimited"],
                  ["Friends", "5", "50", "Unlimited"],
                  ["Shared tx/month", "50", "200", "Unlimited"],
                ].map(([feature, starter, pro, max]) => (
                  <tr key={feature} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="py-3 px-6 text-foreground/80">{feature}</td>
                    <td className="py-3 px-4 text-center text-foreground/60">{starter}</td>
                    <td className="py-3 px-4 text-center text-primary font-medium">{pro}</td>
                    <td className="py-3 px-4 text-center text-foreground/60">{max}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Transaction Packs */}
      <section className="py-24 px-4 relative z-10 overflow-hidden">
        {/* Side blur orbs */}
        <div className="bg-primary/20 absolute top-1/2 -right-20 z-[-1] h-64 w-64 rounded-full opacity-80 blur-3xl pointer-events-none" />
        <div className="bg-primary/20 absolute top-1/2 -left-20 z-[-1] h-64 w-64 rounded-full opacity-80 blur-3xl pointer-events-none" />

        <div className="max-w-4xl mx-auto relative z-10">
          <m.div
            className="flex justify-center mb-4"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <div className="border-primary/40 text-primary inline-flex items-center gap-2 rounded-full border px-3 py-1 uppercase">
              <span>✶</span>
              <span className="text-sm">One-time</span>
            </div>
          </m.div>
          <m.h2
            className={cn("text-5xl md:text-[72px] md:leading-[80px] font-semibold tracking-tighter text-center mb-4", geist.className)}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            viewport={{ once: true }}
          >
            Transaction Packs.
          </m.h2>
          <m.p
            className="text-center text-muted-foreground mb-12 text-lg"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            viewport={{ once: true }}
          >
            Need more transactions? Buy a one-time pack. No subscription required.
          </m.p>
          <div className="grid sm:grid-cols-3 gap-6">
            {transactionPacks.map((pack, i) => (
              <m.div
                key={pack.tx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                whileHover={{ y: -5 }}
                className="rounded-2xl border border-white/10 bg-card shadow-[0px_2px_0px_0px_rgba(255,255,255,0.1)_inset] p-6 text-center transition-all duration-300 hover:border-white/20"
              >
                <p className="text-3xl font-bold text-foreground mb-1">{pack.tx.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground mb-4">transactions</p>
                <p className="text-2xl font-bold text-primary mb-6">€{pack.price}</p>
                <button
                  onClick={() => handleSelectPack(pack)}
                  disabled={loadingPack === pack.tx}
                  className="inline-block w-full rounded-full font-medium text-sm border border-white/20 bg-white/5 text-foreground py-2.5 transition-all hover:-translate-y-0.5 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loadingPack === pack.tx ? "Loading..." : "Buy Pack"}
                </button>
              </m.div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <FAQSection
        badgeLabel="Billing FAQ"
        title={
          <>
            Questions?{" "}
            <span className="bg-gradient-to-b from-foreground via-rose-200 to-primary bg-clip-text text-transparent py-1">
              We&apos;ve got answers
            </span>
          </>
        }
        items={[
          { question: "Can I cancel anytime?", answer: "Yes. You keep access until the end of your billing period. No penalties." },
          { question: "What happens when I reach my transaction limit?", answer: "You can buy a one-time transaction pack or upgrade to a higher plan. Your existing data is never deleted." },
          { question: "Do you offer refunds?", answer: "We offer a 14-day money-back guarantee on all paid plans." },
          { question: "How do transaction packs work?", answer: "Transaction packs are one-time purchases that add capacity to your account. They don't expire and stack with your plan." },
          { question: "Can I switch plans?", answer: "Yes. Upgrades take effect immediately with prorated billing. Downgrades take effect at the end of your billing period." },
        ]}
      />

      {/* CTA */}
      <section className="relative overflow-hidden pt-48 pb-96 px-4 z-10">
        {/* Blur orbs — matches FAQ section atmosphere */}
        <div className="bg-primary/20 absolute top-1/2 -right-20 z-[-1] h-64 w-64 rounded-full opacity-80 blur-3xl pointer-events-none" />
        <div className="bg-primary/20 absolute top-1/2 -left-20 z-[-1] h-64 w-64 rounded-full opacity-80 blur-3xl pointer-events-none" />

        <div className="max-w-2xl mx-auto text-center relative z-10">
          <m.h2
            className={cn("text-5xl md:text-[72px] md:leading-[80px] font-semibold tracking-tighter mb-8", geist.className)}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            Start Free Today.
          </m.h2>
          <m.p
            className="mx-auto mb-12 max-w-2xl text-lg text-muted-foreground"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            viewport={{ once: true }}
          >
            300 transactions. No credit card required.
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
