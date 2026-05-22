import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Trakzi vs Splitwise — Best App for Shared Expenses?",
  description:
    "Compare Trakzi and Splitwise. Trakzi combines shared expense tracking with personal budgeting, receipt scanning, and AI charts — Splitwise only does splits.",
  alternates: {
    canonical: "https://trakzi.com/compare/trakzi-vs-splitwise",
    languages: {
      en: "https://trakzi.com/compare/trakzi-vs-splitwise",
      es: "https://trakzi.com/es/compare/trakzi-vs-splitwise",
      "x-default": "https://trakzi.com/compare/trakzi-vs-splitwise",
    },
  },
  openGraph: {
    title: "Trakzi vs Splitwise — Shared Expenses App Comparison",
    description: "Trakzi combines shared expenses with personal budgeting. Splitwise only does splits.",
    url: "https://trakzi.com/compare/trakzi-vs-splitwise",
    images: [{ url: "https://trakzi.com/Trakzi/og-image.png", width: 1200, height: 630, alt: "Trakzi vs Splitwise" }],
  },
}

export default function TrakziVsSplitwiseLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
