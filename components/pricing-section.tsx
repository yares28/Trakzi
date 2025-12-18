"use client"

import { motion } from "framer-motion"
import { Check, Sparkles, Loader2 } from "lucide-react"
import { useState } from "react"
import { geist } from "@/lib/fonts"
import { cn } from "@/lib/utils"
import { useRouter } from "next/navigation"
import { useAuth } from "@clerk/nextjs"
import { toast } from "sonner"

const pricingPlans = [
  {
    name: "Starter",
    price: "Free",
    description: "Perfect for getting started",
    features: [
      "400 transactions    (~ 1 year worth of stats)",
      "Unlimited receipt and file scans",
      "5 AI chat messages/day",
      "Advanced analytics charts",
      "10 custom categories",
    ],
    popular: false,
    cta: "Get Started",
    priceId: null, // Free plan - no Stripe price
  },
  {
    name: "PRO",
    monthlyPrice: 4.99,
    annualPrice: 49.99,
    description: "For anyone who wants to track their finances seriously",
    features: [
      "3,000 transactions    (~ 6 years worth of stats)",
      "Unlimited receipt scans",
      "Unlimited AI chat messages",
      "AI-powered insights & summaries",
      "Unlimited custom categories",
      "Export to CSV",
    ],
    popular: true,
    ctaMonthly: "Start Free Trial",
    ctaAnnual: "Subscribe Now",
    monthlyPriceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_PRO_MONTHLY,
    annualPriceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_PRO_ANNUAL,
  },
  {
    name: "MAX",
    monthlyPrice: 19.99,
    annualPrice: 199.99,
    description: "For power users who want everything",
    features: [
      "Unlimited transactions",
      "Everything in PRO",
      "Priority support",
      "Early access to new features",
      "Create sub accounts to separate your data (coming soon)",
      "Custom API with your data (coming soon)",
    ],
    popular: false,
    ctaMonthly: "Start Free Trial",
    ctaAnnual: "Go MAX",
    monthlyPriceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_MAX_MONTHLY,
    annualPriceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_MAX_ANNUAL,
  },
]


export function PricingSection() {
  const [isAnnual, setIsAnnual] = useState(false)
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null)
  const router = useRouter()
  const { isSignedIn } = useAuth()

  const handlePlanSelect = async (plan: typeof pricingPlans[0]) => {
    // Free plan - just redirect to sign up or dashboard
    if (plan.priceId === null && !plan.monthlyPriceId) {
      if (isSignedIn) {
        router.push('/home')
      } else {
        router.push('/sign-up')
      }
      return
    }

    // Paid plans - need to be signed in
    if (!isSignedIn) {
      router.push('/sign-up')
      return
    }

    const priceId = isAnnual ? plan.annualPriceId : plan.monthlyPriceId

    if (!priceId) {
      console.error('No price ID configured for this plan. Check NEXT_PUBLIC_STRIPE_PRICE_ID_* environment variables.')
      toast.error('Pricing is not configured yet. Please contact support.')
      return
    }

    setLoadingPlan(plan.name)

    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          priceId,
        }),
      })

      const data = await response.json()

      if (data.error) {
        console.error('Checkout error:', data.error)
        toast.error(data.error)
        return
      }

      if (data.url) {
        window.location.href = data.url
      }
    } catch (error) {
      console.error('Checkout error:', error)
      toast.error('Failed to start checkout. Please try again.')
    } finally {
      setLoadingPlan(null)
    }
  }

  return (
    <section className="relative py-24 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-sm mb-6"
          >
            <Sparkles className="w-4 h-4 text-[#e78a53]" />
            <span className="text-sm font-medium text-white/80">Pricing</span>
          </motion.div>

          <h2
            className={cn(
              "mb-8 bg-gradient-to-r from-foreground/60 via-foreground to-foreground/60 dark:from-muted-foreground/55 dark:via-foreground dark:to-muted-foreground/55 bg-clip-text text-center text-4xl font-semibold tracking-tighter text-transparent md:text-[54px] md:leading-[60px]",
              geist.className,
            )}
          >
            Pricing
          </h2>

          <p className="text-lg text-white/60 max-w-2xl mx-auto mb-8">
            Start logging your transactions, we will translate them for you into stories.
          </p>

          {/* Monthly/Annual Toggle */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="flex items-center justify-center gap-4 p-1 bg-white/5 rounded-full border border-white/10 backdrop-blur-sm w-fit mx-auto"
          >
            <button
              onClick={() => setIsAnnual(false)}
              className={`px-6 py-2 rounded-full text-sm font-medium transition-all duration-200 ${!isAnnual ? "bg-[#e78a53] text-white shadow-lg" : "text-white/60 hover:text-white/80"
                }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setIsAnnual(true)}
              className={`px-6 py-2 rounded-full text-sm font-medium transition-all duration-200 relative ${isAnnual ? "bg-[#e78a53] text-white shadow-lg" : "text-white/60 hover:text-white/80"
                }`}
            >
              Annual
              <span className="absolute -top-2 -right-2 bg-green-500 text-white text-xs px-2 py-0.5 rounded-full">
                Save 20%
              </span>
            </button>
          </motion.div>
        </motion.div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {pricingPlans.map((plan, index) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              whileHover={{ y: -5 }}
              className={`relative rounded-2xl p-8 backdrop-blur-sm border transition-all duration-300 ${plan.popular
                ? "bg-gradient-to-b from-[#e78a53]/10 to-transparent border-[#e78a53]/30 shadow-lg shadow-[#e78a53]/10"
                : "bg-white/5 border-white/10 hover:border-white/20"
                }`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <div className="bg-gradient-to-r from-[#e78a53] to-[#e78a53]/80 text-white text-sm font-medium px-4 py-2 rounded-full">
                    Most Popular
                  </div>
                </div>
              )}

              <div className="text-center mb-8">
                <h3 className="text-xl font-bold text-white mb-2">{plan.name}</h3>
                <div className="flex items-baseline justify-center gap-1 mb-2">
                  {plan.price ? (
                    <span className="text-4xl font-bold text-white">{plan.price}</span>
                  ) : (
                    <>
                      <span className="text-4xl font-bold text-white">
                        €{isAnnual ? plan.annualPrice : plan.monthlyPrice}
                      </span>
                      <span className="text-white/60 text-lg">{isAnnual ? "/year" : "/month"}</span>
                    </>
                  )}
                </div>
                <p className="text-white/60 text-sm">{plan.description}</p>
              </div>

              <ul className="space-y-4 mb-8">
                {plan.features.map((feature, featureIndex) => (
                  <li key={featureIndex} className="flex items-center gap-3">
                    <Check className="w-5 h-5 text-[#e78a53] flex-shrink-0" />
                    <span className="text-white/80 text-sm">{feature}</span>
                  </li>
                ))}
              </ul>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                disabled={loadingPlan === plan.name}
                onClick={() => handlePlanSelect(plan)}
                className={`w-full py-3 px-6 rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed ${plan.popular
                  ? "bg-gradient-to-r from-[#e78a53] to-[#e78a53]/80 text-white shadow-lg shadow-[#e78a53]/25 hover:shadow-[#e78a53]/40"
                  : "bg-white/10 text-white border border-white/20 hover:bg-white/20"
                  }`}
              >
                {loadingPlan === plan.name ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  plan.cta || (isAnnual ? plan.ctaAnnual : plan.ctaMonthly)
                )}
              </motion.button>
            </motion.div>
          ))}
        </div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="text-center mt-16"
        >
          <p className="text-white/60 mb-4">Need a custom solution? We're here to help.</p>
          <motion.a
            href="mailto:sales@trakzi.com?subject=Custom Solution Inquiry"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="text-[#e78a53] hover:text-[#e78a53]/80 font-medium transition-colors"
          >
            Contact our sales team →
          </motion.a>
        </motion.div>
      </div>
    </section>
  )
}
