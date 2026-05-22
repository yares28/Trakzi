import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Trakzi vs Monarch Money — Comparación de Apps de Presupuesto",
  description: "Compara Trakzi y Monarch Money. Trakzi ofrece importación CSV gratuita sin conexión bancaria, escáner de tickets y habitaciones compartidas.",
  alternates: {
    canonical: "https://trakzi.com/es/compare/trakzi-vs-monarch",
    languages: {
      en: "https://trakzi.com/compare/trakzi-vs-monarch",
      es: "https://trakzi.com/es/compare/trakzi-vs-monarch",
      "x-default": "https://trakzi.com/compare/trakzi-vs-monarch",
    },
  },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
