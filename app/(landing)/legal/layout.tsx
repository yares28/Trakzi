import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Legal Notice",
  description:
    "Legal information and company details for Trakzi. Owner, address, applicable law, and intellectual property notices.",
}

export default function LegalLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
