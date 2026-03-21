"use client"

import FeaturePage from "@/components/feature-page"

export default function ReceiptScannerPage() {
  return (
    <FeaturePage
      locale="en"
      headline="Scan Any Receipt. Track Every Expense."
      subheadline="AI Receipt Scanner"
      heroDescription="Snap a photo of any grocery, retail, or restaurant receipt and Trakzi extracts the store, date, and total automatically. No typing, no errors — just instant expense tracking."
      ctaText="Start Scanning Free"
      statsValue="Instant"
      statsLabel="Receipt processing"
      benefits={[
        {
          title: "AI-Powered Extraction",
          description:
            "Our OCR reads receipts from any store — supermarkets, restaurants, pharmacies. It extracts totals, dates, and store names in seconds.",
        },
        {
          title: "No Manual Entry",
          description:
            "Stop typing receipts line by line. Just snap a photo and Trakzi does the rest. Track spending without the hassle.",
        },
        {
          title: "Works With Any Receipt",
          description:
            "Paper receipts, PDF exports, or photos from your gallery. Trakzi handles them all, including long grocery receipts with dozens of items.",
        },
        {
          title: "Instant Budget Comparison",
          description:
            "Scanned totals are automatically compared against your budget and past spending. See at a glance if you're overspending.",
        },
      ]}
      steps={[
        {
          step: 1,
          title: "Snap or Upload",
          description:
            "Take a photo of your receipt with your phone camera, or upload a PDF or image from your gallery.",
        },
        {
          step: 2,
          title: "AI Reads the Receipt",
          description:
            "Trakzi's AI extracts the store name, date, items, and total. Processing takes just seconds.",
        },
        {
          step: 3,
          title: "Track & Analyze",
          description:
            "The receipt is saved to your account. View spending trends by store, category, and time period in interactive charts.",
        },
      ]}
      relatedPages={[
        { href: "/grocery-tracker", label: "Grocery Tracker" },
        { href: "/csv-import", label: "CSV Import" },
        { href: "/split-expenses", label: "Split Expenses" },
      ]}
    />
  )
}
