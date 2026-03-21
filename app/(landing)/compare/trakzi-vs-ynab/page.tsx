"use client"

import ComparisonPage from "@/components/comparison-page"

export default function TrakziVsYnabPage() {
  return (
    <ComparisonPage
      competitorName="YNAB"
      headline="Trakzi vs YNAB"
      heroDescription="YNAB popularized zero-based budgeting. Trakzi adds CSV import, receipt scanning, shared expenses, and AI analytics — without requiring a bank connection."
      ctaText="Try Trakzi free today"
      features={[
        { feature: "Free plan", trakzi: "yes", competitor: "no" },
        { feature: "CSV bank import", trakzi: "yes", competitor: "no" },
        { feature: "Receipt scanning (AI)", trakzi: "yes", competitor: "no" },
        { feature: "Bank account linking", trakzi: "no", competitor: "yes" },
        { feature: "Shared expense rooms", trakzi: "yes", competitor: "no" },
        { feature: "Interactive charts (20+)", trakzi: "yes", competitor: "partial" },
        { feature: "AI spending analysis", trakzi: "yes", competitor: "no" },
        { feature: "Zero-based budgeting", trakzi: "partial", competitor: "yes" },
        { feature: "Goal tracking", trakzi: "yes", competitor: "yes" },
        { feature: "Works without bank connection", trakzi: "yes", competitor: "no" },
        { feature: "Mobile app", trakzi: "partial", competitor: "yes" },
      ]}
      trakziAdvantages={[
        "Free to start — YNAB costs $14.99/month after trial",
        "Import any bank CSV — works with any bank worldwide, no connection required",
        "Scan receipts with AI — track cash and card purchases without typing",
        "Shared expense rooms — split bills with roommates and friends (YNAB doesn't do this)",
        "20+ interactive chart types — visualize spending in ways YNAB can't",
        "AI-powered analysis — ask questions about your spending, get insights",
        "Privacy-first — your bank credentials are never shared",
      ]}
      competitorStrengths={[
        "YNAB has a mature mobile app with offline support",
        "YNAB's zero-based budgeting method is more structured and disciplined",
        "YNAB has a large community and extensive educational content",
        "YNAB supports direct bank connections in the US (auto-sync)",
      ]}
      conclusion="YNAB is the gold standard for zero-based budgeting, but it's expensive ($14.99/month) and requires bank connection for the best experience. Trakzi is free to start, works without connecting your bank, adds receipt scanning and shared expense tracking — making it a better fit if you want flexibility and privacy over rigid budgeting methodology."
    />
  )
}
