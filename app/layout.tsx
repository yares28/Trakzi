import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import { Analytics } from "@vercel/analytics/react";
import { ThemeProvider } from "@/components/theme-provider";
import { ColorSchemeProvider } from "@/components/color-scheme-provider";
import { CurrencyProvider } from "@/components/currency-provider";
import { TransactionDialogProvider } from "@/components/transaction-dialog-provider";
import { FavoritesProvider } from "@/components/favorites-provider";
import { DateFilterProvider } from "@/components/date-filter-provider";
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
  return (
    <ClerkProvider>
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
          >
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
              </CurrencyProvider>
            </ColorSchemeProvider>
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}

