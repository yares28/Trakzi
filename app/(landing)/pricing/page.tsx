"use client"

import { m } from "framer-motion"
import Link from "next/link"
import { Check, X, Sparkles } from "lucide-react"
import { useState } from "react"
import { geist } from "@/lib/fonts"
import { cn } from "@/lib/utils"
import { PageHeader, CtaButtons } from "@/components/page-layout"
import { StickyFooter } from "@/components/sticky-footer"

import { useRouter } from "next/navigation"
import { useAuth } from "@clerk/nextjs"
import { toast } from "sonner"

const plans = [
  {
    name: "Starter",
    monthlyPrice: 0,
    description: "Try it out",
    icon: "/Trakzi/subs/freeiconB.png",
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
  const router = useRouter()
  const { isSignedIn } = useAuth()

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
    <div className="min-h-screen w-full relative bg-black text-white">

      <div className="fixed inset-0 z-0 pointer-events-none" style={{ background: "radial-gradient(ellipse 50% 35% at 50% 0%, rgba(226, 232, 240, 0.12), transparent 60%), #000000" }} />

      {/* Header */}
      <PageHeader />

      {/* Hero */}
      <section className="relative py-48 px-4">
        <div className="max-w-4xl mx-auto relative z-10 text-center">
          <m.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-sm mb-6">
              <Sparkles className="h-4 w-4 text-[#e78a53]" />
              <span className="text-[#e78a53] font-medium text-sm">Pricing</span>
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-7xl lg:text-9xl mb-8">
              Simple, Transparent Pricing
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Start free. Upgrade when you need more. No hidden fees.
            </p>
          </m.div>
        </div>
      </section>

      {/* Toggle */}
      <section className="pb-12 px-4 relative z-10">
        <div className="flex items-center justify-center">
          <div className="rounded-full bg-white/5 border border-white/10 p-1 flex items-center">
            <button
              onClick={() => setIsAnnual(false)}
              className={cn("px-6 py-2 rounded-full text-sm font-medium transition-all", !isAnnual ? "bg-[#e78a53] text-white shadow-lg" : "text-white/60 hover:text-white/80")}
            >
              Monthly
            </button>
            <button
              onClick={() => setIsAnnual(true)}
              className={cn("px-6 py-2 rounded-full text-sm font-medium transition-all relative", isAnnual ? "bg-[#e78a53] text-white shadow-lg" : "text-white/60 hover:text-white/80")}
            >
              Annual
              <span className="absolute -top-2 -right-6 bg-emerald-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">-20%</span>
            </button>
          </div>
        </div>
      </section>

      {/* Plan Cards */}
      <section className="pb-24 px-4 relative z-10">
        <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-6">
          {plans.map((plan, i) => (
            <m.div
              key={plan.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.1 }}
              whileHover={{ y: -5 }}
              className={cn(
                "relative rounded-2xl p-8 backdrop-blur-sm border transition-all flex flex-col h-full",
                plan.popular
                  ? "bg-gradient-to-b from-[#e78a53]/10 to-transparent border-[#e78a53]/30 shadow-lg shadow-[#e78a53]/10"
                  : "bg-white/5 border-white/10 hover:border-white/20"
              )}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-gradient-to-r from-[#e78a53] to-[#e78a53]/80 text-white text-xs font-medium px-4 py-1.5 rounded-full">Most Popular</span>
                </div>
              )}

              <img src={plan.icon} alt={plan.name} className="h-12 w-12 mb-4 object-contain" draggable={false} />

              <h3 className="text-lg font-semibold text-white">{plan.name}</h3>
              <p className="text-sm text-muted-foreground mb-4">{plan.description}</p>

              <div className="mb-6">
                {plan.monthlyPrice === 0 ? (
                  <p className="text-4xl font-bold text-white">Free</p>
                ) : (
                  <>
                    <p className="text-4xl font-bold text-white">
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
                      <Check className="h-4 w-4 text-[#e78a53] flex-shrink-0 mt-0.5" />
                    ) : (
                      <X className="h-4 w-4 text-white/20 flex-shrink-0 mt-0.5" />
                    )}
                    <span className={f.included ? "text-white/80" : "text-white/30"}>{f.text}</span>
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
                    ? "bg-gradient-to-r from-[#e78a53] to-[#e78a53]/80 text-white shadow-lg shadow-[#e78a53]/25"
                    : "bg-white/10 text-white border border-white/20 hover:bg-white/20"
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
          <h2 className={cn("text-3xl sm:text-4xl font-semibold tracking-tighter text-center mb-12 bg-gradient-to-b from-zinc-800 to-zinc-700 bg-clip-text text-transparent", geist.className)}>
            Compare All Features
          </h2>
          <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-4 px-6 text-muted-foreground font-medium">Feature</th>
                  <th className="text-center py-4 px-4 text-muted-foreground">Starter</th>
                  <th className="text-center py-4 px-4 text-[#e78a53] font-bold">PRO</th>
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
                    <td className="py-3 px-6 text-white/80">{feature}</td>
                    <td className="py-3 px-4 text-center text-white/60">{starter}</td>
                    <td className="py-3 px-4 text-center text-[#e78a53] font-medium">{pro}</td>
                    <td className="py-3 px-4 text-center text-white/60">{max}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Transaction Packs */}
      <section className="py-24 px-4 relative z-10">
        <div className="max-w-4xl mx-auto">
          <h2 className={cn("text-3xl sm:text-4xl font-semibold tracking-tighter text-center mb-4 bg-gradient-to-b from-zinc-800 to-zinc-700 bg-clip-text text-transparent", geist.className)}>
            Transaction Packs
          </h2>
          <p className="text-center text-muted-foreground mb-12">Need more transactions? Buy a one-time pack. No subscription required.</p>
          <div className="grid sm:grid-cols-3 gap-6">
            {transactionPacks.map((pack, i) => (
              <m.div
                key={pack.tx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                whileHover={{ y: -5 }}
                className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-6 text-center"
              >
                <p className="text-3xl font-bold text-white mb-1">{pack.tx.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground mb-4">transactions</p>
                <p className="text-2xl font-bold text-[#e78a53] mb-6">€{pack.price}</p>
                <Link
                  href="/sign-up"
                  className="inline-block w-full rounded-full font-medium text-sm border border-white/20 bg-white/10 text-white py-2.5 transition-all hover:-translate-y-0.5 hover:bg-white/20"
                >
                  Buy Pack
                </Link>
              </m.div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-24 px-4 relative z-10">
        <div className="max-w-3xl mx-auto">
          <h2 className={cn("text-3xl sm:text-4xl font-semibold tracking-tighter text-center mb-12 bg-gradient-to-b from-zinc-800 to-zinc-700 bg-clip-text text-transparent", geist.className)}>
            Billing FAQ
          </h2>
          {[
            { q: "Can I cancel anytime?", a: "Yes. You keep access until the end of your billing period. No penalties." },
            { q: "What happens when I reach my transaction limit?", a: "You can buy a one-time transaction pack or upgrade to a higher plan. Your existing data is never deleted." },
            { q: "Do you offer refunds?", a: "We offer a 14-day money-back guarantee on all paid plans." },
            { q: "How do transaction packs work?", a: "Transaction packs are one-time purchases that add capacity to your account. They don't expire and stack with your plan." },
            { q: "Can I switch plans?", a: "Yes. Upgrades take effect immediately with prorated billing. Downgrades take effect at the end of your billing period." },
          ].map((faq, i) => (
            <div key={i} className="p-6 rounded-2xl border border-white/10 bg-white/5 mb-4">
              <h3 className="text-base font-semibold text-white mb-2">{faq.q}</h3>
              <p className="text-sm text-muted-foreground">{faq.a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="py-48 px-4 relative z-10">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className={cn("via-foreground bg-gradient-to-b from-zinc-800 to-zinc-700 bg-clip-text text-5xl font-semibold tracking-tighter text-transparent md:text-[72px] md:leading-[80px] mb-8", geist.className)}>Start Free Today</h2>
          <p className="mx-auto mb-12 max-w-2xl text-lg text-muted-foreground">300 transactions. No credit card required.</p>
          <CtaButtons />
        </div>
      </section>

      <StickyFooter />
    </div>
  )
}
