"use client"

import { useState, useEffect, useRef } from "react"

/**
 * Animates a number from 0 to target with an ease-out cubic curve.
 * Re-animates from 0 whenever `target` changes to a new value.
 */
export function useCountUp(target: number, duration = 600): number {
  const [current, setCurrent] = useState(0)
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }

    if (target === 0) {
      setCurrent(0)
      return
    }

    let startTime: number | null = null

    const animate = (timestamp: number) => {
      if (startTime === null) startTime = timestamp
      const elapsed = timestamp - startTime
      const progress = Math.min(elapsed / duration, 1)
      // Ease-out cubic — decelerates into final value
      const eased = 1 - Math.pow(1 - progress, 3)
      setCurrent(target * eased)

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate)
      } else {
        setCurrent(target)
      }
    }

    rafRef.current = requestAnimationFrame(animate)

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
    }
  }, [target, duration])

  return current
}
