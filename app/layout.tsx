import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
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
import { ChartResizeProvider } from "@/lib/chart-resize-context";
import { ChartVisibilityProvider } from "@/components/chart-visibility-provider";
import { Toaster } from "@/components/ui/sonner";
import { PostHogUserIdentifier } from "@/components/posthog-user-identifier";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Trakzi",
  description: "Track your income, expenses, savings, and net worth",
  appleWebApp: {
    title: "Trakzi",
    capable: true,
    statusBarStyle: "default",
  },
  applicationName: "Trakzi",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Build-time fallback so prerender succeeds when .env.local is missing (e.g. CI). Set NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY in .env.local for real auth.
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || "pk_test_placeholder";

  return (
    <ClerkProvider publishableKey={publishableKey} afterSignOutUrl="/" signInFallbackRedirectUrl="/home" signUpFallbackRedirectUrl="/home">
      <html lang="en" suppressHydrationWarning className="overflow-x-hidden">
        <body
          className={`${geistSans.variable} ${geistMono.variable} antialiased overflow-x-hidden`}
          suppressHydrationWarning
        >
          <ThemeProvider
            attribute="class"
            defaultTheme="light"
            enableSystem={false}
            disableTransitionOnChange
            storageKey="trakzi-theme"
          >
            <QueryProvider>
              <UserPreferencesProvider>
              <ChartResizeProvider>
                <ChartVisibilityProvider storageScope="analytics">
                <ColorSchemeProvider>
                  <CurrencyProvider>
                    <FavoritesProvider>
                      <DateFilterProvider>
                        <TransactionDialogProvider>
                          <PostHogUserIdentifier />
                          {children}
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
              </UserPreferencesProvider>
            </QueryProvider>
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}

