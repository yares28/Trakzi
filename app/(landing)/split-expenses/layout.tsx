import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Split Bills & Shared Expenses — Track Costs With Friends",
  description:
    "Create rooms with friends or roommates to track group expenses, split bills, and see who owes whom at a glance. The easiest way to manage shared costs.",
  openGraph: {
    title: "Split Bills & Shared Expenses | Trakzi",
    description:
      "Create rooms with friends or roommates to track group expenses, split bills, and see who owes whom at a glance.",
    url: "https://trakzi.com/split-expenses",
  },
}

export default function SplitExpensesLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
