import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Trakzi vs Monarch Money — Comparación de Apps de Presupuesto",
  description: "Compara Trakzi y Monarch Money. Trakzi ofrece importación CSV gratuita sin conexión bancaria, escáner de tickets y habitaciones compartidas.",
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
