import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Receipt Scanner App — Scan & Track Expenses Instantly",
  description:
    "Snap a photo of any receipt and Trakzi extracts the total automatically. Track grocery, retail, and restaurant spending with AI-powered receipt scanning. Free to use.",
  alternates: {
    canonical: "https://trakzi.com/receipt-scanner",
    languages: {
      en: "https://trakzi.com/receipt-scanner",
      es: "https://trakzi.com/es/escaner-tickets",
      "x-default": "https://trakzi.com/receipt-scanner",
    },
  },
  openGraph: {
    title: "Receipt Scanner App — Scan & Track Expenses Instantly | Trakzi",
    description:
      "Snap a photo of any receipt and Trakzi extracts the total automatically. Track grocery, retail, and restaurant spending with AI-powered receipt scanning.",
    url: "https://trakzi.com/receipt-scanner",
    images: [{ url: "https://trakzi.com/Trakzi/og-image.png", width: 1200, height: 630, alt: "Trakzi Receipt Scanner" }],
  },
}

export default function ReceiptScannerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
