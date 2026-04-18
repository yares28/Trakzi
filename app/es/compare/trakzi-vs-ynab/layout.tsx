import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Trakzi vs YNAB — ¿Cuál App de Presupuesto es Mejor?",
  description: "Compara Trakzi y YNAB. Trakzi ofrece importación CSV gratuita, escáner de tickets y gastos compartidos sin conexión bancaria.",
  alternates: {
    canonical: "https://trakzi.com/es/compare/trakzi-vs-ynab",
    languages: {
      en: "https://trakzi.com/compare/trakzi-vs-ynab",
      es: "https://trakzi.com/es/compare/trakzi-vs-ynab",
      "x-default": "https://trakzi.com/compare/trakzi-vs-ynab",
    },
  },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
