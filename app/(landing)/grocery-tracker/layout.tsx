import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Grocery Budget Tracker — Scan Receipts & Control Food Spending",
  description:
    "Track every grocery purchase by scanning receipts with your phone. See spending by store, category, and week. Take control of your food budget with Trakzi.",
  alternates: {
    canonical: "https://trakzi.com/grocery-tracker",
    languages: {
      en: "https://trakzi.com/grocery-tracker",
      es: "https://trakzi.com/es/gastos-supermercado",
      "x-default": "https://trakzi.com/grocery-tracker",
    },
  },
  openGraph: {
    title: "Grocery Budget Tracker — Scan Receipts & Control Food Spending | Trakzi",
    description:
      "Track every grocery purchase by scanning receipts with your phone. See spending by store, category, and week.",
    url: "https://trakzi.com/grocery-tracker",
  },
}

export default function GroceryTrackerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
