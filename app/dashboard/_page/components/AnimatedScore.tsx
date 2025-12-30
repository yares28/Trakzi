import { useEffect, useState } from "react"

type AnimatedScoreProps = {
  value: number
  className?: string
}

export function AnimatedScore({ value, className }: AnimatedScoreProps) {
  const [displayValue, setDisplayValue] = useState(0)

  useEffect(() => {
    const duration = 1500
    const startTime = Date.now()
    const startValue = 0

    const animateValue = () => {
      const now = Date.now()
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)

      const easeOut = 1 - Math.pow(1 - progress, 3)
      const current = Math.round(startValue + (value - startValue) * easeOut)

      setDisplayValue(current)

      if (progress < 1) {
        requestAnimationFrame(animateValue)
      }
    }

    requestAnimationFrame(animateValue)
  }, [value])

  return <span className={className}>{displayValue}</span>
}
