"use client"

import FeaturePage from "@/components/feature-page"

export default function EscanerTicketsPage() {
  return (
    <FeaturePage
      locale="es"
      headline="Escanea Cualquier Ticket. Controla Cada Gasto."
      subheadline="Escáner de Tickets con IA"
      heroDescription="Fotografía cualquier ticket de supermercado, restaurante o tienda y Trakzi extrae el total automáticamente. Sin teclear, sin errores — seguimiento de gastos instantáneo."
      ctaText="Empezar a Escanear Gratis"
      statsValue="Instantáneo"
      statsLabel="Procesamiento de tickets"
      benefits={[
        {
          title: "Extracción con IA",
          description: "Nuestro OCR lee tickets de cualquier tienda — supermercados, restaurantes, farmacias. Extrae totales, fechas y nombres de tienda en segundos.",
        },
        {
          title: "Sin Introducción Manual",
          description: "Deja de teclear tickets línea por línea. Solo haz una foto y Trakzi lo hace todo. Controla gastos sin complicaciones.",
        },
        {
          title: "Funciona con Cualquier Ticket",
          description: "Tickets en papel, exportaciones PDF o fotos de tu galería. Trakzi los procesa todos, incluyendo tickets largos de supermercado.",
        },
        {
          title: "Comparación Instantánea con tu Presupuesto",
          description: "Los totales escaneados se comparan automáticamente con tu presupuesto y gastos anteriores. Ve de un vistazo si te estás pasando.",
        },
      ]}
      steps={[
        {
          step: 1,
          title: "Haz Foto o Sube",
          description: "Haz una foto de tu ticket con la cámara del móvil, o sube un PDF o imagen desde tu galería.",
        },
        {
          step: 2,
          title: "La IA Lee el Ticket",
          description: "La IA de Trakzi extrae el nombre de la tienda, fecha, artículos y total. El proceso toma solo segundos.",
        },
        {
          step: 3,
          title: "Rastrea y Analiza",
          description: "El ticket se guarda en tu cuenta. Ve tendencias de gasto por tienda, categoría y periodo en gráficos interactivas.",
        },
      ]}
      relatedPages={[
        { href: "/es/gastos-supermercado", label: "Control de Supermercado" },
        { href: "/es/importar-csv", label: "Importar CSV" },
        { href: "/es/dividir-gastos", label: "Dividir Gastos" },
      ]}
    />
  )
}
