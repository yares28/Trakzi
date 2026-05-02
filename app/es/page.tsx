"use client"

import { m } from "framer-motion"
import Link from "next/link"
import { LanguagePicker } from "@/components/language-picker"
import { ChevronRight, FileSpreadsheet, Receipt, ShoppingCart, Users, BarChart3, PiggyBank, ArrowRight } from "lucide-react"
import { geist } from "@/lib/fonts"
import { cn } from "@/lib/utils"

const features = [
  {
    icon: Receipt,
    title: "Escáner de Tickets",
    description: "Fotografía cualquier ticket y Trakzi extrae el total, la tienda y la fecha automáticamente con IA.",
    href: "/es/escaner-tickets",
  },
  {
    icon: Users,
    title: "Gastos Compartidos",
    description: "Crea habitaciones con amigos o compañeros de piso para rastrear gastos grupales y dividir facturas.",
    href: "/es/dividir-gastos",
  },
  {
    icon: ShoppingCart,
    title: "Control de Supermercado",
    description: "Escanea tickets de Mercadona, Lidl, Carrefour y más. Controla tu presupuesto de alimentación.",
    href: "/es/gastos-supermercado",
  },
  {
    icon: FileSpreadsheet,
    title: "Importar CSV Bancario",
    description: "Sube cualquier extracto bancario en CSV. Trakzi normaliza los datos y genera gráficos al instante.",
    href: "/es/importar-csv",
  },
]

const faqs = [
  {
    q: "¿Qué es Trakzi?",
    a: "Trakzi es una aplicación de finanzas personales que te permite importar extractos bancarios, escanear tickets y visualizar tus gastos con gráficos impulsados por IA. Todo sin conectar tu cuenta bancaria.",
  },
  {
    q: "¿Necesito conectar mi cuenta bancaria?",
    a: "No. Trakzi funciona con archivos CSV que exportas de tu banco. Tus credenciales bancarias nunca se comparten. Tu privacidad está protegida.",
  },
  {
    q: "¿Funciona con bancos españoles?",
    a: "Sí. Trakzi funciona con cualquier banco del mundo, incluyendo CaixaBank, BBVA, Santander, ING España, y muchos más.",
  },
  {
    q: "¿Puedo escanear tickets de supermercados españoles?",
    a: "Sí. Trakzi procesa tickets de Mercadona, Consum, Lidl, Carrefour, DIA, Eroski y otros supermercados españoles.",
  },
  {
    q: "¿Es gratuita?",
    a: "Trakzi ofrece un plan gratuito con hasta 100 transacciones. Los planes Pro (4,99 €/mes) y Max (19,99 €/mes) ofrecen límites más altos.",
  },
]

export default function SpanishLandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">

      {/* Header */}
      <header className="sticky top-4 z-[9999] mx-auto max-w-5xl px-4 py-2 flex items-center justify-between rounded-full bg-background/80 backdrop-blur-sm border border-border/50 shadow-lg">
        <Link href="/es" className="flex items-center gap-2">
          <img src="/Trakzi/TrakzilogoB.png" alt="Trakzi" className="h-8 w-auto" draggable={false} />
        </Link>
        <nav className="hidden md:flex items-center gap-1 text-sm font-medium text-muted-foreground">
          <Link href="/es/features" className="px-4 py-2 hover:text-white transition-colors">Características</Link>
          <a href="#precios" className="px-4 py-2 hover:text-white transition-colors">Precios</a>
          <a href="#faq" className="px-4 py-2 hover:text-white transition-colors">FAQ</a>
        </nav>
        <div className="flex items-center gap-3">
          <LanguagePicker />
          <Link href="/sign-in" className="rounded-md text-sm border border-border bg-secondary/50 hover:bg-secondary text-muted-foreground hover:text-foreground px-4 py-2 transition-colors">
            Iniciar Sesión
          </Link>
          <Link href="/sign-up" className="rounded-md font-bold relative cursor-pointer hover:-translate-y-0.5 transition duration-200 inline-block text-center bg-gradient-to-b from-primary to-primary/80 text-primary-foreground shadow-[0px_2px_0px_0px_rgba(255,255,255,0.3)_inset] px-4 py-2 text-sm">
            Registrarse
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="relative py-24 sm:py-32">
        <div className="container mx-auto px-4 relative z-10">
          <m.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mx-auto max-w-4xl text-center"
          >
            <h1
              className={cn(
                "text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight mb-6 bg-gradient-to-b from-white to-zinc-400 bg-clip-text text-transparent",
                geist.className,
              )}
            >
              Un Gasto. Docenas de Formas de Verlo.
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-10">
              Importa extractos bancarios, escanea tickets de supermercado, divide gastos con amigos y visualiza todo tu dinero con gráficos impulsados por IA — todo en un solo lugar.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/sign-up" className="rounded-lg font-bold text-base bg-gradient-to-b from-primary to-primary/80 text-primary-foreground shadow-lg px-8 py-3 transition-all hover:-translate-y-0.5 hover:shadow-xl">
                Empezar Gratis
              </Link>
              <Link href="/sign-up" className="rounded-lg font-medium text-base border border-border bg-secondary/50 hover:bg-secondary text-muted-foreground hover:text-foreground px-8 py-3 transition-all">
                Probar Demo
              </Link>
            </div>
          </m.div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24 sm:py-32 border-t border-border/50">
        <div className="container mx-auto px-4">
          <m.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="mx-auto max-w-5xl"
          >
            <h2 className={cn("text-3xl sm:text-4xl font-bold text-center mb-4 bg-gradient-to-b from-white to-zinc-400 bg-clip-text text-transparent", geist.className)}>
              Características
            </h2>
            <p className="text-muted-foreground text-center mb-16 max-w-2xl mx-auto">
              Todo lo que necesitas para controlar tus finanzas personales, sin conectar tu cuenta bancaria.
            </p>
            <div className="grid sm:grid-cols-2 gap-6">
              {features.map((f, i) => {
                const Icon = f.icon
                return (
                  <m.div
                    key={f.title}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: i * 0.1 }}
                  >
                    <Link href={f.href} className="group block p-6 rounded-xl border border-border/50 bg-background/50 hover:border-border hover:bg-secondary/50 transition-all h-full">
                      <div className="flex items-start gap-4">
                        <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
                          <Icon className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-white mb-2 flex items-center gap-1">
                            {f.title}
                            <ChevronRight className="h-4 w-4 text-muted-foreground/60 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                          </h3>
                          <p className="text-muted-foreground text-sm">{f.description}</p>
                        </div>
                      </div>
                    </Link>
                  </m.div>
                )
              })}
            </div>
            <div className="text-center mt-10">
              <Link href="/es/features" className="inline-flex items-center gap-2 text-primary hover:text-primary/80 font-medium transition-colors">
                Ver todas las características
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </m.div>
        </div>
      </section>

      {/* Pricing */}
      <section id="precios" className="py-24 sm:py-32 border-t border-border/50">
        <div className="container mx-auto px-4">
          <h2 className={cn("text-3xl sm:text-4xl font-bold text-center mb-4 bg-gradient-to-b from-white to-zinc-400 bg-clip-text text-transparent", geist.className)}>
            Precios
          </h2>
          <p className="text-muted-foreground text-center mb-16">Empieza gratis. Mejora cuando lo necesites.</p>
          <div className="mx-auto max-w-4xl grid sm:grid-cols-3 gap-6">
            {[
              { name: "Starter", price: "0 €", period: "/mes", features: ["Hasta 100 transacciones", "Importar CSV", "Escáner de tickets", "Gráficos básicos"], cta: "Empezar Gratis", highlighted: false },
              { name: "Pro", price: "4,99 €", period: "/mes", features: ["Hasta 3.000 transacciones", "Todos los gráficos", "Chat con IA", "Gastos compartidos ilimitados"], cta: "Elegir Pro", highlighted: true },
              { name: "Max", price: "19,99 €", period: "/mes", features: ["Hasta 15.000 transacciones", "Todo de Pro", "Soporte prioritario", "Exportaciones avanzadas"], cta: "Elegir Max", highlighted: false },
            ].map((plan) => (
              <div key={plan.name} className={cn("p-6 rounded-xl border", plan.highlighted ? "border-primary/50 bg-primary/5" : "border-border/50 bg-background/50")}>
                <h3 className="text-lg font-semibold text-white mb-1">{plan.name}</h3>
                <p className="text-3xl font-bold text-white mb-1">{plan.price}<span className="text-sm font-normal text-muted-foreground">{plan.period}</span></p>
                <ul className="space-y-2 my-6">
                  {plan.features.map((f) => (
                    <li key={f} className="text-sm text-muted-foreground flex items-center gap-2">
                      <span className="text-primary">✓</span> {f}
                    </li>
                  ))}
                </ul>
                <Link href="/sign-up" className={cn("block text-center rounded-lg font-bold text-sm py-2.5 transition-all hover:-translate-y-0.5", plan.highlighted ? "bg-gradient-to-b from-primary to-primary/80 text-primary-foreground shadow-lg" : "border border-border text-muted-foreground hover:text-foreground hover:bg-secondary")}>
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-24 sm:py-32 border-t border-border/50">
        <div className="container mx-auto px-4">
          <h2 className={cn("text-3xl sm:text-4xl font-bold text-center mb-16 bg-gradient-to-b from-white to-zinc-400 bg-clip-text text-transparent", geist.className)}>
            Preguntas Frecuentes
          </h2>
          <div className="mx-auto max-w-3xl space-y-6">
            {faqs.map((faq) => (
              <div key={faq.q} className="p-6 rounded-xl border border-border/50 bg-background/50">
                <h3 className="text-lg font-semibold text-foreground mb-2">{faq.q}</h3>
                <p className="text-muted-foreground text-sm">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 sm:py-32 border-t border-border/50">
        <div className="container mx-auto px-4 text-center">
          <h2 className={cn("text-3xl sm:text-4xl font-bold mb-6 text-foreground", geist.className)}>
            ¿Listo para tomar el control?
          </h2>
          <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
            Gratis para empezar. Sin tarjeta de crédito. Funciona con cualquier banco del mundo.
          </p>
          <Link href="/sign-up" className="inline-block rounded-lg font-bold text-base bg-gradient-to-b from-primary to-primary/80 text-primary-foreground shadow-lg px-10 py-4 transition-all hover:-translate-y-0.5 hover:shadow-xl">
            Crear Cuenta Gratis
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-border/50">
        <div className="container mx-auto px-4 text-center">
          <p className="text-xs text-muted-foreground/60">
            &copy; {new Date().getFullYear()} Trakzi. Todos los derechos reservados.{" "}
            <Link href="/terms" className="hover:text-zinc-400 transition-colors">Términos</Link>{" "}&middot;{" "}
            <Link href="/privacy" className="hover:text-zinc-400 transition-colors">Privacidad</Link>
          </p>
        </div>
      </footer>
    </div>
  )
}
