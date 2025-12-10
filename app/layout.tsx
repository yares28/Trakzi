import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import { ThemeProvider } from "@/components/theme-provider";
import { ColorSchemeProvider } from "@/components/color-scheme-provider";
import { TransactionDialogProvider } from "@/components/transaction-dialog-provider";
import { FavoritesProvider } from "@/components/favorites-provider";
import { Toaster } from "@/components/ui/sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Fullet",
  description: "Track your income, expenses, savings, and net worth",
  appleWebApp: {
    title: "Fullet",
    capable: true,
    statusBarStyle: "default",
  },
  applicationName: "Fullet",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en" suppressHydrationWarning>
        <body
          className={`${geistSans.variable} ${geistMono.variable} antialiased`}
          suppressHydrationWarning
        >
          <ThemeProvider
            attribute="class"
            defaultTheme="light"
            enableSystem={false}
            disableTransitionOnChange
          >
            <ColorSchemeProvider>
              <FavoritesProvider>
                <TransactionDialogProvider>
                  {children}
                </TransactionDialogProvider>
              </FavoritesProvider>
              <Toaster />
            </ColorSchemeProvider>
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
