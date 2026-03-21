import type { Metadata } from "next"
import { DocsShell } from "@/components/docs-shell"

export const metadata: Metadata = {
  title: "Docs — Guías de Presupuesto, Control de Gastos y Más",
  description: "Guías paso a paso para presupuesto, control de gastos, división de gastos y ahorro en supermercado.",
  openGraph: {
    title: "Trakzi Docs — Guías de Presupuesto y Control de Gastos",
    description: "Guías paso a paso para presupuesto, control de gastos, división de gastos y ahorro en supermercado.",
    url: "https://trakzi.com/es/docs",
  },
}

export default function EsDocsLayout({ children }: { children: React.ReactNode }) {
  return <DocsShell locale="es">{children}</DocsShell>
}
