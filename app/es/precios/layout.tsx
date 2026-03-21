import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Precios — Planes Simples y Transparentes | Trakzi",
  description: "Empieza gratis con 300 transacciones. Mejora a PRO (4,99 €/mes) o MAX (19,99 €/mes) para más transacciones, análisis con IA y habitaciones ilimitadas.",
  openGraph: {
    title: "Precios de Trakzi — Planes Simples y Transparentes",
    description: "Empieza gratis con 300 transacciones. Mejora para más transacciones, análisis con IA y habitaciones ilimitadas.",
    url: "https://trakzi.com/es/precios",
  },
}

export default function EsPreciosLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
