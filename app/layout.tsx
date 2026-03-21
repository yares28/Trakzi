import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { LazyMotion, domAnimation } from "framer-motion";
import { ClerkProvider } from "@clerk/nextjs";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { ThemeProvider } from "@/components/theme-provider";
import { ColorSchemeProvider } from "@/components/color-scheme-provider";
import { CurrencyProvider } from "@/components/currency-provider";
import { TransactionDialogProvider } from "@/components/transaction-dialog-provider";
import { UserPreferencesProvider } from "@/components/user-preferences-provider";
import { FavoritesProvider } from "@/components/favorites-provider";
import { DateFilterProvider } from "@/components/date-filter-provider";
import { QueryProvider } from "@/components/query-provider";
import { LangSetter } from "@/components/lang-setter";
import { ChartResizeProvider } from "@/lib/chart-resize-context";
import { ChartVisibilityProvider } from "@/components/chart-visibility-provider";
import { Toaster } from "@/components/ui/sonner";
import { PostHogUserIdentifier } from "@/components/posthog-user-identifier";
import { DemoModeProvider } from "@/lib/demo/demo-context";
import { DemoBanner } from "@/components/demo-banner";
import { OnboardingProvider } from "@/components/onboarding/onboarding-provider";
import { OnboardingRoot } from "@/components/onboarding/onboarding-root";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://trakzi.com"),
  title: {
    default: "Trakzi — The All-in-One Budgeting Workspace",
    template: "%s | Trakzi",
  },
  description:
    "Trakzi is an all-in-one budgeting workspace. Import bank CSVs, scan receipts, track expenses, visualize spending with AI-powered charts, and manage shared costs with friends — all in one place.",
  keywords: [
    "budgeting app",
    "expense tracker",
    "personal finance",
    "budget planner",
    "track expenses",
    "CSV import budget",
    "receipt scanner",
    "shared expenses",
    "split bills",
    "savings tracker",
    "spending analytics",
    "AI budgeting",
    "money management",
    "financial dashboard",
    "grocery budget tracker",
  ],
  authors: [{ name: "Trakzi" }],
  creator: "Trakzi",
  publisher: "Trakzi",
  applicationName: "Trakzi",
  appleWebApp: {
    title: "Trakzi",
    capable: true,
    statusBarStyle: "default",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://trakzi.com",
    siteName: "Trakzi",
    title: "Trakzi — The All-in-One Budgeting Workspace",
    description:
      "Import bank CSVs, scan receipts, track expenses, and visualize spending with AI-powered charts. Manage shared costs with friends — all in one place.",
    images: [
      {
        url: "/Trakzi/og-image.png",
        width: 1200,
        height: 630,
        alt: "Trakzi — The All-in-One Budgeting Workspace",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Trakzi — The All-in-One Budgeting Workspace",
    description:
      "Import bank CSVs, scan receipts, track expenses, and visualize spending with AI-powered charts.",
    images: ["/Trakzi/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  category: "finance",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Build-time fallback so prerender succeeds when .env.local is missing (e.g. CI). Set NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY in .env.local for real auth.
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || "pk_test_placeholder";

  const websiteJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Trakzi",
    url: "https://trakzi.com",
    potentialAction: {
      "@type": "SearchAction",
      target: "https://trakzi.com/?q={search_term_string}",
      "query-input": "required name=search_term_string",
    },
  }

  const organizationJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Trakzi",
    url: "https://trakzi.com",
    logo: "https://trakzi.com/Trakzi/TrakzilogoB.png",
    contactPoint: {
      "@type": "ContactPoint",
      email: "help@trakzi.com",
      contactType: "customer support",
    },
  }

  return (
    <ClerkProvider publishableKey={publishableKey} afterSignOutUrl="/" signInFallbackRedirectUrl="/home" signUpFallbackRedirectUrl="/home">
      <html lang="en" suppressHydrationWarning className="dark overflow-x-hidden">
        <head>
          <script dangerouslySetInnerHTML={{ __html: `document.documentElement.classList.add('dark')` }} />
          <link rel="alternate" hrefLang="en" href="https://trakzi.com/" />
          <link rel="alternate" hrefLang="es" href="https://trakzi.com/es/" />
          <link rel="alternate" hrefLang="x-default" href="https://trakzi.com/" />
        </head>
        <body
          className={`${geistSans.variable} ${geistMono.variable} antialiased overflow-x-hidden`}
          suppressHydrationWarning
        >
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
          />
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
          />
          <LangSetter />
          <LazyMotion features={domAnimation}>
          <ThemeProvider
            attribute="class"
            forcedTheme="dark"
            enableSystem={false}
            disableTransitionOnChange
            storageKey="trakzi-theme"
          >
            <QueryProvider>
              <UserPreferencesProvider>
                <OnboardingProvider>
                  <ChartResizeProvider>
                    <ChartVisibilityProvider storageScope="analytics">
                      <ColorSchemeProvider>
                        <CurrencyProvider>
                          <FavoritesProvider>
                            <DateFilterProvider>
                              <TransactionDialogProvider>
                                <DemoModeProvider>
                                  <div className="flex flex-col min-h-screen overflow-x-hidden">
                                    <PostHogUserIdentifier />
                                    <DemoBanner />
                                    <OnboardingRoot />
                                    <div className="flex-1">
                                      {children}
                                    </div>
                                  </div>
                                </DemoModeProvider>
                              </TransactionDialogProvider>
                            </DateFilterProvider>
                          </FavoritesProvider>
                          <Toaster />
                          <Analytics />
                          <SpeedInsights />
                        </CurrencyProvider>
                      </ColorSchemeProvider>
                    </ChartVisibilityProvider>
                  </ChartResizeProvider>
                </OnboardingProvider>
              </UserPreferencesProvider>
            </QueryProvider>
          </ThemeProvider>
          </LazyMotion>
        </body>
      </html>
    </ClerkProvider>
  );
}

