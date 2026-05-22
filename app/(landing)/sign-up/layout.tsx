import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Sign Up — Free Account, No Card Required | Trakzi",
  description:
    "Create your free Trakzi account in seconds. Track expenses, scan receipts, and split bills. 300 transactions + 50 free every month, no credit card needed.",
  alternates: {
    canonical: "https://trakzi.com/sign-up",
  },
  openGraph: {
    title: "Sign Up — Free Account, No Card Required | Trakzi",
    description:
      "Create your free Trakzi account in seconds. Track expenses, scan receipts, and split bills. No credit card needed.",
    url: "https://trakzi.com/sign-up",
    images: [{ url: "https://trakzi.com/Trakzi/og-image.png", width: 1200, height: 630, alt: "Trakzi Sign Up" }],
  },
}

export default function SignUpLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
