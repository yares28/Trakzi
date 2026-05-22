import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Cookie Policy",
  description:
    "Understand how Trakzi uses cookies for essential functionality and analytics. Learn about PostHog analytics cookies and how to manage your consent.",
}

export default function CookiesLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
