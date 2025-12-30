import { useEffect, useRef, useState } from "react"
import { useCurrency } from "@/components/currency-provider"

import type { ActivityRingsConfig, ActivityRingsData } from "../types"

type SpendingActivityRingsProps = {
  data: ActivityRingsData
  config: ActivityRingsConfig
  theme: "light" | "dark"
  ringLimits?: Record<string, number>
  getDefaultLimit?: () => number
}

// Custom concentric rings renderer so we control tooltips from Neon data
export function SpendingActivityRings({ data, config, theme, ringLimits = {}, getDefaultLimit }: SpendingActivityRingsProps) {
  const { formatCurrency } = useCurrency()
  const rings = Array.isArray(data) ? data : []
  if (!rings.length) return null

  const [hoveredRing, setHoveredRing] = useState<number | null>(null)
  const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number } | null>(null)
  const [isAnimating, setIsAnimating] = useState(true)
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerSize, setContainerSize] = useState({ width: config.width, height: config.height })

  // Reset animation state when data changes
  useEffect(() => {
    setIsAnimating(true)
    const timer = setTimeout(() => setIsAnimating(false), 800)
    return () => clearTimeout(timer)
  }, [data])

  // Observe container size changes
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const updateSize = () => {
      const rect = container.getBoundingClientRect()
      // Use the smaller dimension to keep the chart square, with some padding
      // Account for padding and margins
      const padding = 40
      const availableWidth = rect.width - padding
      const availableHeight = rect.height - padding
      const size = Math.min(availableWidth, availableHeight)
      const minSize = 200 // Minimum size
      const maxSize = 800 // Increased maximum size
      const clampedSize = Math.max(minSize, Math.min(maxSize, size))

      // Only update if size actually changed to avoid unnecessary re-renders
      setContainerSize(prev => {
        if (Math.abs(prev.width - clampedSize) > 1) {
          return { width: clampedSize, height: clampedSize }
        }
        return prev
      })
    }

    // Initial size with a small delay to ensure layout is complete
    const timeoutId = setTimeout(updateSize, 0)

    // Observe resize
    const resizeObserver = new ResizeObserver(() => {
      // Use requestAnimationFrame to ensure layout is complete
      requestAnimationFrame(updateSize)
    })
    resizeObserver.observe(container)

    return () => {
      clearTimeout(timeoutId)
      resizeObserver.disconnect()
    }
  }, [])

  const width = containerSize.width
  const height = containerSize.height
  const centerX = width / 2
  const centerY = height / 2
  // Scale ring size and radius proportionally to container size
  const sizeScale = width / config.width
  const ringSize = (config.ringSize ?? 12) * sizeScale
  const gap = 4 * sizeScale
  const baseRadius = (config.radius ?? 32) * sizeScale

  const trackBase = theme === "light" ? "#e5e7eb" : "#374151"
  const maxIndex = rings.length - 1

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>, index: number) => {
    if (!containerRef.current) return
    const containerRect = containerRef.current.getBoundingClientRect()
    setTooltipPosition({
      x: e.clientX - containerRect.left,
      y: e.clientY - containerRect.top,
    })
    setHoveredRing(index)
  }

  const handleMouseLeave = () => {
    setHoveredRing(null)
    setTooltipPosition(null)
  }

  return (
    <div ref={containerRef} className="relative w-full h-full flex items-center justify-center" style={{ minHeight: '200px', minWidth: '200px' }}>
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label="Spending activity rings"
        onMouseLeave={handleMouseLeave}
        className={isAnimating ? "animate-in fade-in-0 zoom-in-95 duration-500" : ""}
        style={{ maxWidth: '100%', maxHeight: '100%' }}
      >
        {rings.map((item, index) => {
          // Outermost ring corresponds to first item
          const ringIndexFromOutside = index
          const radius =
            baseRadius + (maxIndex - ringIndexFromOutside) * (ringSize + gap)
          const circumference = 2 * Math.PI * radius
          const clampedValue = Math.max(0, Math.min(1, item.value ?? 0))
          const dashOffset = circumference * (1 - clampedValue)

          const strokeColor = item.color || "#6b7280"
          const trackColor =
            item.backgroundColor || `${trackBase}${theme === "light" ? "ff" : "cc"}`

          return (
            <g key={item.category ?? item.label ?? index}>
              {/* Track */}
              <circle
                cx={centerX}
                cy={centerY}
                r={radius}
                fill="none"
                stroke={trackColor}
                strokeWidth={ringSize}
                strokeLinecap="round"
              />
              {/* Progress arc */}
              <circle
                cx={centerX}
                cy={centerY}
                r={radius}
                fill="none"
                stroke={strokeColor}
                strokeWidth={ringSize}
                strokeDasharray={circumference}
                strokeDashoffset={isAnimating ? circumference : dashOffset}
                strokeLinecap="round"
                transform={`rotate(-90 ${centerX} ${centerY})`}
                onMouseMove={(e) => {
                  const svg = e.currentTarget.ownerSVGElement
                  if (svg) {
                    handleMouseMove(e as unknown as React.MouseEvent<SVGSVGElement>, index)
                  }
                }}
                style={{
                  cursor: "pointer",
                  transition: "stroke-width 0.2s ease-in-out, opacity 0.2s ease-in-out, stroke-dashoffset 0.8s cubic-bezier(0.4, 0, 0.2, 1)",
                  strokeWidth: hoveredRing === index ? ringSize + 2 : ringSize,
                  opacity: hoveredRing === null || hoveredRing === index ? 1 : 0.6,
                }}
              />
            </g>
          )
        })}
      </svg>
      {hoveredRing !== null && tooltipPosition && (
        <div
          className="border-border/50 bg-background grid min-w-[8rem] items-start gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs shadow-xl pointer-events-none absolute z-50 animate-in fade-in-0 zoom-in-95 duration-200"
          style={{
            left: `${tooltipPosition.x + 10}px`,
            top: `${tooltipPosition.y - 10}px`,
            transform: "translate(-50%, -100%)",
            width: "max-content",
          }}
        >
          {(() => {
            const item = rings[hoveredRing]
            const category = (item as { category?: string }).category ?? "Category"
            const spent = typeof (item as { spent?: number }).spent === "number"
              ? (item as { spent?: number }).spent!
              : 0

            // Calculate budget from ringLimits or default
            const storedLimit = ringLimits[category]
            const budget = typeof storedLimit === "number" && storedLimit > 0
              ? storedLimit
              : (getDefaultLimit ? getDefaultLimit() : null)

            const pct = budget && budget > 0 ? ((spent / budget) * 100).toFixed(1) : '0'
            const exceeded = budget ? spent > budget : false

            return (
              <>
                <div className="font-medium">{category}</div>
                <div className="grid gap-1.5">
                  <div className="flex items-center gap-2">
                    <div className="shrink-0 h-2.5 w-2.5 rounded-[2px] border border-current"
                      style={{ backgroundColor: item.color || "#6b7280", borderColor: item.color || "#6b7280" }}
                    />
                    <div className="flex justify-between items-center leading-none gap-4">
                      <span className="text-muted-foreground">Used:</span>
                      <span className="text-foreground font-mono font-medium tabular-nums">{pct}%</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="shrink-0 h-2.5 w-2.5 rounded-[2px] border border-current"
                      style={{ backgroundColor: item.color || "#6b7280", borderColor: item.color || "#6b7280" }}
                    />
                    <div className="flex justify-between items-center leading-none gap-4">
                      <span className="text-muted-foreground">Spent:</span>
                      <span className="text-foreground font-mono font-medium tabular-nums" style={{ color: exceeded ? '#ef4444' : undefined }}>
                        {formatCurrency(spent)}
                      </span>
                    </div>
                  </div>
                  {budget && (
                    <>
                      <div className="flex items-center gap-2">
                        <div className="shrink-0 h-2.5 w-2.5 rounded-[2px] border border-current"
                          style={{ backgroundColor: item.color || "#6b7280", borderColor: item.color || "#6b7280" }}
                        />
                        <div className="flex justify-between items-center leading-none gap-4">
                          <span className="text-muted-foreground">Budget:</span>
                          <span className="text-foreground font-mono font-medium tabular-nums">{formatCurrency(budget, { maximumFractionDigits: 0 })}</span>
                        </div>
                      </div>
                      {exceeded && (
                        <div className="flex items-center gap-2">
                          <div className="shrink-0 h-2.5 w-2.5 rounded-[2px] border border-current"
                            style={{ backgroundColor: item.color || "#6b7280", borderColor: item.color || "#6b7280" }}
                          />
                          <div className="flex justify-between items-center leading-none gap-4">
                            <span className="text-muted-foreground">Status:</span>
                            <span className="text-foreground font-mono font-medium tabular-nums" style={{ color: '#ef4444' }}>ƒsÿ Exceeded</span>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </>
            )
          })()}
        </div>
      )}
    </div>
  )
}
