import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Trakzi vs Splitwise — ¿Mejor App para Gastos Compartidos?",
  description: "Compara Trakzi y Splitwise. Trakzi combina gastos compartidos con presupuesto personal, escaneo de tickets y gráficos con IA.",
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
