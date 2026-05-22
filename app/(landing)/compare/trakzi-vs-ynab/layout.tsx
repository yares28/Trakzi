import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Trakzi vs YNAB — Which Budgeting App Is Better?",
  description:
    "Compare Trakzi and YNAB side by side. See how Trakzi's free CSV import, receipt scanning, and shared expenses compare to YNAB's envelope method.",
  alternates: {
    canonical: "https://trakzi.com/compare/trakzi-vs-ynab",
    languages: {
      en: "https://trakzi.com/compare/trakzi-vs-ynab",
      es: "https://trakzi.com/es/compare/trakzi-vs-ynab",
      "x-default": "https://trakzi.com/compare/trakzi-vs-ynab",
    },
  },
  openGraph: {
    title: "Trakzi vs YNAB — Budgeting App Comparison",
    description: "Compare Trakzi and YNAB side by side. Free CSV import, receipt scanning, shared expenses vs envelope method.",
    url: "https://trakzi.com/compare/trakzi-vs-ynab",
  },
}

export default function TrakziVsYnabLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
