"use client"

import type React from "react"

import { useTheme } from "next-themes"
import Earth from "./globe"
import ScrambleHover from "./scramble"
import { m, useInView } from "framer-motion"
import { Suspense, useEffect, useRef, useState } from "react"
import { Sparkles, FileSpreadsheet, ShoppingCart, LayoutGrid, MessageSquare, BarChart3 } from "lucide-react"
import { geist } from "@/lib/fonts"
import { cn } from "@/lib/utils"
import { AnimatedCharts } from "./animated-charts"
import { ReceiptFridgeAnimation } from "./receipt-fridge-animation"
import { DynamicLayoutsAnimation } from "./dynamic-layouts-animation"
import { ReceiptScannerAnimation } from "./receipt-scanner-animation"

const BASE_COLOR: [number, number, number] = [0.906, 0.541, 0.325] // brand primary — RGB normalized for WebGL

export default function Features({ locale = "en" }: { locale?: "en" | "es" }) {
  const isEs = locale === "es"
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, amount: 0.1 })
  const cliCardRef = useRef(null)
  const cliCardInView = useInView(cliCardRef, { amount: 0.4 })
  const { theme } = useTheme()
  const [isHovering, setIsHovering] = useState(false)
  const [isCliHovering, setIsCliHovering] = useState(false)
  const [isFeature3Hovering, setIsFeature3Hovering] = useState(false)
  const [isFeature4Hovering, setIsFeature4Hovering] = useState(false)
  const [inputValue, setInputValue] = useState("")
  const [isMobile, setIsMobile] = useState(false)

  // Detect mobile (no hover capability) so we can auto-animate hover-triggered cards
  useEffect(() => {
    if (typeof window === "undefined") return
    const mq = window.matchMedia("(hover: none), (max-width: 768px)")
    const update = () => setIsMobile(mq.matches)
    update()
    mq.addEventListener("change", update)
    return () => mq.removeEventListener("change", update)
  }, [])

  // On mobile (no hover state), play the All-in-1 budgeting animation when the card is in view
  const isCliActive = isCliHovering || (isMobile && cliCardInView)

  const FORMAT_CYCLE = ["CSV", "PDF", "XLSX", "IMAGE"]
  const [formatIndex, setFormatIndex] = useState(0)
  const [isAutoScrambling, setIsAutoScrambling] = useState(false)

  useEffect(() => {
    const cycleInterval = setInterval(() => {
      setFormatIndex((prev) => (prev + 1) % FORMAT_CYCLE.length)
      setIsAutoScrambling(true)
      setTimeout(() => setIsAutoScrambling(false), 1600)
    }, 2800)
    return () => clearInterval(cycleInterval)
  }, [])

  const baseColor = BASE_COLOR
  const glowColor = BASE_COLOR
  const dark = theme === "dark" ? 1 : 0

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter") {
      e.preventDefault()
      setInputValue("")
    }
  }

  return (
    <section id="features" className="text-foreground relative overflow-hidden py-24 sm:py-32 md:py-48">
      <div className="bg-primary absolute -top-10 left-1/2 h-16 w-44 -translate-x-1/2 rounded-full opacity-40 blur-3xl select-none"></div>
      <div className="via-primary/50 absolute top-0 left-1/2 h-px w-3/5 -translate-x-1/2 bg-gradient-to-r from-transparent to-transparent transition-all ease-in-out"></div>
      <m.div
        ref={ref}
        initial={{ opacity: 0, y: 50 }}
        animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 50 }}
        transition={{ duration: 0.5, delay: 0 }}
        className="flex flex-col gap-6 sm:gap-12"
      >
        {/* Heading — constrained */}
        <div className="max-w-screen-xl mx-auto w-full px-4 sm:px-8">
          <h2
            className={cn(
              "mb-12 text-center text-5xl font-semibold tracking-tighter text-foreground md:text-[72px] md:leading-[80px]",
              geist.className,
            )}
          >
            {isEs ? "Características" : "Features"}
          </h2>
        </div>

        {/* Grid — wider */}
        <div className="max-w-screen-2xl mx-auto w-full px-4 sm:px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Cli */}
              <m.div
                className="group border-secondary/40 text-card-foreground relative flex flex-col overflow-hidden rounded-xl border-2 p-6 shadow-xl transition-all ease-in-out hover:border-primary/40"
                onMouseEnter={() => setIsCliHovering(true)}
                onMouseLeave={() => setIsCliHovering(false)}
                ref={cliCardRef}
                initial={{ opacity: 0, y: 50 }}
                animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 50 }}
                transition={{ duration: 0.5, delay: 0.5 }}
                whileHover={{
                  scale: 1.02,
                }}
                style={{ transition: "opacity 0.3s ease, transform 0.3s ease, border-color 0.3s ease" }}
              >
                <div className="flex flex-col gap-4">
                  <h3 className="text-lg sm:text-2xl leading-tight font-semibold tracking-tight text-balance">{isEs ? "Todo en 1 — tu app de presupuesto" : "All-in-1 budgeting app"}</h3>
                  <div className="text-md text-muted-foreground flex flex-col gap-2 text-sm">
                    <p className="max-w-[460px]">
                      {isEs
                        ? "Integra tus gastos, ingresos y tickets en el panel para visualizar en qué gastas más."
                        : "Integrate your expenses, income and receipts in the dashboard to visualize where do you spend more."}
                    </p>
                  </div>
                </div>
                <div className="pointer-events-none flex grow items-center justify-center select-none relative">
                  <div className="relative w-full h-[400px] rounded-xl overflow-hidden">
                    {/* Background Image */}
                    <div className="absolute inset-0">
                      <img
                        src="/orangeBackground.png"
                        alt="Arrow-CoreExchange"
                        className="w-full h-full object-cover rounded-xl"
                      />
                    </div>

                    {/* Animated SVG Connecting Lines */}
                    <m.div
                      className="absolute inset-0 flex items-center justify-center"
                      initial={{ opacity: 0 }}
                      animate={isCliActive ? { opacity: 1 } : { opacity: 0 }}
                      transition={{ duration: 0.5 }}
                    >
                      <svg width="100%" height="100%" viewBox="0 0 121 94" className="absolute">
                        <m.path
                          d="M 60.688 1.59 L 60.688 92.449 M 60.688 92.449 L 119.368 92.449 M 60.688 92.449 L 1.414 92.449"
                          stroke="rgb(255,222,213)"
                          fill="transparent"
                          strokeDasharray="2 2"
                          initial={{ pathLength: 0 }}
                          animate={isCliActive ? { pathLength: 1 } : { pathLength: 0 }}
                          transition={{
                            duration: 2,
                            ease: "easeInOut",
                          }}
                        />
                      </svg>
                      <svg width="100%" height="100%" viewBox="0 0 121 94" className="absolute">
                        <m.path
                          d="M 60.688 92.449 L 60.688 1.59 M 60.688 1.59 L 119.368 1.59 M 60.688 1.59 L 1.414 1.59"
                          stroke="rgb(255,222,213)"
                          fill="transparent"
                          strokeDasharray="2 2"
                          initial={{ pathLength: 0 }}
                          animate={isCliActive ? { pathLength: 1 } : { pathLength: 0 }}
                          transition={{
                            duration: 2,
                            delay: 0.5,
                            ease: "easeInOut",
                          }}
                        />
                      </svg>
                    </m.div>

                    {/* Animated Purple Blur Effect */}
                    <m.div
                      className="absolute top-1/2 left-1/2 w-16 h-16 bg-primary/40 rounded-full blur-[74px] opacity-65 transform -translate-x-1/2 -translate-y-1/2"
                      initial={{ scale: 1 }}
                      animate={isCliActive ? { scale: [1, 1.342, 1, 1.342] } : { scale: 1 }}
                      transition={{
                        duration: 3,
                        ease: "easeInOut",
                        repeat: isCliActive ? Number.POSITIVE_INFINITY : 0,
                        repeatType: "loop",
                      }}
                    />

                    {/* Main Content Container with Staggered Animations */}
                    <div className="absolute inset-0 flex items-center justify-center px-2 sm:px-4">
                      <div className="flex items-center gap-1 sm:gap-4 md:gap-8 w-full justify-center scale-[0.72] sm:scale-100 origin-center">
                        {/* Left Column */}
                        <div className="flex flex-col gap-2 sm:gap-3 min-w-0">
                            {(isEs
                          ? [
                              { icon: Sparkles, label: "IA para presupuesto" },
                              { icon: FileSpreadsheet, label: "Soporte CSV" },
                              { icon: ShoppingCart, label: "Presupuesto Compras" },
                            ]
                          : [
                              { icon: Sparkles, label: "Budget with AI" },
                              { icon: FileSpreadsheet, label: "CSV Support" },
                              { icon: ShoppingCart, label: "Grocery Budget" },
                            ]
                        ).map((item, index) => (
                            <m.div
                              key={`left-${item.label}`}
                              className="bg-white rounded px-1.5 py-1 sm:px-3 sm:py-2 flex items-center gap-1 sm:gap-2 text-black text-[9px] sm:text-sm font-medium shadow-sm whitespace-nowrap"
                              initial={{ opacity: 1, x: 0 }}
                              animate={isCliActive ? { x: [-20, 0] } : { x: 0 }}
                              transition={{
                                duration: 0.5,
                                delay: index * 0.1,
                              }}
                              whileHover={{ scale: 1.05 }}
                            >
                              <div className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex items-center justify-center flex-shrink-0">
                                <item.icon className="w-3 h-3" />
                              </div>
                              {item.label}
                            </m.div>
                          ))}
                        </div>

                        {/* Center Logo */}
                        <m.div
                          className="w-14 h-14 sm:w-20 sm:h-20 bg-black rounded-lg overflow-hidden shadow-lg flex items-center justify-center p-2 flex-shrink-0"
                          initial={{ opacity: 1, scale: 1 }}
                          animate={isCliActive ? { scale: [1, 1.1, 1] } : { scale: 1 }}
                          transition={{ duration: 0.6, ease: "easeOut" }}
                          whileHover={{ scale: 1.1, rotate: 5 }}
                        >
                          <img
                            src="/Trakzi/LogoShort.svg"
                            alt="Trakzi Logo"
                            className="w-full h-full object-contain"
                           
                          />
                        </m.div>

                        {/* Right Column */}
                        <div className="flex flex-col gap-2 sm:gap-3 min-w-0">
                            {(isEs
                          ? [
                              { icon: LayoutGrid, label: "Cualquier Vista" },
                              { icon: MessageSquare, label: "Chat con IA" },
                              { icon: BarChart3, label: "Cualquier Gráfico" },
                            ]
                          : [
                              { icon: LayoutGrid, label: "Any Layout" },
                              { icon: MessageSquare, label: "Chat with AI" },
                              { icon: BarChart3, label: "Any Chart" },
                            ]
                        ).map((item, index) => (
                            <m.div
                              key={`right-${item.label}`}
                              className="bg-white rounded px-1.5 py-1 sm:px-3 sm:py-2 flex items-center gap-1 sm:gap-2 text-black text-[9px] sm:text-sm font-medium shadow-sm whitespace-nowrap"
                              initial={{ opacity: 1, x: 0 }}
                              animate={isCliActive ? { x: [20, 0] } : { x: 0 }}
                              transition={{
                                duration: 0.5,
                                delay: index * 0.1,
                              }}
                              whileHover={{ scale: 1.05 }}
                            >
                              <div className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex items-center justify-center flex-shrink-0">
                                <item.icon className="w-3 h-3" />
                              </div>
                              {item.label}
                            </m.div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Animated Circular Border */}
                    <m.div
                      className="absolute inset-0 flex items-center justify-center"
                      initial={{ opacity: 0 }}
                      animate={isCliActive ? { opacity: 1 } : { opacity: 0 }}
                      transition={{ duration: 0.5 }}
                    >
                      <svg width="350" height="350" viewBox="0 0 350 350" className="opacity-40">
                        <m.path
                          d="M 175 1.159 C 271.01 1.159 348.841 78.99 348.841 175 C 348.841 271.01 271.01 348.841 175 348.841 C 78.99 348.841 1.159 271.01 1.159 175 C 1.159 78.99 78.99 1.159 175 1.159 Z"
                          stroke="rgba(255, 255, 255, 0.38)"
                          strokeWidth="1.16"
                          fill="transparent"
                          strokeDasharray="4 4"
                          initial={{ pathLength: 0, rotate: 0 }}
                          animate={isCliActive ? { pathLength: 1, rotate: 360 } : { pathLength: 0, rotate: 0 }}
                          transition={{
                            pathLength: { duration: 3, ease: "easeInOut" },
                            rotate: {
                              duration: 20,
                              repeat: isCliActive ? Number.POSITIVE_INFINITY : 0,
                              ease: "linear",
                            },
                          }}
                        />
                      </svg>
                    </m.div>
                  </div>
                </div>
              </m.div>

              {/* Global */}
              <m.div
                className="group border-secondary/40 text-card-foreground relative flex flex-col overflow-hidden rounded-xl border-2 p-6 shadow-xl transition-all ease-in-out hover:border-primary/40"
                onMouseEnter={() => setIsHovering(true)}
                onMouseLeave={() => setIsHovering(false)}
                ref={ref}
                initial={{ opacity: 0, y: 50 }}
                animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 50 }}
                transition={{ duration: 0.5, delay: 0.5 }}
                whileHover={{
                  y: -4,
                }}
                style={{ transition: "opacity 0.3s ease, transform 0.3s ease, border-color 0.3s ease" }}
              >
                <div className="flex flex-col gap-4">
                  <h3 className="text-2xl leading-none font-semibold tracking-tight">{isEs ? "Uso Global" : "Globally Usable"}</h3>
                  <div className="text-md text-muted-foreground flex flex-col gap-2 text-sm">
                    <p className="max-w-[460px]">{isEs ? "Importa desde cualquier banco — admite CSV, PDF, XLSX y archivos de imagen" : "Import from any bank — supports CSV, PDF, XLSX, and image files"}</p>
                  </div>
                </div>
                <div className="flex min-h-[300px] grow items-start justify-center select-none">
                  <h1 className="mt-8 text-center text-5xl leading-[100%] font-semibold sm:leading-normal lg:mt-12 lg:text-6xl">
                    <span className="bg-background relative mt-3 inline-block w-fit rounded-md border px-1.5 py-0.5">
                      <ScrambleHover
                        text={FORMAT_CYCLE[formatIndex]}
                        scrambleSpeed={70}
                        maxIterations={20}
                        useOriginalCharsOnly={false}
                        className="cursor-pointer bg-gradient-to-t from-primary to-primary bg-clip-text text-transparent"
                        isHovering={isHovering || isAutoScrambling}
                        setIsHovering={setIsHovering}
                        characters="abcdefghijklmnopqrstuvwxyz!@#$%^&*()_+-=[]{}|;':\,./<>?"
                      />
                    </span>
                  </h1>
                  <div className="absolute top-64 z-10 flex items-center justify-center">
                    <div className="w-[400px] h-[400px]">
                      <Suspense
                        fallback={
                          <div className="bg-secondary/20 h-[400px] w-[400px] animate-pulse rounded-full"></div>
                        }
                      >
                        <Earth baseColor={baseColor} markerColor={[0, 0, 0]} glowColor={glowColor} dark={dark} />
                      </Suspense>
                    </div>
                  </div>
                  <div className="absolute top-1/2 w-full translate-y-20 scale-x-[1.2] opacity-70 transition-all duration-1000 group-hover:translate-y-8 group-hover:opacity-100">
                    <div className="from-primary/50 to-primary/0 absolute left-1/2 h-[256px] w-[60%] -translate-x-1/2 scale-[2.5] rounded-[50%] bg-radial from-10% to-60% opacity-20 sm:h-[512px] dark:opacity-100"></div>
                    <div className="from-primary/30 to-primary/0 absolute left-1/2 h-[128px] w-[40%] -translate-x-1/2 scale-200 rounded-[50%] bg-radial from-10% to-60% opacity-20 sm:h-[256px] dark:opacity-100"></div>
                  </div>
                </div>
              </m.div>

              {/* Smart Components */}
              <m.div
                className="group border-secondary/40 text-card-foreground relative flex flex-col overflow-hidden rounded-xl border-2 p-6 shadow-xl transition-all ease-in-out hover:border-primary/40"
                onMouseEnter={() => setIsFeature3Hovering(true)}
                onMouseLeave={() => setIsFeature3Hovering(false)}
                initial={{ opacity: 0, y: 50 }}
                animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 50 }}
                transition={{ duration: 0.5, delay: 1.0 }}
                whileHover={{
                  scale: 1.01,
                }}
                style={{ transition: "opacity 0.3s ease, transform 0.3s ease, border-color 0.3s ease" }}
              >
                <div className="flex flex-col gap-4">
                  <h3 className="text-2xl leading-none font-semibold tracking-tight">{isEs ? "IA integrada" : "AI integrated"}</h3>
                  <div className="text-md text-muted-foreground flex flex-col gap-2 text-sm">
                    <p className="max-w-[460px]">
                      {isEs
                        ? "Componentes inteligentes que te ayudan a detectar problemas con tu gasto o ¡pueden felicitarte!"
                        : "Intelligent components that help you find issues with your spending or it can congratulate you!"}
                    </p>
                  </div>
                </div>
                <div className="flex grow items-center justify-center select-none relative min-h-[300px] p-4">
                  <div className="w-full max-w-lg">
                    <div className="relative rounded-2xl border border-border bg-muted/40 dark:bg-white/5 backdrop-blur-sm">
                      <div className="p-4">
                        <textarea
                          className="w-full min-h-[100px] bg-transparent border-none text-foreground placeholder:text-muted-foreground resize-none focus:outline-none text-base leading-relaxed"
                          placeholder={isEs ? "Pregunta sobre tus gastos..." : "Ask about your spending..."}
                          value={inputValue}
                          onChange={(e) => setInputValue(e.target.value)}
                          onKeyDown={handleKeyDown}
                        />
                      </div>
                      <div className="flex items-center justify-between px-4 pb-4">
                        <div className="flex items-center gap-3">
                          <button className="p-2 rounded-full bg-muted hover:bg-muted/80 dark:bg-white/10 dark:hover:bg-white/20 transition-colors">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="16"
                              height="16"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              className="text-muted-foreground"
                            >
                              <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"></path>
                            </svg>
                          </button>
                          <button type="button" className="flex items-center gap-2 px-4 py-2 rounded-full bg-primary hover:bg-primary/90 transition-colors text-primary-foreground font-medium">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="16"
                              height="16"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <circle cx="12" cy="12" r="10"></circle>
                              <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"></path>
                              <path d="M2 12h20"></path>
                            </svg>
                            {isEs ? "Preguntar" : "Ask"}
                          </button>
                        </div>
                        <button className="p-2 rounded-full bg-muted hover:bg-muted/80 dark:bg-white/10 dark:hover:bg-white/20 transition-colors">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="text-muted-foreground"
                          >
                            <path d="m22 2-7 20-4-9-9-4Z"></path>
                            <path d="M22 2 11 13"></path>
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </m.div>

              {/* Dynamic Layouts */}
              <m.div
                className="group border-secondary/40 text-card-foreground relative flex flex-col overflow-hidden rounded-xl border-2 p-6 shadow-xl transition-all ease-in-out hover:border-primary/40"
                onMouseEnter={() => setIsFeature4Hovering(true)}
                onMouseLeave={() => setIsFeature4Hovering(false)}
                initial={{ opacity: 0, y: 50 }}
                animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 50 }}
                transition={{ duration: 0.5, delay: 1.0 }}
                whileHover={{
                  scale: 1.01,
                }}
                style={{ transition: "opacity 0.3s ease, transform 0.3s ease, border-color 0.3s ease" }}
              >
                <div className="flex flex-col gap-4">
                  <h3 className="text-2xl leading-none font-semibold tracking-tight">{isEs ? "Registra Todo" : "Track Everything"}</h3>
                  <div className="text-md text-muted-foreground flex flex-col gap-2 text-sm">
                    <p className="max-w-[460px]">
                      {isEs
                        ? "Gas, arrendamientos, seguros, hipotecas, reparaciones y viajes — todo en un lugar."
                        : "Gas, leases, insurance, mortgage, repairs, and trips — all in one place."}
                    </p>
                  </div>
                </div>
                <div className="flex grow items-center justify-center select-none relative min-h-[380px] sm:min-h-[420px] p-2 sm:p-4">
                  <DynamicLayoutsAnimation />
                </div>
              </m.div>

              {/* Advanced Analytics */}
              <m.div
                className="group border-secondary/40 text-card-foreground relative flex flex-col overflow-hidden rounded-xl border-2 p-6 shadow-xl transition-all ease-in-out hover:border-primary/40"
                initial={{ opacity: 0, y: 50 }}
                animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 50 }}
                transition={{ duration: 0.5, delay: 1.2 }}
                whileHover={{
                  scale: 1.02,
                  y: -2,
                }}
                style={{ transition: "opacity 0.3s ease, transform 0.3s ease, border-color 0.3s ease" }}
              >
                <div className="flex flex-col gap-4">
                  <h3 className="text-2xl leading-none font-semibold tracking-tight">{isEs ? "Análisis Avanzado" : "Advanced Analytics"}</h3>
                  <div className="text-md text-muted-foreground flex flex-col gap-2 text-sm">
                    <p className="max-w-[460px]">
                      {isEs
                        ? "Obtén información profunda sobre tu rendimiento de gastos con análisis e informes en tiempo real."
                        : "Gain deep insights into your expenses performance with real-time analytics and reporting."}
                    </p>
                  </div>
                </div>
                <div className="flex grow items-center justify-center select-none relative min-h-[300px] p-4">
                  <AnimatedCharts />
                </div>
              </m.div>

              {/* Secure by Default */}
              <m.div
                className="group border-secondary/40 text-card-foreground relative flex flex-col overflow-hidden rounded-xl border-2 p-6 shadow-xl transition-all ease-in-out hover:border-primary/40"
                initial={{ opacity: 0, y: 50 }}
                animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 50 }}
                transition={{ duration: 0.5, delay: 1.2 }}
                whileHover={{
                  scale: 1.01,
                }}
                style={{ transition: "opacity 0.3s ease, transform 0.3s ease, border-color 0.3s ease" }}
              >
                <div className="flex flex-col gap-4">
                  <h3 className="text-2xl leading-none font-semibold tracking-tight">{isEs ? "Más funciones por descubrir" : "More features to discover"}</h3>
                  <div className="text-md text-muted-foreground flex flex-col gap-2 text-sm">
                    <p className="max-w-[460px]">
                      {isEs
                        ? "¡Posibilidad de subir tus tickets y obtener datos sobre tus tendencias de compras y más!"
                        : "Possibility to upload your receipts and get data on your grocery tendencies and more!"}
                    </p>
                  </div>
                </div>
                <div className="flex grow items-center justify-center select-none relative min-h-[300px] p-4">
                  <ReceiptFridgeAnimation />
                </div>
              </m.div>
              {/* Fridge Showcase — full width */}
              <m.div
                className="group border-secondary/40 text-card-foreground relative col-span-1 md:col-span-2 flex flex-col overflow-hidden rounded-xl border-2 p-6 shadow-xl transition-all ease-in-out"
                initial={{ opacity: 0, y: 50 }}
                animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 50 }}
                transition={{ duration: 0.5, delay: 1.4 }}
                whileHover={{
                  scale: 1.005,
                }}
                style={{ transition: "opacity 0.3s ease, transform 0.3s ease, border-color 0.3s ease" }}
              >
                <div className="flex flex-col gap-4 mb-4">
                  <h3 className="text-2xl leading-none font-semibold tracking-tight">{isEs ? "Escanea un ticket. Obtén información." : "Scan a receipt. Get insights."}</h3>
                  <p className="text-sm text-muted-foreground max-w-[560px]">
                    {isEs
                      ? "Sube cualquier ticket de supermercado y Trakzi extrae, categoriza y analiza cada artículo — desde patrones de gasto hasta análisis nutricional, todo automáticamente."
                      : "Upload any grocery receipt and watch Trakzi extract, categorize, and analyze every item — from spending patterns to nutrition breakdowns, all automatically."}
                  </p>
                </div>
                <div className="flex grow items-center justify-center select-none">
                  <ReceiptScannerAnimation />
                </div>
              </m.div>
            </div>
        </div>
      </m.div>
    </section>
  )
}
