"use client"

import ComparisonPage from "@/components/comparison-page"

export default function TrakziVsSplitwisePage() {
  return (
    <ComparisonPage
      competitorName="Splitwise"
      headline="Trakzi vs Splitwise"
      heroDescription="Splitwise is great for splitting bills. Trakzi does that too — plus personal budgeting, receipt scanning, CSV import, and AI charts, all in one workspace."
      ctaText="Get both in one app"
      features={[
        { feature: "Split bills with friends", trakzi: "yes", competitor: "yes" },
        { feature: "Personal expense tracking", trakzi: "yes", competitor: "no" },
        { feature: "CSV bank import", trakzi: "yes", competitor: "no" },
        { feature: "Receipt scanning (AI)", trakzi: "yes", competitor: "no" },
        { feature: "Budgeting tools", trakzi: "yes", competitor: "no" },
        { feature: "Interactive charts", trakzi: "yes", competitor: "no" },
        { feature: "AI spending analysis", trakzi: "yes", competitor: "no" },
        { feature: "Simplified debts", trakzi: "yes", competitor: "yes" },
        { feature: "Multiple rooms/groups", trakzi: "yes", competitor: "yes" },
        { feature: "Settle up tracking", trakzi: "yes", competitor: "yes" },
        { feature: "Free plan", trakzi: "yes", competitor: "partial" },
      ]}
      trakziAdvantages={[
        "Personal finance + shared expenses in one app — no need for two separate tools",
        "CSV bank import — see all your transactions, not just shared ones",
        "Receipt scanning with AI — track cash purchases too",
        "20+ chart types — visualize where your money goes beyond just splits",
        "AI assistant — get spending insights and answers to financial questions",
        "Free tier with generous limits — Splitwise shows ads on free plan",
      ]}
      competitorStrengths={[
        "Splitwise has a more established mobile app (iOS and Android)",
        "Splitwise has PayPal/Venmo integration for settling up directly",
        "Splitwise has a larger user base — easier to invite friends who already use it",
        "Splitwise supports more currencies and is popular in more countries",
      ]}
      conclusion="Splitwise does one thing well: splitting bills. But that's all it does. If you also want to track personal expenses, import bank statements, scan receipts, and see spending charts — you'd need a second app. Trakzi combines shared expense tracking with full personal finance tools, so you see your complete financial picture in one place."
    />
  )
}
