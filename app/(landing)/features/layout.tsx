import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Features — Budgeting, Receipt Scanning, Expense Tracking & More",
  description:
    "Explore all Trakzi features: AI receipt scanning, CSV bank import, shared expense rooms, grocery budget tracking, interactive charts, and savings tools. Free to start.",
  alternates: {
    canonical: "https://trakzi.com/features",
    languages: {
      en: "https://trakzi.com/features",
      es: "https://trakzi.com/es/features",
      "x-default": "https://trakzi.com/features",
    },
  },
  openGraph: {
    title: "Trakzi Features — Budgeting, Receipt Scanning & More",
    description:
      "AI receipt scanning, CSV bank import, shared expense rooms, grocery budget tracking, interactive charts, and savings tools.",
    url: "https://trakzi.com/features",
    images: [{ url: "https://trakzi.com/Trakzi/og-image.png", width: 1200, height: 630, alt: "Trakzi Features" }],
  },
}

export default function FeaturesHubLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
