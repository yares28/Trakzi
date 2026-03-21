import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Trakzi vs Splitwise — Best App for Shared Expenses?",
  description:
    "Compare Trakzi and Splitwise. Trakzi combines shared expense tracking with personal budgeting, receipt scanning, and AI charts — Splitwise only does splits.",
  openGraph: {
    title: "Trakzi vs Splitwise — Shared Expenses App Comparison",
    description: "Trakzi combines shared expenses with personal budgeting. Splitwise only does splits.",
    url: "https://trakzi.com/compare/trakzi-vs-splitwise",
  },
}

export default function TrakziVsSplitwiseLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
