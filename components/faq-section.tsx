"use client"

import { useState } from "react"
import { Plus, Minus } from "lucide-react"
import { m, AnimatePresence } from "framer-motion"
import { safeCapture } from "@/lib/posthog-safe"

const faqs = [
  {
    question: "What is Trakzi and how does it help me budget?",
    answer:
      "Trakzi is an all-in-one budgeting workspace where you can bring together your bank accounts, CSV exports, and receipts to see where your money is going at a glance. It combines AI-powered charts, spending analytics, and shared-expense tracking in a single app.",
  },
  {
    question: "How do I import my bank transactions into Trakzi?",
    answer:
      "Upload any CSV from your bank or card provider. Trakzi normalizes the data, keeps your original columns intact, and charts your spending automatically — no manual data entry required.",
  },
  {
    question: "Can I scan and store grocery receipts in Trakzi?",
    answer:
      "Yes. Snap or upload your grocery and retail receipts, and Trakzi extracts the totals so you can compare them against your budget and past spending habits.",
  },
  {
    question: "What does the AI in Trakzi actually do?",
    answer:
      'The built-in AI helps you spot overspending patterns, answers questions like "why was food higher this month?", and suggests adjustments to keep you on track with your financial goals.',
  },
  {
    question: "Is my financial transaction data safe with Trakzi?",
    answer:
      "Your data stays in your workspace. Trakzi never resells or shares it, and you can delete your uploads at any time. We follow security best practices to protect your files and insights.",
  },
  {
    question: "Can I track shared expenses and split bills with friends?",
    answer:
      "Absolutely. Trakzi lets you create shared rooms with friends or roommates, track group expenses, and see who owes what — making it easy to split bills, rent, and groceries.",
  },
]

// Generate the FAQPage JSON-LD schema for search engines and AI models
function generateFaqSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  }
}

export function FAQSection() {
  const [openItems, setOpenItems] = useState<number[]>([])

  const toggleItem = (index: number) => {
    const isOpening = !openItems.includes(index)
    setOpenItems((prev) => (prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]))

    // Track which FAQ questions users are most interested in
    if (isOpening) {
      safeCapture("faq_question_expanded", {
        question: faqs[index].question,
        question_index: index,
      })
    }
  }

  return (
    <section id="faq" className="relative overflow-hidden pt-48 pb-96">
      {/* FAQPage JSON-LD Schema for SEO / AEO / GEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(generateFaqSchema()) }}
      />

      {/* Background blur effects */}
      <div className="bg-primary/20 absolute top-1/2 -right-20 z-[-1] h-64 w-64 rounded-full opacity-80 blur-3xl"></div>
      <div className="bg-primary/20 absolute top-1/2 -left-20 z-[-1] h-64 w-64 rounded-full opacity-80 blur-3xl"></div>

      <div className="z-10 container mx-auto px-4">
        <m.div
          className="flex justify-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
        >
          <div className="border-primary/40 text-primary inline-flex items-center gap-2 rounded-full border px-3 py-1 uppercase">
            <span>✶</span>
            <span className="text-sm">Faqs</span>
          </div>
        </m.div>

        <m.h2
          className="mx-auto mt-6 pb-2 text-center text-5xl font-medium md:text-[72px] md:leading-[80px]"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          viewport={{ once: true }}
        >
          Questions? We've got{" "}
          <span className="bg-gradient-to-b from-foreground via-rose-200 to-primary bg-clip-text text-transparent py-1">
            answers
          </span>
        </m.h2>

        <div className="mx-auto mt-12 flex max-w-5xl flex-col gap-6">
          {faqs.map((faq, index) => (
            <m.div
              key={faq.question}
              className="from-secondary/40 to-secondary/10 rounded-2xl border border-white/10 bg-gradient-to-b p-6 shadow-[0px_2px_0px_0px_rgba(255,255,255,0.1)_inset] transition-all duration-300 hover:border-white/20 cursor-pointer"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              viewport={{ once: true }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => toggleItem(index)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault()
                  toggleItem(index)
                }
              }}
              {...(index === faqs.length - 1 && { "data-faq": faq.question })}
            >
              <div className="flex items-start justify-between">
                <h3 className="m-0 font-medium pr-4">{faq.question}</h3>
                <m.div
                  animate={{ rotate: openItems.includes(index) ? 180 : 0 }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                  className=""
                >
                  {openItems.includes(index) ? (
                    <Minus className="text-primary flex-shrink-0 transition duration-300" size={24} />
                  ) : (
                    <Plus className="text-primary flex-shrink-0 transition duration-300" size={24} />
                  )}
                </m.div>
              </div>
              <AnimatePresence>
                {openItems.includes(index) && (
                  <m.div
                    className="mt-4 text-muted-foreground leading-relaxed overflow-hidden"
                    initial={{ opacity: 0, height: 0, marginTop: 0 }}
                    animate={{ opacity: 1, height: "auto", marginTop: 16 }}
                    exit={{ opacity: 0, height: 0, marginTop: 0 }}
                    transition={{
                      duration: 0.4,
                      ease: "easeInOut",
                      opacity: { duration: 0.2 },
                    }}
                  >
                    {faq.answer}
                  </m.div>
                )}
              </AnimatePresence>
            </m.div>
          ))}
        </div>
      </div>
    </section>
  )
}

