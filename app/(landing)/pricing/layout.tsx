import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Pricing — Simple, Transparent Plans | Trakzi",
  description: "Start free with 300 transactions. Upgrade to PRO (€4.99/mo) or MAX (€19.99/mo) for more transactions, AI insights, and unlimited rooms. No hidden fees.",
  openGraph: {
    title: "Trakzi Pricing — Simple, Transparent Plans",
    description: "Start free with 300 transactions. Upgrade for more transactions, AI insights, and unlimited rooms.",
    url: "https://trakzi.com/pricing",
  },
}

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
