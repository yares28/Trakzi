"use client"

import { LandingHeader } from "@/components/landing-header"
import Hero from "@/landing/hero"
import Features from "@/components/features"
import { NewReleasePromo } from "@/components/new-release-promo"
import { FAQSection, type FaqItem } from "@/components/faq-section"
import { StickyFooter } from "@/components/sticky-footer"
import { ChartsShowcase } from "@/components/charts-showcase"
import { ImageComparisonSection } from "@/components/image-comparison-section"

const esFaqs: FaqItem[] = [
  {
    question: "¿Qué es Trakzi y cómo me ayuda a presupuestar?",
    answer: "Trakzi es un espacio de trabajo todo-en-uno donde puedes reunir tus extractos bancarios, exportaciones CSV y tickets para ver de un vistazo en qué gastas tu dinero. Combina gráficos con IA, análisis de gastos y seguimiento de gastos compartidos en una sola app.",
  },
  {
    question: "¿Cómo importo mis transacciones bancarias a Trakzi?",
    answer: "Sube cualquier CSV de tu banco o tarjeta. Trakzi normaliza los datos, conserva tus columnas originales y genera gráficos automáticamente — sin introducción manual de datos.",
  },
  {
    question: "¿Puedo escanear y guardar tickets de supermercado?",
    answer: "Sí. Fotografía o sube tus tickets de supermercado y tiendas, y Trakzi extrae los totales para que puedas compararlos con tu presupuesto y hábitos de gasto anteriores.",
  },
  {
    question: "¿Qué hace la IA de Trakzi exactamente?",
    answer: "La IA integrada te ayuda a detectar patrones de gasto excesivo, responde preguntas como '¿por qué gasté más en comida este mes?' y sugiere ajustes para que cumplas tus objetivos financieros.",
  },
  {
    question: "¿Están seguros mis datos financieros en Trakzi?",
    answer: "Tus datos permanecen en tu espacio de trabajo. Trakzi nunca los revende ni comparte, y puedes eliminar tus cargas en cualquier momento. Seguimos las mejores prácticas de seguridad para proteger tus archivos e información.",
  },
  {
    question: "¿Puedo rastrear gastos compartidos y dividir facturas con amigos?",
    answer: "Por supuesto. Trakzi te permite crear habitaciones compartidas con amigos o compañeros de piso, rastrear gastos grupales y ver quién debe qué — facilitando dividir facturas, alquiler y compras.",
  },
]

export default function SpanishLandingPage() {
  return (
    <div className="min-h-screen w-full relative bg-background">
      <LandingHeader
        locale="es"
        logoHref="/es"
        navLinks={[
          { label: "Características", href: "/es/features" },
          { label: "Documentación", href: "/es/docs" },
          { label: "Precios", href: "/es/precios" },
        ]}
        faqLabel="FAQ"
        faqScrollId="faq"
        loginLabel="Iniciar Sesión"
        loginHref="/sign-in"
        signupLabel="Registrarse"
        signupHref="/sign-up"
      />

      <Hero locale="es" />

      <ImageComparisonSection
        beforeSrc="/SheetsCompare.jpeg"
        afterSrc="/trakziCompare.png"
        beforeAlt="Datos financieros sin Trakzi"
        afterAlt="Datos financieros con Trakzi"
        locale="es"
      />

      <div id="features">
        <Features locale="es" />
      </div>

      <ChartsShowcase locale="es" />

      <NewReleasePromo locale="es" />

      <div id="faq">
        <FAQSection
          items={esFaqs}
          badgeLabel="FAQs"
          title={
            <>
              ¿Preguntas? Tenemos{" "}
              <span className="bg-gradient-to-b from-foreground via-rose-200 to-primary bg-clip-text text-transparent py-1">
                respuestas
              </span>
            </>
          }
        />
      </div>

      <StickyFooter locale="es" />
    </div>
  )
}
