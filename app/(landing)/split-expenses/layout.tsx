import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Split Bills & Shared Expenses — Track Costs With Friends",
  description:
    "Create rooms with friends or roommates to track group expenses, split bills, and see who owes whom at a glance. The easiest way to manage shared costs.",
  alternates: {
    canonical: "https://trakzi.com/split-expenses",
    languages: {
      en: "https://trakzi.com/split-expenses",
      es: "https://trakzi.com/es/dividir-gastos",
      "x-default": "https://trakzi.com/split-expenses",
    },
  },
  openGraph: {
    title: "Split Bills & Shared Expenses | Trakzi",
    description:
      "Create rooms with friends or roommates to track group expenses, split bills, and see who owes whom at a glance.",
    url: "https://trakzi.com/split-expenses",
    images: [{ url: "https://trakzi.com/Trakzi/og-image.png", width: 1200, height: 630, alt: "Trakzi Split Expenses" }],
  },
}

export default function SplitExpensesLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
