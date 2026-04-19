"use client"

import { useRef, useState, useEffect, useCallback } from "react"
import { motion, animate, useInView, AnimatePresence } from "framer-motion"
import Image from "next/image"
import { geist } from "@/lib/fonts"

interface ImageComparisonSectionProps {
  beforeSrc: string
  afterSrc: string
  beforeAlt?: string
  afterAlt?: string
}

export function ImageComparisonSection({
  beforeSrc,
  afterSrc,
  beforeAlt = "Before Trakzi",
  afterAlt = "With Trakzi",
}: ImageComparisonSectionProps) {
  const sectionRef = useRef<HTMLElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const isInView = useInView(sectionRef, { once: true, margin: "-80px" })
  const [displayPosition, setDisplayPosition] = useState(50)
  const [isDragging, setIsDragging] = useState(false)
  const [showHint, setShowHint] = useState(false)
  const introPlayedRef = useRef(false)
  const timersRef = useRef<number[]>([])

  useEffect(() => {
    if (!isInView || introPlayedRef.current) return
    introPlayedRef.current = true

    const t1 = window.setTimeout(() => setShowHint(true), 500)
    timersRef.current.push(t1)

    const t2 = window.setTimeout(() => {
      animate(50, [50, 28, 72, 50], {
        duration: 3.0,
        ease: [0.4, 0, 0.2, 1],
        onUpdate: (v) => setDisplayPosition(v),
        onComplete: () => setShowHint(false),
      })
    }, 1100)
    timersRef.current.push(t2)

    return () => {
      timersRef.current.forEach((id) => window.clearTimeout(id))
    }
  }, [isInView])

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!isDragging || !containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      const pct = Math.max(2, Math.min(98, ((e.clientX - rect.left) / rect.width) * 100))
      setDisplayPosition(pct)
    },
    [isDragging],
  )

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    setIsDragging(true)
    setShowHint(false)
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect()
      const pct = Math.max(2, Math.min(98, ((e.clientX - rect.left) / rect.width) * 100))
      setDisplayPosition(pct)
    }
  }, [])

  const handlePointerUp = useCallback(() => setIsDragging(false), [])

  return (
    <section
      ref={sectionRef}
      className="py-24 sm:py-32 md:py-48 text-foreground relative overflow-hidden"
    >
      {/* Top separator — matches Features/ChartsShowcase pattern */}
      <div className="bg-primary absolute -top-10 left-1/2 h-16 w-44 -translate-x-1/2 rounded-full opacity-40 blur-3xl select-none pointer-events-none" />
      <div className="via-primary/50 absolute top-0 left-1/2 h-px w-3/5 -translate-x-1/2 bg-gradient-to-r from-transparent to-transparent pointer-events-none" />

      {/* Heading — constrained */}
      <div className="max-w-screen-xl mx-auto w-full px-4 sm:px-8 mb-10 sm:mb-14">
        <motion.div
          className="flex flex-col gap-4 items-center text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.5 }}
        >
          <h2
            className={`${geist.className} text-5xl md:text-[72px] md:leading-[80px] font-semibold tracking-tighter`}
          >
            See the difference.
          </h2>
          <p className="text-lg text-muted-foreground max-w-xl">
            Drag to compare. Your finances shouldn&apos;t require a spreadsheet.
          </p>
        </motion.div>
      </div>

      {/* Slider — slightly wider than heading container */}
      <div className="max-w-screen-2xl mx-auto w-full px-4 sm:px-6">
        <motion.div
          ref={containerRef}
          className="relative w-full rounded-2xl overflow-hidden border border-border/40 shadow-2xl select-none"
          style={{
            cursor: isDragging ? "grabbing" : "ew-resize",
            aspectRatio: "16 / 9",
          }}
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ duration: 0.6, delay: 0.12 }}
          onPointerMove={handlePointerMove}
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
        >
          {/* Before image — full width, always visible underneath */}
          <div className="absolute inset-0">
            <Image
              src={beforeSrc}
              alt={beforeAlt}
              fill
              className="object-cover object-top"
              draggable={false}
              priority
            />
          </div>

          {/* After image — clipped to reveal right portion */}
          <div
            className="absolute inset-0"
            style={{ clipPath: `inset(0 0 0 ${displayPosition}%)` }}
          >
            <Image
              src={afterSrc}
              alt={afterAlt}
              fill
              className="object-cover object-top"
              draggable={false}
              priority
            />
          </div>

          {/* Divider line + orange glow */}
          <div
            className="absolute top-0 bottom-0 pointer-events-none"
            style={{ left: `${displayPosition}%`, transform: "translateX(-50%)" }}
          >
            {/* Orange glow */}
            <div
              className="absolute inset-0 w-[3px]"
              style={{
                background:
                  "linear-gradient(to bottom, transparent 0%, rgba(231,138,83,0.65) 15%, rgba(231,138,83,0.65) 85%, transparent 100%)",
                filter: "blur(2px)",
              }}
            />
            {/* Crisp white line */}
            <div className="absolute inset-0 w-px bg-white/70" />
          </div>

          {/* Handle */}
          <div
            className="absolute top-1/2 pointer-events-none z-10"
            style={{ left: `${displayPosition}%`, transform: "translate(-50%, -50%)" }}
          >
            <div
              className="w-11 h-11 rounded-full border-[2.5px] border-white/90 flex items-center justify-center"
              style={{
                backgroundColor: "#e78a53",
                boxShadow: "0 0 0 4px rgba(231,138,83,0.25), 0 4px 16px rgba(0,0,0,0.35)",
              }}
            >
              <svg width="18" height="14" viewBox="0 0 18 14" fill="none">
                <path
                  d="M5 1L1 7L5 13M13 1L17 7L13 13"
                  stroke="white"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </div>

          {/* "Before" label — top-left, fades when slider hides it */}
          <div
            className="absolute top-4 left-4 pointer-events-none transition-opacity duration-300 z-10"
            style={{ opacity: displayPosition > 10 ? 1 : 0 }}
          >
            <span className="bg-black/55 backdrop-blur-sm text-white/90 text-xs font-medium px-3 py-1.5 rounded-full">
              Before
            </span>
          </div>

          {/* "With Trakzi" label — top-right, fades when slider covers it */}
          <div
            className="absolute top-4 right-4 pointer-events-none transition-opacity duration-300 z-10"
            style={{ opacity: displayPosition < 90 ? 1 : 0 }}
          >
            <span
              className="text-white text-xs font-semibold px-3 py-1.5 rounded-full"
              style={{
                backgroundColor: "rgba(231,138,83,0.9)",
                backdropFilter: "blur(6px)",
              }}
            >
              With Trakzi
            </span>
          </div>

          {/* Drag hint badge */}
          <AnimatePresence>
            {showHint && (
              <motion.div
                className="absolute bottom-5 left-1/2 -translate-x-1/2 pointer-events-none z-10"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.35 }}
              >
                <span className="bg-black/55 backdrop-blur-sm text-white/80 text-xs font-medium px-4 py-2 rounded-full flex items-center gap-2">
                  <svg width="16" height="10" viewBox="0 0 16 10" fill="none">
                    <path
                      d="M1 5h14M1 5l3.5-3.5M1 5l3.5 3.5M15 5l-3.5-3.5M15 5l-3.5 3.5"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  Drag to compare
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </section>
  )
}
