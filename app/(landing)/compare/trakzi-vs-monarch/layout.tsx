import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Trakzi vs Monarch Money — Budget App Comparison",
  description:
    "Compare Trakzi and Monarch Money. Trakzi offers free CSV import without bank connection, receipt scanning, and shared expense rooms. See how they compare.",
  openGraph: {
    title: "Trakzi vs Monarch Money — Budget App Comparison",
    description: "Free CSV import, receipt scanning, and shared expenses vs bank-linked budgeting.",
    url: "https://trakzi.com/compare/trakzi-vs-monarch",
  },
}

export default function TrakziVsMonarchLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
