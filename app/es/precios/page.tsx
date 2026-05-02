"use client"

import { m } from "framer-motion"
import Link from "next/link"
import { Check, X, Sparkles } from "lucide-react"
import { useState } from "react"
import { geist } from "@/lib/fonts"
import { cn } from "@/lib/utils"
import { CtaButtons } from "@/components/page-layout"
import { StickyFooter } from "@/components/sticky-footer"
import { LandingHeader } from "@/components/landing-header"

import { useRouter } from "next/navigation"
import { useAuth } from "@clerk/nextjs"
import { toast } from "sonner"

const plans = [
  {
    name: "Starter",
    monthlyPrice: 0,
    description: "Pruébalo",
    icon: "/Trakzi/subs/freeiconB.png",
    popular: false,
    features: [
      { text: "300 transacciones", included: true },
      { text: "50 transacciones/mes", included: true },
      { text: "10 escaneos de tickets/mes", included: true },
      { text: "10 chats con IA/semana", included: true },
      { text: "Gráficos básicas", included: true },
      { text: "2 habitaciones, 5 amigos", included: true },
      { text: "Análisis con IA", included: false },
      { text: "Gráficos avanzadas", included: false },
    ],
    cta: "Empezar Gratis",
    priceId: null,
  },
  {
    name: "PRO",
    monthlyPrice: 4.99,
    annualPrice: 49.99,
    description: "Para seguimiento serio",
    icon: "/Trakzi/subs/TrakziProIconB.png",
    popular: true,
    features: [
      { text: "1.500 transacciones (2.000 anual)", included: true },
      { text: "250 transacciones/mes", included: true },
      { text: "50 escaneos de tickets/mes", included: true },
      { text: "50 chats con IA/semana", included: true },
      { text: "Análisis y categorización con IA", included: true },
      { text: "Gráficos avanzadas", included: true },
      { text: "10 habitaciones, 50 amigos", included: true },
      { text: "10 categorías personalizadas", included: true },
    ],
    cta: "Ir a PRO",
    monthlyPriceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_PRO_MONTHLY,
    annualPriceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_PRO_ANNUAL,
  },
  {
    name: "MAX",
    monthlyPrice: 19.99,
    annualPrice: 199.99,
    description: "Para usuarios avanzados",
    icon: "/Trakzi/subs/TrakziMaxIconB.png",
    popular: false,
    features: [
      { text: "5.000 transacciones (6.000 anual)", included: true },
      { text: "750 transacciones/mes", included: true },
      { text: "150 escaneos de tickets/mes", included: true },
      { text: "100 chats con IA/semana", included: true },
      { text: "Todo de PRO", included: true },
      { text: "Habitaciones y amigos ilimitados", included: true },
      { text: "25 categorías personalizadas", included: true },
      { text: "Soporte prioritario", included: true },
    ],
    cta: "Ir a MAX",
    monthlyPriceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_MAX_MONTHLY,
    annualPriceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_MAX_ANNUAL,
  },
]

export default function EsPreciosPage() {
  const [isAnnual, setIsAnnual] = useState(false)
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null)
  const router = useRouter()
  const { isSignedIn } = useAuth()

  const handleSelect = async (plan: typeof plans[0]) => {
    if (plan.name === "Starter") {
      if (isSignedIn) { router.push("/dashboard") } else { router.push("/sign-up") }
      return
    }
    const priceId = isAnnual ? plan.annualPriceId : plan.monthlyPriceId
    if (!priceId) { toast.error("Precio no configurado"); return }
    setLoadingPlan(plan.name)
    try {
      if (!isSignedIn) {
        localStorage.setItem("pendingCheckoutPriceId", priceId)
        router.push("/sign-up")
        return
      }
      const res = await fetch("/api/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ priceId }) })
      const data = await res.json()
      if (data.url) { window.location.href = data.url } else { toast.error(data.error || "Error en el checkout") }
    } catch { toast.error("Algo salió mal") } finally { setLoadingPlan(null) }
  }

  return (
    <div className="min-h-screen w-full relative bg-background text-foreground">

      <LandingHeader
        locale="es"
        logoHref="/es"
        navLinks={[
          { label: "Características", href: "/es/features" },
          { label: "Documentación", href: "/es/docs" },
        ]}
        faqLabel="FAQ"
        loginLabel="Iniciar Sesión"
        loginHref="/sign-in"
        signupLabel="Registrarse"
        signupHref="/sign-up"
      />

      <section className="relative py-48 px-4">
        <div className="max-w-4xl mx-auto relative z-10 text-center">
          <m.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-foreground/5 border border-foreground/10 backdrop-blur-sm mb-6">
              <Sparkles className="h-4 w-4 text-primary" /><span className="text-primary font-medium text-sm">Precios</span>
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-7xl lg:text-9xl mb-8">
              Precios Simples y Transparentes
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">Empieza gratis. Mejora cuando necesites más. Sin costes ocultos.</p>
          </m.div>
        </div>
      </section>

      <section className="pb-12 px-4 relative z-10">
        <div className="flex items-center justify-center">
          <div className="rounded-full bg-foreground/5 border border-foreground/10 p-1 flex items-center">
            <button onClick={() => setIsAnnual(false)} className={cn("px-6 py-2 rounded-full text-sm font-medium transition-all", !isAnnual ? "bg-primary text-foreground shadow-lg" : "text-foreground/60 hover:text-foreground/80")}>Mensual</button>
            <button onClick={() => setIsAnnual(true)} className={cn("px-6 py-2 rounded-full text-sm font-medium transition-all relative", isAnnual ? "bg-primary text-foreground shadow-lg" : "text-foreground/60 hover:text-foreground/80")}>
              Anual<span className="absolute -top-2 -right-6 bg-emerald-500 text-foreground text-[10px] px-1.5 py-0.5 rounded-full">-20%</span>
            </button>
          </div>
        </div>
      </section>

      <section className="pb-24 px-4 relative z-10">
        <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-6">
          {plans.map((plan, i) => (
            <m.div key={plan.name} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4, delay: i * 0.1 }} whileHover={{ y: -5 }}
              className={cn("relative rounded-2xl p-8 backdrop-blur-sm border transition-all flex flex-col h-full", plan.popular ? "bg-gradient-to-b from-primary/10 to-transparent border-primary/30 shadow-lg shadow-primary/10" : "bg-foreground/5 border-foreground/10 hover:border-foreground/20")}
            >
              {plan.popular && <div className="absolute -top-3 left-1/2 -translate-x-1/2"><span className="bg-gradient-to-r from-primary to-primary/80 text-foreground text-xs font-medium px-4 py-1.5 rounded-full">Más Popular</span></div>}
              <img src={plan.icon} alt={plan.name} className="h-12 w-12 mb-4 object-contain" draggable={false} />
              <h3 className="text-lg font-semibold text-foreground">{plan.name}</h3>
              <p className="text-sm text-muted-foreground mb-4">{plan.description}</p>
              <div className="mb-6">
                {plan.monthlyPrice === 0 ? (
                  <p className="text-4xl font-bold text-foreground">Gratis</p>
                ) : (
                  <>
                    <p className="text-4xl font-bold text-foreground">€{isAnnual ? (plan.annualPrice! / 12).toFixed(2) : plan.monthlyPrice.toFixed(2)}<span className="text-base font-normal text-muted-foreground">/mes</span></p>
                    {isAnnual && <p className="text-sm text-muted-foreground mt-1">€{plan.annualPrice}/año facturado anualmente</p>}
                  </>
                )}
              </div>
              <ul className="space-y-3 mb-8 flex-1">
                {plan.features.map((f) => (
                  <li key={f.text} className="flex items-start gap-2.5 text-sm">
                    {f.included ? <Check className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" /> : <X className="h-4 w-4 text-foreground/20 flex-shrink-0 mt-0.5" />}
                    <span className={f.included ? "text-foreground/80" : "text-foreground/30"}>{f.text}</span>
                  </li>
                ))}
              </ul>
              <m.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => handleSelect(plan)} disabled={loadingPlan === plan.name}
                className={cn("w-full py-3 px-6 rounded-full font-medium text-sm transition-all", plan.popular ? "bg-gradient-to-r from-primary to-primary/80 text-foreground shadow-lg shadow-primary/25" : "bg-foreground/10 text-foreground border border-foreground/20 hover:bg-foreground/20")}
              >
                {loadingPlan === plan.name ? "Cargando..." : plan.cta}
              </m.button>
            </m.div>
          ))}
        </div>
      </section>

      {/* Comparison Table */}
      <section className="py-24 px-4 relative z-10">
        <div className="max-w-4xl mx-auto">
          <h2 className={cn("text-3xl sm:text-4xl font-semibold tracking-tighter text-center mb-12 text-foreground", geist.className)}>
            Comparar Todas las Características
          </h2>
          <div className="rounded-2xl border border-foreground/10 bg-foreground/5 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-foreground/10">
                  <th className="text-left py-4 px-6 text-muted-foreground font-medium">Característica</th>
                  <th className="text-center py-4 px-4 text-muted-foreground">Starter</th>
                  <th className="text-center py-4 px-4 text-primary font-bold">PRO</th>
                  <th className="text-center py-4 px-4 text-muted-foreground">MAX</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["Transacciones", "300", "1.500", "5.000"],
                  ["Bonus mensual", "50", "250", "750"],
                  ["Escaneos de tickets/mes", "10", "50", "150"],
                  ["Chats con IA/semana", "10", "50", "100"],
                  ["Análisis con IA", "3 gratis", "Completo", "Completo"],
                  ["Gráficos avanzados", "—", "✓", "✓"],
                  ["Categorías personalizadas", "1", "10", "25"],
                  ["Habitaciones", "2", "10", "Ilimitadas"],
                  ["Amigos", "5", "50", "Ilimitados"],
                  ["Transacciones compartidas/mes", "50", "200", "Ilimitadas"],
                ].map(([feature, starter, pro, max]) => (
                  <tr key={feature} className="border-b border-foreground/5 hover:bg-foreground/5 transition-colors">
                    <td className="py-3 px-6 text-foreground/80">{feature}</td>
                    <td className="py-3 px-4 text-center text-foreground/60">{starter}</td>
                    <td className="py-3 px-4 text-center text-primary font-medium">{pro}</td>
                    <td className="py-3 px-4 text-center text-foreground/60">{max}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Packs de Transacciones */}
      <section className="py-24 px-4 relative z-10">
        <div className="max-w-4xl mx-auto">
          <h2 className={cn("text-3xl sm:text-4xl font-semibold tracking-tighter text-center mb-4 text-foreground", geist.className)}>
            Packs de Transacciones
          </h2>
          <p className="text-center text-muted-foreground mb-12">¿Necesitas más transacciones? Compra un pack único. Sin suscripción.</p>
          <div className="grid sm:grid-cols-3 gap-6">
            {[
              { tx: 500, price: 10, priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_TRANSACTION_PACK_500 },
              { tx: 1500, price: 20, priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_TRANSACTION_PACK_1500 },
              { tx: 5000, price: 50, priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_TRANSACTION_PACK_5000 },
            ].map((pack, i) => (
              <m.div
                key={pack.tx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                whileHover={{ y: -5 }}
                className="rounded-2xl border border-foreground/10 bg-foreground/5 p-6 text-center"
              >
                <p className="text-3xl font-bold text-foreground mb-1">{pack.tx.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground mb-4">transacciones</p>
                <p className="text-2xl font-bold text-primary mb-6">€{pack.price}</p>
                <Link
                  href="/sign-up"
                  className="inline-block w-full rounded-full font-medium text-sm border border-foreground/20 bg-foreground/10 text-foreground py-2.5 transition-all hover:-translate-y-0.5 hover:bg-foreground/20"
                >
                  Comprar Pack
                </Link>
              </m.div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24 px-4 relative z-10">
        <div className="max-w-3xl mx-auto">
          <h2 className={cn("text-3xl sm:text-4xl font-semibold tracking-tighter text-center mb-12 bg-gradient-to-b from-muted to-muted-foreground bg-clip-text text-transparent", geist.className)}>Preguntas de Facturación</h2>
          {[
            { q: "¿Puedo cancelar en cualquier momento?", a: "Sí. Mantienes acceso hasta el final de tu periodo de facturación. Sin penalizaciones." },
            { q: "¿Qué pasa cuando llego al límite de transacciones?", a: "Puedes comprar un pack de transacciones o mejorar a un plan superior. Tus datos nunca se borran." },
            { q: "¿Ofrecen reembolsos?", a: "Ofrecemos garantía de devolución de 14 días en todos los planes de pago." },
            { q: "¿Cómo funcionan los packs de transacciones?", a: "Los packs son compras únicas que añaden capacidad a tu cuenta. No caducan y se acumulan con tu plan." },
          ].map((faq, i) => (
            <div key={i} className="p-6 rounded-2xl border border-foreground/10 bg-foreground/5 mb-4">
              <h3 className="text-base font-semibold text-foreground mb-2">{faq.q}</h3>
              <p className="text-sm text-muted-foreground">{faq.a}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="py-48 px-4 relative z-10">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className={cn("via-foreground bg-gradient-to-b from-muted to-muted-foreground bg-clip-text text-5xl font-semibold tracking-tighter text-transparent md:text-[72px] md:leading-[80px] mb-8", geist.className)}>Empieza Gratis Hoy</h2>
          <p className="mx-auto mb-12 max-w-2xl text-lg text-muted-foreground">300 transacciones. Sin tarjeta de crédito.</p>
          <CtaButtons locale="es" />
        </div>
      </section>

      <StickyFooter locale="es" />
    </div>
  )
}
