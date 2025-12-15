"use client"

import { useMemo, useRef } from "react"
import { motion, useInView, type UseInViewOptions } from "framer-motion"
import { cn } from "@/lib/utils"

type ShimmeringTextProps = {
  text: string
  duration?: number
  delay?: number
  repeat?: boolean
  repeatDelay?: number
  className?: string
  startOnView?: boolean
  once?: boolean
  inViewMargin?: UseInViewOptions["margin"]
  spread?: number
  color?: string
  shimmerColor?: string
}

// Animated gradient text with viewport-aware start
export function ShimmeringText({
  text,
  duration = 2,
  delay = 0,
  repeat = true,
  repeatDelay = 0.5,
  className,
  startOnView = true,
  once = false,
  inViewMargin,
  spread = 2,
  color,
  shimmerColor,
}: ShimmeringTextProps) {
  const ref = useRef<HTMLSpanElement | null>(null)
  const isInView = useInView(ref, { margin: inViewMargin, once })
  const shouldAnimate = startOnView ? isInView : true

  const [baseColor, highlightColor] = useMemo(() => {
    // Explicit fallbacks to ensure visibility even if CSS vars are missing
    const fallbackBase = "var(--foreground, #d1d5db)"
    const fallbackHighlight = "var(--primary, #fb923c)"
    return [
      color || fallbackBase,
      shimmerColor || fallbackHighlight,
    ]
  }, [color, shimmerColor])

  return (
    <motion.span
      ref={ref}
      initial={{ opacity: 0.85, backgroundPosition: "0% 50%" }}
      animate={
        shouldAnimate
          ? {
              opacity: 1,
              backgroundPosition: ["0% 50%", "100% 50%"],
            }
          : { opacity: 1, backgroundPosition: "0% 50%" }
      }
      transition={{
        duration,
        delay,
        repeat: repeat ? Infinity : 0,
        repeatType: "mirror",
        repeatDelay,
        ease: "linear",
      }}
      className={cn(
        "inline-block bg-clip-text text-transparent",
        "bg-[length:200%_100%]",
        className
      )}
      style={{
        backgroundImage: `linear-gradient(90deg, ${baseColor}, ${highlightColor}, ${baseColor})`,
        backgroundSize: `${spread * 100}% 100%`,
        WebkitBackgroundClip: "text",
        WebkitTextFillColor: "transparent",
      }}
    >
      {text}
    </motion.span>
  )
}
