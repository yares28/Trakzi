import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Import Bank CSV — Visualize Spending Without Connecting Your Bank",
  description:
    "Upload any CSV export from your bank or card provider. Trakzi normalizes the data and generates charts automatically. No bank connection required — your data stays private.",
  openGraph: {
    title: "Import Bank CSV — Visualize Spending Without Connecting Your Bank | Trakzi",
    description:
      "Upload any CSV export from your bank or card provider. Trakzi normalizes the data and generates charts automatically.",
    url: "https://trakzi.com/csv-import",
  },
}

export default function CsvImportLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
