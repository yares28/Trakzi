import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Importar CSV Bancario — Visualiza tus Gastos sin Conectar tu Banco",
  description:
    "Sube cualquier extracto bancario en CSV de CaixaBank, BBVA, Santander, ING o cualquier banco. Trakzi normaliza los datos y genera gráficos automáticamente. Sin conexión bancaria.",
  openGraph: {
    title: "Importar CSV Bancario — Visualiza tus Gastos sin Conectar tu Banco | Trakzi",
    description:
      "Sube cualquier extracto bancario en CSV. Trakzi normaliza los datos y genera gráficos automáticamente.",
    url: "https://trakzi.com/es/importar-csv",
  },
}

export default function ImportarCsvLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
