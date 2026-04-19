import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Control de Gastos de Supermercado — Escanea Tickets y Controla tu Presupuesto",
  description:
    "Escanea tickets de Mercadona, Lidl, Carrefour, Consum y más. Controla gastos de alimentación por tienda, categoría y semana. Domina tu presupuesto de supermercado.",
  alternates: {
    canonical: "https://trakzi.com/es/gastos-supermercado",
    languages: {
      en: "https://trakzi.com/grocery-tracker",
      es: "https://trakzi.com/es/gastos-supermercado",
      "x-default": "https://trakzi.com/grocery-tracker",
    },
  },
  openGraph: {
    title: "Control de Gastos de Supermercado | Trakzi",
    description:
      "Escanea tickets de Mercadona, Lidl, Carrefour y más. Controla gastos de alimentación por tienda y categoría.",
    url: "https://trakzi.com/es/gastos-supermercado",
  },
}

export default function GastosSupermercadoLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
