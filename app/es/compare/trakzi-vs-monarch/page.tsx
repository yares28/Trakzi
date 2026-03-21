"use client"

import ComparisonPage from "@/components/comparison-page"

export default function EsTrakziVsMonarchPage() {
  return (
    <ComparisonPage
      locale="es"
      competitorName="Monarch Money"
      headline="Trakzi vs Monarch Money"
      heroDescription="Monarch Money es una app de presupuesto pulida que requiere conexión bancaria. Trakzi te deja importar CSVs y escanear tickets en su lugar — manteniendo tus credenciales bancarias privadas."
      ctaText="Haz presupuesto sin compartir credenciales bancarias"
      features={[
        { feature: "Plan gratuito", trakzi: "yes", competitor: "no" },
        { feature: "Importar CSV bancario", trakzi: "yes", competitor: "no" },
        { feature: "Escáner de tickets (IA)", trakzi: "yes", competitor: "no" },
        { feature: "Conexión bancaria", trakzi: "no", competitor: "yes" },
        { feature: "Sincronización automática", trakzi: "no", competitor: "yes" },
        { feature: "Habitaciones de gastos compartidos", trakzi: "yes", competitor: "partial" },
        { feature: "Gráficos interactivos (20+)", trakzi: "yes", competitor: "partial" },
        { feature: "Análisis de gastos con IA", trakzi: "yes", competitor: "no" },
        { feature: "Categorías personalizadas", trakzi: "yes", competitor: "yes" },
        { feature: "Seguimiento de metas", trakzi: "yes", competitor: "yes" },
        { feature: "Funciona sin conexión bancaria", trakzi: "yes", competitor: "no" },
        { feature: "Seguimiento de patrimonio neto", trakzi: "partial", competitor: "yes" },
      ]}
      trakziAdvantages={[
        "Plan gratuito disponible — Monarch cuesta 9,99 $/mes",
        "La importación CSV funciona con cualquier banco del mundo — el soporte bancario de Monarch es limitado fuera de EE.UU.",
        "Escáner de tickets con IA — rastrea compras en efectivo y verifica totales",
        "Habitaciones dedicadas para gastos compartidos — mejor que el hogar compartido de Monarch",
        "Enfoque de privacidad primero — nunca compartas credenciales bancarias",
        "Más de 20 tipos de gráficos para un análisis más profundo de gastos",
        "Asistente de IA para información sobre gastos y preguntas financieras",
      ]}
      competitorStrengths={[
        "Monarch tiene sincronización bancaria automática — las transacciones aparecen sin trabajo manual",
        "Monarch tiene una experiencia móvil más pulida",
        "Monarch soporta seguimiento de patrimonio neto en cuentas de inversión",
        "Monarch tiene una marca más establecida y base de usuarios más grande en EE.UU.",
      ]}
      conclusion="Monarch Money es un buen reemplazo de Mint con excelente sincronización automática, pero cuesta 9,99 $/mes y requiere conectar tus cuentas bancarias. Si estás fuera de EE.UU., el soporte bancario de Monarch es limitado. Trakzi funciona con cualquier banco del mundo vía CSV, es gratis para empezar, añade escaneo de tickets para compras en efectivo e incluye habitaciones de gastos compartidos — haciéndolo mejor para usuarios conscientes de la privacidad y usuarios internacionales."
    />
  )
}
