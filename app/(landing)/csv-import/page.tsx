"use client"

import FeaturePage from "@/components/feature-page"

export default function CsvImportPage() {
  return (
    <FeaturePage
      locale="en"
      headline="Import Any Bank CSV. See Your Spending Come Alive."
      subheadline="CSV Bank Import"
      heroDescription="Export your transactions from any bank or card provider as a CSV file. Upload it to Trakzi and watch your spending transform into interactive charts — no bank connection, no privacy risk."
      ctaText="Import Your First CSV Free"
      statsValue="Any bank"
      statsLabel="Works worldwide"
      benefits={[
        {
          title: "No Bank Connection Required",
          description:
            "Unlike other apps, Trakzi never connects to your bank. You control what data you share. Upload a CSV and you're done. Your credentials stay private.",
        },
        {
          title: "Works With Any Bank Worldwide",
          description:
            "CaixaBank, BBVA, Santander, Chase, HSBC — Trakzi normalizes CSV data from any bank or card provider, anywhere in the world.",
        },
        {
          title: "Instant Charts & Analytics",
          description:
            "The moment you upload, Trakzi generates 20+ interactive charts: spending trends, category breakdowns, heatmaps, and more.",
        },
        {
          title: "AI Auto-Categorization",
          description:
            "Trakzi's AI categorizes your transactions automatically — groceries, transport, entertainment, bills. No manual tagging needed.",
        },
      ]}
      steps={[
        {
          step: 1,
          title: "Export Your CSV",
          description:
            "Log into your bank's website or app and export your transactions as a CSV file. Most banks support this in their statement or export section.",
        },
        {
          step: 2,
          title: "Upload to Trakzi",
          description:
            "Drag and drop your CSV file into Trakzi. Our parser detects columns, dates, and currencies automatically.",
        },
        {
          step: 3,
          title: "Explore Your Finances",
          description:
            "Your transactions appear instantly with auto-generated charts, categories, and spending insights. Start analyzing right away.",
        },
      ]}
      relatedPages={[
        { href: "/receipt-scanner", label: "Receipt Scanner" },
        { href: "/grocery-tracker", label: "Grocery Tracker" },
        { href: "/split-expenses", label: "Split Expenses" },
      ]}
    />
  )
}
