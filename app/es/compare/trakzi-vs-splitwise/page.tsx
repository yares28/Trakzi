"use client"

import ComparisonPage from "@/components/comparison-page"

export default function EsTrakziVsSplitwisePage() {
  return (
    <ComparisonPage
      locale="es"
      competitorName="Splitwise"
      headline="Trakzi vs Splitwise"
      heroDescription="Splitwise es genial para dividir facturas. Trakzi también lo hace — además de presupuesto personal, escaneo de tickets, importación de CSV y gráficos con IA, todo en un solo espacio."
      ctaText="Consigue ambos en una sola app"
      features={[
        { feature: "Dividir facturas con amigos", trakzi: "yes", competitor: "yes" },
        { feature: "Control de gastos personales", trakzi: "yes", competitor: "no" },
        { feature: "Importar CSV bancario", trakzi: "yes", competitor: "no" },
        { feature: "Escáner de tickets (IA)", trakzi: "yes", competitor: "no" },
        { feature: "Herramientas de presupuesto", trakzi: "yes", competitor: "no" },
        { feature: "Gráficos interactivos", trakzi: "yes", competitor: "no" },
        { feature: "Análisis de gastos con IA", trakzi: "yes", competitor: "no" },
        { feature: "Deudas simplificadas", trakzi: "yes", competitor: "yes" },
        { feature: "Múltiples habitaciones/grupos", trakzi: "yes", competitor: "yes" },
        { feature: "Seguimiento de saldos", trakzi: "yes", competitor: "yes" },
        { feature: "Plan gratuito", trakzi: "yes", competitor: "partial" },
      ]}
      trakziAdvantages={[
        "Finanzas personales + gastos compartidos en una app — no necesitas dos herramientas",
        "Importación CSV bancaria — ve todas tus transacciones, no solo las compartidas",
        "Escáner de tickets con IA — rastrea compras en efectivo también",
        "Más de 20 tipos de gráficos — visualiza a dónde va tu dinero más allá de las divisiones",
        "Asistente de IA — obtén información sobre gastos y respuestas a preguntas financieras",
        "Plan gratuito con límites generosas — Splitwise muestra anuncios en el plan gratis",
      ]}
      competitorStrengths={[
        "Splitwise tiene una app móvil más establecida (iOS y Android)",
        "Splitwise tiene integración con PayPal/Venmo para saldar directamente",
        "Splitwise tiene una base de usuarios más grande — es más fácil invitar a amigos que ya la usan",
        "Splitwise soporta más monedas y es popular en más países",
      ]}
      conclusion="Splitwise hace una cosa bien: dividir facturas. Pero eso es todo. Si también quieres controlar gastos personales, importar extractos bancarios, escanear tickets y ver gráficos de gastos — necesitarías una segunda app. Trakzi combina el seguimiento de gastos compartidos con herramientas completas de finanzas personales, para que veas tu panorama financiero completo en un solo lugar."
    />
  )
}
