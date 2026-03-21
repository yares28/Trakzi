"use client"

import FeaturePage from "@/components/feature-page"

export default function ImportarCsvPage() {
  return (
    <FeaturePage
      locale="es"
      headline="Importa Cualquier CSV Bancario. Ve tus Gastos Cobrar Vida."
      subheadline="Importación de CSV Bancario"
      heroDescription="Exporta tus transacciones de cualquier banco o tarjeta como archivo CSV. Súbelo a Trakzi y observa cómo tus gastos se transforman en gráficos interactivas — sin conexión bancaria, sin riesgo de privacidad."
      ctaText="Importar tu Primer CSV Gratis"
      statsValue="Cualquier banco"
      statsLabel="Funciona en todo el mundo"
      benefits={[
        {
          title: "Sin Conexión Bancaria Requerida",
          description: "A diferencia de otras apps, Trakzi nunca se conecta a tu banco. Tú controlas qué datos compartes. Sube un CSV y listo. Tus credenciales permanecen privadas.",
        },
        {
          title: "Funciona con Cualquier Banco del Mundo",
          description: "CaixaBank, BBVA, Santander, ING España, Deutsche Bank — Trakzi normaliza datos CSV de cualquier banco o proveedor de tarjetas, en cualquier parte del mundo.",
        },
        {
          title: "Gráficos y Análisis Instantáneos",
          description: "En el momento que subes, Trakzi genera más de 20 gráficos interactivas: tendencias de gasto, desgloses por categorías, mapas de calor y más.",
        },
        {
          title: "Categorización Automática con IA",
          description: "La IA de Trakzi categoriza tus transacciones automáticamente — supermercado, transporte, ocio, facturas. Sin etiquetado manual necesario.",
        },
      ]}
      steps={[
        {
          step: 1,
          title: "Exporta tu CSV",
          description: "Entra en la web o app de tu banco y exporta tus transacciones como archivo CSV. La mayoría de bancos lo soportan en su sección de extractos.",
        },
        {
          step: 2,
          title: "Sube a Trakzi",
          description: "Arrastra y suelta tu archivo CSV en Trakzi. Nuestro parser detecta columnas, fechas y monedas automáticamente.",
        },
        {
          step: 3,
          title: "Explora tus Finanzas",
          description: "Tus transacciones aparecen al instante con gráficos generadas, categorías y análisis de gasto. Empieza a analizar de inmediato.",
        },
      ]}
      relatedPages={[
        { href: "/es/escaner-tickets", label: "Escáner de Tickets" },
        { href: "/es/gastos-supermercado", label: "Control de Supermercado" },
        { href: "/es/dividir-gastos", label: "Dividir Gastos" },
      ]}
    />
  )
}
