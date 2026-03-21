import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Escáner de Tickets — Escanea y Controla Gastos al Instante",
  description:
    "Fotografía cualquier ticket de supermercado, restaurante o tienda y Trakzi extrae el total automáticamente con IA. Controla gastos sin teclear nada. Gratis.",
  openGraph: {
    title: "Escáner de Tickets con IA — Controla Gastos al Instante | Trakzi",
    description:
      "Fotografía cualquier ticket y Trakzi extrae el total automáticamente con IA. Controla gastos sin teclear nada.",
    url: "https://trakzi.com/es/escaner-tickets",
  },
}

export default function EscanerTicketsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
