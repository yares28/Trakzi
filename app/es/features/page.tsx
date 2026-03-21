"use client"

import { m } from "framer-motion"
import Link from "next/link"
import { Check, ArrowRight } from "lucide-react"
import { geist } from "@/lib/fonts"
import { cn } from "@/lib/utils"
import { PageHeader, CtaButtons } from "@/components/page-layout"
import { StickyFooter } from "@/components/sticky-footer"

import { ReceiptFridgeAnimation } from "@/components/receipt-fridge-animation"
import { CsvUploadAnimation } from "@/components/csv-upload-animation"
import { RoomSplitAnimation } from "@/components/room-split-animation"
import { GroceryTrackAnimation } from "@/components/grocery-track-animation"
import { AiChatDemo } from "@/components/ai-chat-demo"
import { AnimatedCharts } from "@/components/animated-charts"

const features = [
  {
    badge: "Escáner de Tickets",
    title: "Escanea Cualquier Ticket. Controla Cada Gasto.",
    description: "Fotografía cualquier ticket de supermercado, restaurante o tienda. Trakzi extrae el total automáticamente con IA.",
    benefits: ["Extracción con IA", "Sin introducción manual", "Funciona con cualquier ticket"],
    href: "/es/escaner-tickets",
    label: "Ver cómo funciona el escáner",
    visual: <ReceiptFridgeAnimation />,
  },
  {
    badge: "Importar CSV",
    title: "Importa Cualquier CSV Bancario. Ve tus Gastos Cobrar Vida.",
    description: "Sube cualquier extracto bancario en CSV. Trakzi normaliza los datos y genera más de 20 gráficos interactivas al instante.",
    benefits: ["Funciona con cualquier banco", "Gráficos instantáneas", "Categorización con IA"],
    href: "/es/importar-csv",
    label: "Ver cómo funciona la importación",
    visual: <CsvUploadAnimation />,
  },
  {
    badge: "Gastos Compartidos",
    title: "Divide Facturas. Comparte Costes. Sin Problemas.",
    description: "Crea habitaciones con amigos o compañeros de piso. Añade gastos compartidos y ve quién debe a quién.",
    benefits: ["Balance en tiempo real", "División flexible", "Múltiples habitaciones"],
    href: "/es/dividir-gastos",
    label: "Ver cómo funcionan los gastos compartidos",
    visual: <RoomSplitAnimation />,
  },
  {
    badge: "Control de Supermercado",
    title: "Sabe a Dónde Va tu Dinero del Supermercado.",
    description: "Escanea tickets de Mercadona, Lidl, Carrefour y más. Controla gastos por tienda, categoría y semana.",
    benefits: ["Escanea tickets de cualquier tienda", "Gastos por categoría", "Tendencias semanales"],
    href: "/es/gastos-supermercado",
    label: "Ver cómo funciona el control de supermercado",
    visual: <GroceryTrackAnimation />,
  },
  {
    badge: "Análisis con IA",
    title: "Tu Asistente Personal de Finanzas.",
    description: "Haz preguntas sobre tus gastos. Obtén información instantánea con gráficos. La IA de Trakzi detecta patrones que te perderías.",
    benefits: ["Pregunta lo que quieras", "Detección automática de patrones", "Respuestas con gráficos"],
    href: undefined,
    label: "Empieza a chatear con IA",
    visual: <AiChatDemo />,
  },
  {
    badge: "Gráficos Avanzados",
    title: "20+ Formas de Ver tu Dinero.",
    description: "Desde líneas hasta mapas de calor, dispersión hasta embudos. Cada gasto cuenta una historia — Trakzi te ayuda a leerla.",
    benefits: ["Líneas, barras, tarta, dispersión, áreas", "Mapas de calor y treemaps", "Exportar y compartir"],
    href: undefined,
    label: "Explora todos los tipos de gráficos",
    visual: <AnimatedCharts />,
  },
]

export default function EsFeaturesPage() {
  return (
    <div className="min-h-screen w-full relative bg-black text-white">

      <div className="fixed inset-0 z-0 pointer-events-none" style={{ background: "radial-gradient(ellipse 50% 35% at 50% 0%, rgba(226, 232, 240, 0.12), transparent 60%), #000000" }} />

      <PageHeader locale="es" />

      <section className="relative py-48 px-4">
        <div className="max-w-4xl mx-auto relative z-10 text-center">
          <m.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-sm mb-6">
              <span className="text-[#e78a53] font-medium text-sm">Todo lo que Necesitas</span>
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-7xl lg:text-9xl mb-8">
              Todas tus Finanzas. Un Solo Espacio.
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Importa extractos bancarios, escanea tickets, divide gastos con amigos y visualiza tu dinero con gráficos impulsados por IA — sin conectar tu banco.
            </p>
          </m.div>
        </div>
      </section>

      {features.map((f, i) => {
        const isEven = i % 2 === 0
        return (
          <section key={f.badge} className="py-48 px-4 relative z-10">
            <div className="max-w-6xl mx-auto">
              <div className={cn("grid md:grid-cols-2 gap-12 items-center")}>
                <m.div
                  initial={{ opacity: 0, x: isEven ? -30 : 30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6 }}
                  className={cn("rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm overflow-hidden min-h-[300px]", !isEven && "md:order-2")}
                >
                  {f.visual}
                </m.div>
                <m.div
                  initial={{ opacity: 0, x: isEven ? 30 : -30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: 0.1 }}
                  className={cn(!isEven && "md:order-1")}
                >
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[#e78a53] text-xs font-medium mb-4">{f.badge}</div>
                  <h2 className={cn("text-3xl sm:text-4xl font-semibold tracking-tighter mb-4 text-white", geist.className)}>{f.title}</h2>
                  <p className="text-muted-foreground mb-6 leading-relaxed">{f.description}</p>
                  <ul className="space-y-2.5 mb-8">
                    {f.benefits.map((b) => (
                      <li key={b} className="flex items-center gap-2.5 text-sm text-white/80">
                        <Check className="h-4 w-4 text-[#e78a53] flex-shrink-0" />{b}
                      </li>
                    ))}
                  </ul>
                  {f.href ? (
                    <Link href={f.href} className="inline-flex items-center gap-2 rounded-full font-bold text-sm bg-gradient-to-b from-[#fe985b] to-[#fe985b]/80 text-white shadow-[0px_2px_0px_0px_rgba(255,255,255,0.3)_inset] px-6 py-2.5 transition-all hover:-translate-y-0.5">
                      {f.label}<ArrowRight className="h-4 w-4" />
                    </Link>
                  ) : (
                    <Link href="/sign-up" className="inline-flex items-center gap-2 rounded-full font-medium text-sm border border-white/20 bg-white/10 text-white px-6 py-2.5 transition-all hover:-translate-y-0.5 hover:bg-white/20">
                      {f.label}<ArrowRight className="h-4 w-4" />
                    </Link>
                  )}
                </m.div>
              </div>
            </div>
          </section>
        )
      })}

      <section className="py-48 px-4 relative z-10">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className={cn("via-foreground bg-gradient-to-b from-zinc-800 to-zinc-700 bg-clip-text text-5xl font-semibold tracking-tighter text-transparent md:text-[72px] md:leading-[80px] mb-8", geist.className)}>¿Listo para tomar el control?</h2>
          <p className="mx-auto mb-12 max-w-2xl text-lg text-muted-foreground">Gratis para empezar. Sin tarjeta de crédito. Funciona con cualquier banco.</p>
          <CtaButtons locale="es" />
        </div>
      </section>

      <StickyFooter />
    </div>
  )
}
