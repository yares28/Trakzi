import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Características — Presupuesto, Escáner de Tickets y Más",
  description:
    "Descubre todas las características de Trakzi: escáner de tickets con IA, importación de CSV bancario, gastos compartidos, control de supermercado, gráficos interactivas y ahorros. Gratis para empezar.",
  alternates: {
    canonical: "https://trakzi.com/es/features",
    languages: {
      en: "https://trakzi.com/features",
      es: "https://trakzi.com/es/features",
      "x-default": "https://trakzi.com/features",
    },
  },
  openGraph: {
    title: "Características de Trakzi — Presupuesto, Escáner de Tickets y Más",
    description:
      "Escáner de tickets con IA, importación de CSV bancario, gastos compartidos, control de supermercado, y gráficos interactivas.",
    url: "https://trakzi.com/es/features",
  },
}

export default function SpanishFeaturesLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
