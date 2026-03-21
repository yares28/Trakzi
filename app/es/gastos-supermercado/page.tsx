"use client"

import FeaturePage from "@/components/feature-page"

export default function GastosSupermercadoPage() {
  return (
    <FeaturePage
      locale="es"
      headline="Sabe Exactamente a Dónde Va tu Dinero del Supermercado."
      subheadline="Control de Gastos de Supermercado"
      heroDescription="Escanea tickets de cualquier supermercado — Mercadona, Lidl, Carrefour, Consum, DIA. Trakzi controla gastos por tienda, categoría y semana para que domines tu presupuesto de alimentación."
      ctaText="Controlar Supermercado Gratis"
      statsValue="Cualquier tienda"
      statsLabel="Escaneo de tickets"
      benefits={[
        {
          title: "Escanea Tickets de Supermercado al Instante",
          description: "Haz una foto de tu ticket de supermercado y Trakzi extrae el total, la tienda y la fecha. Funciona con tickets de supermercados de toda España.",
        },
        {
          title: "Gastos por Tienda y Categoría",
          description: "Ve cuánto gastas en cada supermercado. Desglosa gastos por categoría — frescos, lácteos, carne, hogar — para encontrar ahorros.",
        },
        {
          title: "Tendencias Semanales y Mensuales",
          description: "Controla tu gasto de supermercado en el tiempo con gráficos interactivas. Detecta patrones como gasto entre semana vs fin de semana.",
        },
        {
          title: "Alertas de Presupuesto",
          description: "Define un presupuesto mensual de supermercado y recibe avisos cuando te acerques al límite. Mantente al día sin seguimiento manual.",
        },
      ]}
      steps={[
        {
          step: 1,
          title: "Define tu Presupuesto",
          description: "Establece cuánto quieres gastar en supermercado cada mes. Trakzi sigue el progreso contra tu objetivo.",
        },
        {
          step: 2,
          title: "Escanea Tickets tras Comprar",
          description: "Después de cada compra, haz una foto de tu ticket. Trakzi extrae y registra la compra automáticamente.",
        },
        {
          step: 3,
          title: "Analiza y Optimiza",
          description: "Ve gráficos de gasto por tienda, categoría y periodo. Identifica dónde te estás pasando y recorta.",
        },
      ]}
      relatedPages={[
        { href: "/es/escaner-tickets", label: "Escáner de Tickets" },
        { href: "/es/importar-csv", label: "Importar CSV" },
        { href: "/es/dividir-gastos", label: "Dividir Gastos" },
      ]}
    />
  )
}
