import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Trakzi — Tu Espacio de Finanzas Personales Todo en Uno",
  description:
    "Importa extractos bancarios en CSV, escanea tickets, controla gastos y visualiza tu dinero con gráficos impulsados por IA. Gestiona gastos compartidos con amigos. App gratuita.",
  alternates: {
    canonical: "https://trakzi.com/es",
    languages: {
      en: "https://trakzi.com",
      es: "https://trakzi.com/es",
      "x-default": "https://trakzi.com",
    },
  },
  openGraph: {
    title: "Trakzi — Tu Espacio de Finanzas Personales Todo en Uno",
    description:
      "Importa extractos bancarios en CSV, escanea tickets, controla gastos y visualiza tu dinero con gráficos impulsados por IA.",
    url: "https://trakzi.com/es",
    locale: "es_ES",
  },
}

export default function SpanishLandingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
