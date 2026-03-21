"use client"

import ComparisonPage from "@/components/comparison-page"

export default function TrakziVsMonarchPage() {
  return (
    <ComparisonPage
      competitorName="Monarch Money"
      headline="Trakzi vs Monarch Money"
      heroDescription="Monarch Money is a polished budgeting app that requires bank connection. Trakzi lets you import CSVs and scan receipts instead — keeping your bank credentials private."
      ctaText="Budget without sharing bank credentials"
      features={[
        { feature: "Free plan", trakzi: "yes", competitor: "no" },
        { feature: "CSV bank import", trakzi: "yes", competitor: "no" },
        { feature: "Receipt scanning (AI)", trakzi: "yes", competitor: "no" },
        { feature: "Bank account linking", trakzi: "no", competitor: "yes" },
        { feature: "Auto-sync transactions", trakzi: "no", competitor: "yes" },
        { feature: "Shared expense rooms", trakzi: "yes", competitor: "partial" },
        { feature: "Interactive charts (20+)", trakzi: "yes", competitor: "partial" },
        { feature: "AI spending analysis", trakzi: "yes", competitor: "no" },
        { feature: "Custom categories", trakzi: "yes", competitor: "yes" },
        { feature: "Goal tracking", trakzi: "yes", competitor: "yes" },
        { feature: "Works without bank connection", trakzi: "yes", competitor: "no" },
        { feature: "Net worth tracking", trakzi: "partial", competitor: "yes" },
      ]}
      trakziAdvantages={[
        "Free plan available — Monarch costs $9.99/month",
        "CSV import works with any bank worldwide — Monarch's bank linking has limited international support",
        "Receipt scanning with AI — track cash purchases and verify totals",
        "Dedicated shared expense rooms — better than Monarch's household sharing",
        "Privacy-first approach — never share bank credentials",
        "20+ chart types for deeper spending analysis",
        "AI assistant for spending insights and financial questions",
      ]}
      competitorStrengths={[
        "Monarch has automatic bank sync — transactions appear without manual work",
        "Monarch has a more polished mobile experience",
        "Monarch supports net worth tracking across investment accounts",
        "Monarch has a more established brand and larger user base in the US",
      ]}
      conclusion="Monarch Money is a strong Mint replacement with excellent auto-sync, but it costs $9.99/month and requires connecting your bank accounts. If you're outside the US, Monarch's bank support is limited. Trakzi works with any bank worldwide via CSV, is free to start, adds receipt scanning for cash purchases, and includes shared expense rooms — making it a better choice for privacy-conscious users and international users."
    />
  )
}
