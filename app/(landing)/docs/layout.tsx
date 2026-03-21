import type { Metadata } from "next"
import { DocsShell } from "@/components/docs-shell"

export const metadata: Metadata = {
  title: "Docs — Guides for Budgeting, Expense Tracking & More",
  description: "Step-by-step guides for budgeting, expense tracking, splitting bills, and grocery savings. Learn how to use Trakzi to take control of your money.",
  openGraph: {
    title: "Trakzi Docs — Budgeting & Expense Tracking Guides",
    description: "Step-by-step guides for budgeting, expense tracking, splitting bills, and grocery savings.",
    url: "https://trakzi.com/docs",
  },
}

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return <DocsShell locale="en">{children}</DocsShell>
}
