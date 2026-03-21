import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Receipt Scanner App — Scan & Track Expenses Instantly",
  description:
    "Snap a photo of any receipt and Trakzi extracts the total automatically. Track grocery, retail, and restaurant spending with AI-powered receipt scanning. Free to use.",
  openGraph: {
    title: "Receipt Scanner App — Scan & Track Expenses Instantly | Trakzi",
    description:
      "Snap a photo of any receipt and Trakzi extracts the total automatically. Track grocery, retail, and restaurant spending with AI-powered receipt scanning.",
    url: "https://trakzi.com/receipt-scanner",
  },
}

export default function ReceiptScannerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
