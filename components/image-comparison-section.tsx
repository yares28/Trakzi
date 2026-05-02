"use client"

import { useRef, useState, useEffect, useCallback } from "react"
import { motion, useInView } from "framer-motion"
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

  const updateFromClientX = useCallback((clientX: number) => {
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const pct = Math.max(2, Math.min(98, ((clientX - rect.left) / rect.width) * 100))
    setDisplayPosition(pct)
  }, [])

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!isDragging) return
      // Block the browser from using this gesture for page scroll (mobile).
      // Only effective when the element's CSS touch-action allows it.
      if (e.cancelable) e.preventDefault()
      updateFromClientX(e.clientX)
    },
    [isDragging, updateFromClientX],
  )

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      // Capture the pointer so move/up keep firing on this element even if the
      // finger drifts outside its bounds — required for a smooth touch drag.
      try {
        e.currentTarget.setPointerCapture(e.pointerId)
      } catch {
        /* setPointerCapture can throw if the pointer is already gone; ignore */
      }
      setIsDragging(true)
      updateFromClientX(e.clientX)
    },
    [updateFromClientX],
  )

  const handlePointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    try {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId)
      }
    } catch {
      /* ignore — pointer may already be released */
    }
    setIsDragging(false)
  }, [])

  // Fallback for browsers / WebViews where Pointer Events get suppressed by the
  // page's scroll handling on touch (some older mobile Safari versions). We
  // listen with a non-passive touchmove so we can call preventDefault() and stop
  // the browser from scrolling the page while the user drags the slider.
  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const onTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0]
      if (!touch) return
      setIsDragging(true)
      updateFromClientX(touch.clientX)
    }

    const onTouchMove = (e: TouchEvent) => {
      const touch = e.touches[0]
      if (!touch) return
      // Must be non-passive to call preventDefault — registered below.
      if (e.cancelable) e.preventDefault()
      updateFromClientX(touch.clientX)
    }

    const onTouchEnd = () => setIsDragging(false)

    el.addEventListener("touchstart", onTouchStart, { passive: true })
    el.addEventListener("touchmove", onTouchMove, { passive: false })
    el.addEventListener("touchend", onTouchEnd, { passive: true })
    el.addEventListener("touchcancel", onTouchEnd, { passive: true })

    return () => {
      el.removeEventListener("touchstart", onTouchStart)
      el.removeEventListener("touchmove", onTouchMove)
      el.removeEventListener("touchend", onTouchEnd)
      el.removeEventListener("touchcancel", onTouchEnd)
    }
  }, [updateFromClientX])

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
          className="relative w-full rounded-2xl overflow-hidden border border-border/40 shadow-2xl select-none touch-none"
          style={{
            cursor: isDragging ? "grabbing" : "ew-resize",
            aspectRatio: "16 / 9",
            // Tell the browser this element handles its own pointer input —
            // without this, mobile uses the gesture for vertical page scroll
            // and the slider never receives pointermove events.
            touchAction: "none",
            WebkitUserSelect: "none",
            WebkitTouchCallout: "none",
          }}
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ duration: 0.6, delay: 0.12 }}
          onPointerMove={handlePointerMove}
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
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

          {/* Handle — small, no animation; user drags it directly */}
          <div
            className="absolute top-1/2 pointer-events-none z-10"
            style={{ left: `${displayPosition}%`, transform: "translate(-50%, -50%)" }}
          >
            <div
              className="w-7 h-7 rounded-full border-2 border-white/90 flex items-center justify-center"
              style={{
                backgroundColor: "#e78a53",
                boxShadow: "0 0 0 3px rgba(231,138,83,0.22), 0 2px 10px rgba(0,0,0,0.3)",
              }}
            >
              <svg width="12" height="10" viewBox="0 0 18 14" fill="none">
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

        </motion.div>
      </div>
    </section>
  )
}
