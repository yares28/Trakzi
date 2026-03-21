import type { Metadata } from "next"
import "./landing.css"

export const metadata: Metadata = {
  title: "Trakzi — The All-in-One Budgeting Workspace",
  description:
    "Import bank CSVs, scan receipts, track expenses, visualize spending with AI-powered charts, and manage shared costs with friends. Free budgeting app.",
  openGraph: {
    title: "Trakzi — The All-in-One Budgeting Workspace",
    description:
      "Import bank CSVs, scan receipts, track expenses, and visualize spending with AI-powered charts. Manage shared costs with friends — all in one place.",
    url: "https://trakzi.com",
  },
}

const softwareAppJsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Trakzi",
  url: "https://trakzi.com",
  applicationCategory: "FinanceApplication",
  operatingSystem: "Web",
  description:
    "All-in-one budgeting workspace for tracking income, expenses, savings, and shared costs. Import bank CSVs, scan receipts, and visualize spending with AI-powered charts.",
  offers: [
    {
      "@type": "Offer",
      name: "Starter",
      price: "0",
      priceCurrency: "EUR",
    },
    {
      "@type": "Offer",
      name: "Pro",
      price: "4.99",
      priceCurrency: "EUR",
      "https://schema.org/unitText": "month",
    },
    {
      "@type": "Offer",
      name: "Max",
      price: "19.99",
      priceCurrency: "EUR",
      "https://schema.org/unitText": "month",
    },
  ],
}

export default function LandingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareAppJsonLd) }}
      />
      {children}
    </div>
  )
}

