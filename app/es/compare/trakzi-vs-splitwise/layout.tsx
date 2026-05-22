import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Trakzi vs Splitwise — ¿Mejor App para Gastos Compartidos?",
  description: "Compara Trakzi y Splitwise. Trakzi combina gastos compartidos con presupuesto personal, escaneo de tickets y gráficos con IA.",
  alternates: {
    canonical: "https://trakzi.com/es/compare/trakzi-vs-splitwise",
    languages: {
      en: "https://trakzi.com/compare/trakzi-vs-splitwise",
      es: "https://trakzi.com/es/compare/trakzi-vs-splitwise",
      "x-default": "https://trakzi.com/compare/trakzi-vs-splitwise",
    },
  },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
