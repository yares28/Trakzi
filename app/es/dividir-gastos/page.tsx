"use client"

import FeaturePage from "@/components/feature-page"

export default function DividirGastosPage() {
  return (
    <FeaturePage
      locale="es"
      headline="Divide Facturas. Comparte Costes. Sin Problemas."
      subheadline="Gastos Compartidos"
      heroDescription="Crea una habitación con compañeros de piso, pareja o grupo de viaje. Añade gastos compartidos, divídelos como quieras y ve quién debe a quién — sin hojas de cálculo ni conversaciones incómodas."
      ctaText="Crear una Habitación Gratis"
      statsValue="Cualquier división"
      statsLabel="Igual, porcentaje o personalizada"
      benefits={[
        {
          title: "Balance en Tiempo Real",
          description: "Cada gasto que añades actualiza el balance del grupo al instante. Todos ven exactamente quién debe qué — sin confusión ni discusiones.",
        },
        {
          title: "División Flexible",
          description: "Divide equitativamente, por porcentaje o por cantidades personalizadas. Perfecto para alquiler, suministros, suministros o viajes en grupo.",
        },
        {
          title: "Múltiples Habitaciones",
          description: "Crea habitaciones separadas para diferentes grupos — una para tu piso, otra para un viaje, otra para suscripciones compartidas.",
        },
        {
          title: "Combinado con Finanzas Personales",
          description: "A diferencia de apps de división independientes, Trakzi también rastrea tus gastos personales. Ve tu panorama financiero completo en un solo lugar.",
        },
      ]}
      steps={[
        {
          step: 1,
          title: "Crea una Habitación",
          description: "Empieza una habitación e invita a amigos o compañeros de piso compartiendo un enlace o código. Todos se unen en segundos.",
        },
        {
          step: 2,
          title: "Añade Gastos",
          description: "Registra gastos compartidos cuando ocurran — alquiler, supermercado, facturas, cenas. Define cómo dividir cada uno.",
        },
        {
          step: 3,
          title: "Pagad las Cuentas",
          description: "Trakzi calcula balances corrientes y simplifica deudas. Ve quién debe a quién y marca los pagos como saldados.",
        },
      ]}
      relatedPages={[
        { href: "/es/escaner-tickets", label: "Escáner de Tickets" },
        { href: "/es/gastos-supermercado", label: "Control de Supermercado" },
        { href: "/es/importar-csv", label: "Importar CSV" },
      ]}
    />
  )
}
