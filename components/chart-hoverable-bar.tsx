"use client"

import { createElement, memo, useState, useCallback, useRef } from "react"
import { useTooltip } from "@nivo/tooltip"

/** Target radius for tall bars; short/thin segments cap lower so corners never “pill” past half the bar. */
const BAR_CORNER_RADIUS_PREFERRED = 6

function clampBarCornerRadius(
  width: number,
  height: number,
  preferred: number = BAR_CORNER_RADIUS_PREFERRED,
): number {
  if (!(width > 0) || !(height > 0)) return 0
  return Math.min(preferred, width / 2, height / 2)
}

interface HoverableBarProps {
  bar: {
    x: number
    y: number
    width: number
    height: number
    color: string
    /** Bar index — used for staggered animation delay */
    index?: number
    data?: Record<string, unknown>
    [key: string]: unknown
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  style?: Record<string, unknown>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tooltip?: React.ComponentType<any>
  isInteractive?: boolean
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onMouseEnter?: (data: any, event: React.MouseEvent<SVGRectElement>) => void
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onMouseLeave?: (data: any, event: React.MouseEvent<SVGRectElement>) => void
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onMouseMove?: (data: any, event: React.MouseEvent<SVGRectElement>) => void
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onClick?: (data: any, event: React.MouseEvent<SVGRectElement>) => void
}

export const HoverableBar = memo(function HoverableBar({
  bar,
  tooltip,
  isInteractive,
  onClick,
}: HoverableBarProps) {
  const [hovered, setHovered] = useState(false)
  const { showTooltipFromEvent, hideTooltip } = useTooltip()
  // Cache the tooltip element — only recreate when bar data changes, not on every mouse move
  const contentRef = useRef<React.ReactNode>(null)
  // RAF handle for throttling mousemove tooltip updates
  const rafRef = useRef<number | null>(null)
  /** Prevents a queued RAF from calling showTooltip after pointer left the hit target (tooltip would follow cursor forever). */
  const isPointerOverRef = useRef(false)

  const buildContent = useCallback(() => {
    if (!tooltip) return null
    const { data: barData, ...barWithoutData } = bar
    return createElement(tooltip, { ...barWithoutData, ...(barData ?? {}) })
  }, [bar, tooltip])

  const handleMouseEnter = useCallback((e: React.MouseEvent<SVGRectElement>) => {
    isPointerOverRef.current = true
    setHovered(true)
    contentRef.current = buildContent()
    if (contentRef.current) showTooltipFromEvent(contentRef.current, e)
  }, [buildContent, showTooltipFromEvent])

  const handleMouseMove = useCallback((e: React.MouseEvent<SVGRectElement>) => {
    // Throttle via RAF — tooltip position updates at display frame rate, not DOM event rate
    if (rafRef.current !== null) return
    const clientX = e.clientX
    const clientY = e.clientY
    const nativeEvent = e.nativeEvent
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null
      if (contentRef.current && isPointerOverRef.current) {
        // Re-use cached event-like object to avoid recreating tooltip content
        showTooltipFromEvent(contentRef.current, { clientX, clientY, nativeEvent } as React.MouseEvent<SVGRectElement>)
      }
    })
  }, [showTooltipFromEvent])

  const handleMouseLeave = useCallback(() => {
    isPointerOverRef.current = false
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
    setHovered(false)
    hideTooltip()
  }, [hideTooltip])

  const handleClick = useCallback((e: React.MouseEvent<SVGRectElement>) => {
    onClick?.(bar.data, e)
  }, [bar.data, onClick])

  // Skip zero-height bars entirely (e.g. positional-key slots with no data for this bar)
  if (bar.height === 0) return <g />

  const interactive = isInteractive !== false
  const staggerDelay = `${(bar.index ?? 0) * 40}ms`

  // Minimum visible height: bars under this threshold all render at the same size
  const MIN_VISUAL = 4
  const MIN_HIT = 10
  const visualHeight = Math.max(bar.height, MIN_VISUAL)
  const visualY = bar.y - Math.max(0, (MIN_VISUAL - bar.height) / 2)
  const hitHeight = Math.max(bar.height, MIN_HIT)
  const hitY = bar.y - Math.max(0, (MIN_HIT - bar.height) / 2)

  const cornerR = clampBarCornerRadius(bar.width, visualHeight)

  return (
    <g>
      <rect
        x={bar.x} y={visualY} width={bar.width} height={visualHeight}
        rx={cornerR} ry={cornerR} fill={bar.color as string}
        style={{
          animation: `nivo-bar-grow 0.45s cubic-bezier(0.22, 1, 0.36, 1) ${staggerDelay} both`,
          transition: "transform 150ms ease-out",
          transformBox: "fill-box",
          transformOrigin: "bottom center",
          transform: hovered ? "scaleY(1.05)" : "scaleY(1)",
          pointerEvents: "none",
        }}
      />
      {/* Transparent overlay with minimum hit target — rendered on top in SVG z-order */}
      <rect
        x={bar.x}
        y={hitY}
        width={bar.width}
        height={hitHeight}
        fill="transparent"
        style={{ cursor: "pointer" }}
        onMouseEnter={interactive ? handleMouseEnter : undefined}
        onMouseLeave={interactive ? handleMouseLeave : undefined}
        onMouseMove={interactive ? handleMouseMove : undefined}
        onClick={interactive ? handleClick : undefined}
      />
    </g>
  )
})
HoverableBar.displayName = "HoverableBar"

export const HoverableHorizontalBar = memo(function HoverableHorizontalBar({
  bar,
  tooltip,
  isInteractive,
  onClick,
}: HoverableBarProps) {
  const [hovered, setHovered] = useState(false)
  const { showTooltipFromEvent, hideTooltip } = useTooltip()
  const contentRef = useRef<React.ReactNode>(null)
  const rafRef = useRef<number | null>(null)
  const isPointerOverRef = useRef(false)

  const buildContent = useCallback(() => {
    if (!tooltip) return null
    const { data: barData, ...barWithoutData } = bar
    return createElement(tooltip, { ...barWithoutData, ...(barData ?? {}) })
  }, [bar, tooltip])

  const handleMouseEnter = useCallback((e: React.MouseEvent<SVGRectElement>) => {
    isPointerOverRef.current = true
    setHovered(true)
    contentRef.current = buildContent()
    if (contentRef.current) showTooltipFromEvent(contentRef.current, e)
  }, [buildContent, showTooltipFromEvent])

  const handleMouseMove = useCallback((e: React.MouseEvent<SVGRectElement>) => {
    if (rafRef.current !== null) return
    const clientX = e.clientX
    const clientY = e.clientY
    const nativeEvent = e.nativeEvent
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null
      if (contentRef.current && isPointerOverRef.current) {
        showTooltipFromEvent(contentRef.current, { clientX, clientY, nativeEvent } as React.MouseEvent<SVGRectElement>)
      }
    })
  }, [showTooltipFromEvent])

  const handleMouseLeave = useCallback(() => {
    isPointerOverRef.current = false
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
    setHovered(false)
    hideTooltip()
  }, [hideTooltip])

  const handleClick = useCallback((e: React.MouseEvent<SVGRectElement>) => {
    onClick?.(bar.data, e)
  }, [bar.data, onClick])

  const interactive = isInteractive !== false
  const staggerDelay = `${(bar.index ?? 0) * 40}ms`

  if (bar.width === 0) return <g />

  // Match vertical HoverableBar: scale transform only on the visual rect; stable hit target avoids
  // pointer/leave glitches and matches Income Sources + other horizontal Nivo bars.
  const MIN_VISUAL_W = 4
  const MIN_HIT_W = 14
  const MIN_VISUAL_H = 4
  const MIN_HIT_H = 10
  const visualWidth = Math.max(bar.width, MIN_VISUAL_W)
  const visualHeight = Math.max(bar.height, MIN_VISUAL_H)
  const visualY = bar.y - Math.max(0, (MIN_VISUAL_H - bar.height) / 2)
  const hitWidth = Math.max(bar.width, MIN_HIT_W)
  const hitHeight = Math.max(bar.height, MIN_HIT_H)
  const hitY = bar.y - Math.max(0, (MIN_HIT_H - bar.height) / 2)

  const cornerVisual = clampBarCornerRadius(visualWidth, visualHeight)

  return (
    <g>
      <rect
        x={bar.x}
        y={visualY}
        width={visualWidth}
        height={visualHeight}
        rx={cornerVisual}
        ry={cornerVisual}
        fill={bar.color as string}
        style={{
          animation: `nivo-bar-grow-horizontal 0.45s cubic-bezier(0.22, 1, 0.36, 1) ${staggerDelay} both`,
          transition: "transform 150ms ease-out",
          transformBox: "fill-box",
          transformOrigin: "left center",
          transform: hovered ? "scaleX(1.05)" : "scaleX(1)",
          pointerEvents: "none",
        }}
      />
      <rect
        x={bar.x}
        y={hitY}
        width={hitWidth}
        height={hitHeight}
        fill="transparent"
        style={{ cursor: "pointer" }}
        onMouseEnter={interactive ? handleMouseEnter : undefined}
        onMouseLeave={interactive ? handleMouseLeave : undefined}
        onMouseMove={interactive ? handleMouseMove : undefined}
        onClick={interactive ? handleClick : undefined}
      />
    </g>
  )
})
HoverableHorizontalBar.displayName = "HoverableHorizontalBar"
