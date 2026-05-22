import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Log In — Trakzi",
  description:
    "Log in to your Trakzi account to view your spending, scan receipts, and manage shared expenses.",
  alternates: {
    canonical: "https://trakzi.com/sign-in",
  },
  openGraph: {
    title: "Log In — Trakzi",
    description: "Log in to your Trakzi account to view your spending, scan receipts, and manage shared expenses.",
    url: "https://trakzi.com/sign-in",
    images: [{ url: "https://trakzi.com/Trakzi/og-image.png", width: 1200, height: 630, alt: "Trakzi Sign In" }],
  },
}

export default function SignInLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
