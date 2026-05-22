import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Trakzi vs Monarch Money — Budget App Comparison",
  description:
    "Compare Trakzi and Monarch Money. Trakzi offers free CSV import without bank connection, receipt scanning, and shared expense rooms. See how they compare.",
  alternates: {
    canonical: "https://trakzi.com/compare/trakzi-vs-monarch",
    languages: {
      en: "https://trakzi.com/compare/trakzi-vs-monarch",
      es: "https://trakzi.com/es/compare/trakzi-vs-monarch",
      "x-default": "https://trakzi.com/compare/trakzi-vs-monarch",
    },
  },
  openGraph: {
    title: "Trakzi vs Monarch Money — Budget App Comparison",
    description: "Free CSV import, receipt scanning, and shared expenses vs bank-linked budgeting.",
    url: "https://trakzi.com/compare/trakzi-vs-monarch",
  },
}

export default function TrakziVsMonarchLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
