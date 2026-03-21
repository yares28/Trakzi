"use client"

import FeaturePage from "@/components/feature-page"

export default function GroceryTrackerPage() {
  return (
    <FeaturePage
      locale="en"
      headline="Know Exactly Where Your Grocery Money Goes."
      subheadline="Grocery Budget Tracker"
      heroDescription="Scan grocery receipts from any store — Mercadona, Lidl, Carrefour, Costco, Aldi, Walmart. Trakzi tracks spending by store, category, and week so you can take control of your food budget."
      ctaText="Track Groceries Free"
      statsValue="Every store"
      statsLabel="Receipt scanning support"
      benefits={[
        {
          title: "Scan Grocery Receipts Instantly",
          description:
            "Snap a photo of your grocery receipt and Trakzi extracts the total, store, and date. Works with receipts from supermarkets worldwide.",
        },
        {
          title: "Spending by Store & Category",
          description:
            "See how much you spend at each supermarket. Break down spending by category — produce, dairy, meat, household — to find savings.",
        },
        {
          title: "Weekly & Monthly Trends",
          description:
            "Track your grocery spending over time with interactive charts. Spot patterns like weekday vs weekend spending or seasonal increases.",
        },
        {
          title: "Budget Alerts",
          description:
            "Set a monthly grocery budget and get notified when you're approaching your limit. Stay on track without manual tracking.",
        },
      ]}
      steps={[
        {
          step: 1,
          title: "Set Your Budget",
          description:
            "Define how much you want to spend on groceries each month. Trakzi tracks progress against your goal.",
        },
        {
          step: 2,
          title: "Scan Receipts as You Shop",
          description:
            "After each grocery trip, snap a photo of your receipt. Trakzi extracts and logs the purchase automatically.",
        },
        {
          step: 3,
          title: "Analyze & Optimize",
          description:
            "View charts showing spending by store, category, and time period. Identify where you're overspending and cut back.",
        },
      ]}
      relatedPages={[
        { href: "/receipt-scanner", label: "Receipt Scanner" },
        { href: "/csv-import", label: "CSV Import" },
        { href: "/split-expenses", label: "Split Expenses" },
      ]}
    />
  )
}
