import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Features — Budgeting, Receipt Scanning, Expense Tracking & More",
  description:
    "Explore all Trakzi features: AI receipt scanning, CSV bank import, shared expense rooms, grocery budget tracking, interactive charts, and savings tools. Free to start.",
  openGraph: {
    title: "Trakzi Features — Budgeting, Receipt Scanning & More",
    description:
      "AI receipt scanning, CSV bank import, shared expense rooms, grocery budget tracking, interactive charts, and savings tools.",
    url: "https://trakzi.com/features",
  },
}

export default function FeaturesHubLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
