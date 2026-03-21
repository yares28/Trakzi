import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Terms and Conditions",
  description:
    "Read Trakzi's terms of service for using our budgeting and expense tracking platform. Learn about accounts, subscriptions, acceptable use, and your rights.",
}

export default function TermsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
