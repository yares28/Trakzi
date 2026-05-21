import type { Metadata } from "next"
import { DocsShell } from "@/components/docs-shell"

// CRITICAL: Do NOT declare `alternates.canonical` here. This layout wraps both
// /docs (the index) and /docs/[slug] (individual blog posts). When a layout
// declares a canonical, Next.js's metadata merge causes that canonical to bleed
// onto child routes — meaning every blog post page declared itself as a copy
// of /docs, and Google soft-404'd them all ("User-declared canonical: /docs").
// Each route now owns its own canonical via its own page-level generateMetadata.
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
