import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Dividir Gastos — Comparte Costes con Amigos y Compañeros de Piso",
  description:
    "Crea habitaciones con amigos o compañeros de piso para rastrear gastos grupales, dividir facturas y ver quién debe a quién. La forma más fácil de gestionar costes compartidos.",
  openGraph: {
    title: "Dividir Gastos con Amigos | Trakzi",
    description:
      "Crea habitaciones con amigos o compañeros de piso para rastrear gastos grupales y dividir facturas.",
    url: "https://trakzi.com/es/dividir-gastos",
  },
}

export default function DividirGastosLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
