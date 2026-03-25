"use client"

import { createElement, memo, useState, useCallback } from "react"
import { useTooltip } from "@nivo/tooltip"

/**
 * Module-level hide debounce — shared across all bar instances so that
 * moving from one bar to an adjacent bar cancels the pending hide,
 * giving a smooth tooltip transition with no flicker.
 */
let _hideTimer: ReturnType<typeof setTimeout> | null = null

function scheduleHide(hideTooltip: () => void) {
  if (_hideTimer) clearTimeout(_hideTimer)
  _hideTimer = setTimeout(() => {
    hideTooltip()
    _hideTimer = null
  }, 80)
}

function cancelScheduledHide() {
  if (_hideTimer) {
    clearTimeout(_hideTimer)
    _hideTimer = null
  }
}

interface HoverableBarProps {
  bar: {
    x: number
    y: number
    width: number
    height: number
    color: string
    data?: Record<string, unknown>
    [key: string]: unknown
  }
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
  onMouseEnter,
  onMouseLeave,
  onMouseMove,
  onClick,
}: HoverableBarProps) {
  const [hovered, setHovered] = useState(false)
  const { showTooltipFromEvent, hideTooltip } = useTooltip()

  const getContent = useCallback(() => {
    if (!tooltip) return null
    const { data: barData, ...barWithoutData } = bar
    return createElement(tooltip, { ...barWithoutData, ...(barData ?? {}) })
  }, [bar, tooltip])

  const handleMouseEnter = useCallback((e: React.MouseEvent<SVGRectElement>) => {
    cancelScheduledHide()
    setHovered(true)
    const content = getContent()
    if (content) showTooltipFromEvent(content, e)
    onMouseEnter?.(bar.data, e)
  }, [bar.data, getContent, showTooltipFromEvent, onMouseEnter])

  const handleMouseMove = useCallback((e: React.MouseEvent<SVGRectElement>) => {
    const content = getContent()
    if (content) showTooltipFromEvent(content, e)
    onMouseMove?.(bar.data, e)
  }, [bar.data, getContent, showTooltipFromEvent, onMouseMove])

  const handleMouseLeave = useCallback((e: React.MouseEvent<SVGRectElement>) => {
    setHovered(false)
    scheduleHide(hideTooltip)
    onMouseLeave?.(bar.data, e)
  }, [bar.data, hideTooltip, onMouseLeave])

  const handleClick = useCallback((e: React.MouseEvent<SVGRectElement>) => {
    onClick?.(bar.data, e)
  }, [bar.data, onClick])

  const interactive = isInteractive !== false

  return (
    <rect
      x={bar.x} y={bar.y} width={bar.width} height={bar.height}
      rx={10} ry={10} fill={bar.color as string}
      style={{
        transition: "transform 150ms ease-out",
        transformBox: "fill-box",
        transformOrigin: "bottom center",
        transform: hovered ? "scaleY(1.05)" : "scaleY(1)",
        cursor: "pointer",
      }}
      onMouseEnter={interactive ? handleMouseEnter : undefined}
      onMouseLeave={interactive ? handleMouseLeave : undefined}
      onMouseMove={interactive ? handleMouseMove : undefined}
      onClick={interactive ? handleClick : undefined}
    />
  )
})
HoverableBar.displayName = "HoverableBar"

export const HoverableHorizontalBar = memo(function HoverableHorizontalBar({
  bar,
  tooltip,
  isInteractive,
  onMouseEnter,
  onMouseLeave,
  onMouseMove,
  onClick,
}: HoverableBarProps) {
  const [hovered, setHovered] = useState(false)
  const { showTooltipFromEvent, hideTooltip } = useTooltip()

  const getContent = useCallback(() => {
    if (!tooltip) return null
    const { data: barData, ...barWithoutData } = bar
    return createElement(tooltip, { ...barWithoutData, ...(barData ?? {}) })
  }, [bar, tooltip])

  const handleMouseEnter = useCallback((e: React.MouseEvent<SVGRectElement>) => {
    cancelScheduledHide()
    setHovered(true)
    const content = getContent()
    if (content) showTooltipFromEvent(content, e)
    onMouseEnter?.(bar.data, e)
  }, [bar.data, getContent, showTooltipFromEvent, onMouseEnter])

  const handleMouseMove = useCallback((e: React.MouseEvent<SVGRectElement>) => {
    const content = getContent()
    if (content) showTooltipFromEvent(content, e)
    onMouseMove?.(bar.data, e)
  }, [bar.data, getContent, showTooltipFromEvent, onMouseMove])

  const handleMouseLeave = useCallback((e: React.MouseEvent<SVGRectElement>) => {
    setHovered(false)
    scheduleHide(hideTooltip)
    onMouseLeave?.(bar.data, e)
  }, [bar.data, hideTooltip, onMouseLeave])

  const handleClick = useCallback((e: React.MouseEvent<SVGRectElement>) => {
    onClick?.(bar.data, e)
  }, [bar.data, onClick])

  const interactive = isInteractive !== false

  return (
    <rect
      x={bar.x} y={bar.y} width={bar.width} height={bar.height}
      rx={10} ry={10} fill={bar.color as string}
      style={{
        transition: "transform 150ms ease-out",
        transformBox: "fill-box",
        transformOrigin: "left center",
        transform: hovered ? "scaleX(1.05)" : "scaleX(1)",
        cursor: "pointer",
      }}
      onMouseEnter={interactive ? handleMouseEnter : undefined}
      onMouseLeave={interactive ? handleMouseLeave : undefined}
      onMouseMove={interactive ? handleMouseMove : undefined}
      onClick={interactive ? handleClick : undefined}
    />
  )
})
HoverableHorizontalBar.displayName = "HoverableHorizontalBar"
