"use client"

import ComparisonPage from "@/components/comparison-page"

export default function EsTrakziVsYnabPage() {
  return (
    <ComparisonPage
      locale="es"
      competitorName="YNAB"
      headline="Trakzi vs YNAB"
      heroDescription="YNAB popularizó el presupuesto base cero. Trakzi añade importación de CSV, escáner de tickets, gastos compartidos y análisis con IA — sin requerir conexión bancaria."
      ctaText="Prueba Trakzi gratis hoy"
      features={[
        { feature: "Plan gratuito", trakzi: "yes", competitor: "no" },
        { feature: "Importar CSV bancario", trakzi: "yes", competitor: "no" },
        { feature: "Escáner de tickets (IA)", trakzi: "yes", competitor: "no" },
        { feature: "Conexión bancaria", trakzi: "no", competitor: "yes" },
        { feature: "Habitaciones de gastos compartidos", trakzi: "yes", competitor: "no" },
        { feature: "Gráficos interactivos (20+)", trakzi: "yes", competitor: "partial" },
        { feature: "Análisis de gastos con IA", trakzi: "yes", competitor: "no" },
        { feature: "Presupuesto base cero", trakzi: "partial", competitor: "yes" },
        { feature: "Seguimiento de metas", trakzi: "yes", competitor: "yes" },
        { feature: "Funciona sin conexión bancaria", trakzi: "yes", competitor: "no" },
        { feature: "App móvil", trakzi: "partial", competitor: "yes" },
      ]}
      trakziAdvantages={[
        "Gratis para empezar — YNAB cuesta 14,99 $/mes después del periodo de prueba",
        "Importa cualquier CSV bancario — funciona con cualquier banco del mundo, sin conexión requerida",
        "Escanea tickets con IA — rastrea compras en efectivo y con tarjeta sin teclear",
        "Habitaciones de gastos compartidos — divide facturas con compañeros de piso y amigos (YNAB no lo hace)",
        "Más de 20 tipos de gráficos interactivos — visualiza gastos de formas que YNAB no puede",
        "Análisis con IA — haz preguntas sobre tus gastos, obtén información",
        "Prioridad en privacidad — tus credenciales bancarias nunca se comparten",
      ]}
      competitorStrengths={[
        "YNAB tiene una app móvil madura con soporte sin conexión",
        "El método de presupuesto base cero de YNAB es más estructurado y disciplinado",
        "YNAB tiene una gran comunidad y contenido educativo extenso",
        "YNAB soporta conexiones bancarias directas en EE.UU. (sincronización automática)",
      ]}
      conclusion="YNAB es el estándar de oro para el presupuesto base cero, pero es caro (14,99 $/mes) y requiere conexión bancaria para la mejor experiencia. Trakzi es gratis para empezar, funciona sin conectar tu banco, añade escaneo de tickets y seguimiento de gastos compartidos — haciéndolo mejor si quieres flexibilidad y privacidad sobre una metodología de presupuesto rígida."
    />
  )
}
