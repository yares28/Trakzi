"use client"

import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { GridStackCardDragHandle } from "@/components/gridstack-card-drag-handle"
import { Skeleton } from "@/components/ui/skeleton"

interface LazyChartProps {
  children: React.ReactNode
  /** Fallback title shown in skeleton state */
  title?: string
  /** Height of the chart container for consistent layout */
  height?: number
  /** Root margin for IntersectionObserver - how far before viewport to start loading */
  rootMargin?: string
  /** Whether to keep the chart mounted after first render (default: true) */
  keepMounted?: boolean
  /** Delay before unmounting when leaving viewport, only when keepMounted=false (default: 2000ms) */
  unmountDelay?: number
}

/**
 * LazyChart - Defers chart rendering until it enters the viewport
 *
 * Uses IntersectionObserver to detect when the chart placeholder
 * is about to become visible, then renders the actual chart.
 * This prevents all 20+ charts from rendering simultaneously on page load.
 */
export const LazyChart = React.memo(function LazyChart({
  children,
  title = "Loading chart...",
  height = 250,
  rootMargin = "200px", // Start loading 200px before entering viewport
  keepMounted = true,
  unmountDelay = 2000, // Delay before unmounting to prevent thrashing during fast scroll
}: LazyChartProps) {
  const [isVisible, setIsVisible] = React.useState(false)
  const [hasRendered, setHasRendered] = React.useState(false)
  const [shouldRender, setShouldRender] = React.useState(false)
  const containerRef = React.useRef<HTMLDivElement>(null)
  const unmountTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  React.useEffect(() => {
    const element = containerRef.current
    if (!element) return

    // If already rendered and keepMounted, skip observer
    if (hasRendered && keepMounted) return

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries
        if (entry.isIntersecting) {
          // Clear any pending unmount timeout
          if (unmountTimeoutRef.current) {
            clearTimeout(unmountTimeoutRef.current)
            unmountTimeoutRef.current = null
          }
          setIsVisible(true)
          setHasRendered(true)
          setShouldRender(true)
          // Disconnect after first intersection if keepMounted
          if (keepMounted) {
            observer.disconnect()
          }
        } else if (!keepMounted) {
          setIsVisible(false)
          // Delay unmount to prevent thrashing during fast scroll
          if (unmountTimeoutRef.current) {
            clearTimeout(unmountTimeoutRef.current)
          }
          unmountTimeoutRef.current = setTimeout(() => {
            setShouldRender(false)
            unmountTimeoutRef.current = null
          }, unmountDelay)
        }
      },
      {
        rootMargin,
        threshold: 0,
      }
    )

    observer.observe(element)

    return () => {
      observer.disconnect()
      if (unmountTimeoutRef.current) {
        clearTimeout(unmountTimeoutRef.current)
      }
    }
  }, [rootMargin, keepMounted, hasRendered, unmountDelay])

  // Show skeleton when:
  // 1. Not visible AND never rendered (initial state)
  // 2. Not visible AND not keeping mounted AND unmount delay has passed (shouldRender is false)
  const showSkeleton = !isVisible && (!hasRendered || (!keepMounted && !shouldRender))

  if (showSkeleton) {
    return (
      <div ref={containerRef} className="h-full w-full">
        <Card className="h-full">
          <CardHeader>
            <div className="flex items-center gap-2">
              <GridStackCardDragHandle />
              <CardTitle>
                <Skeleton className="h-5 w-40" />
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent style={{ height: `${height}px` }}>
            <div className="flex h-full w-full items-center justify-center">
              <div className="space-y-3 w-full">
                <Skeleton className="h-4 w-3/4 mx-auto" />
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-4 w-1/2 mx-auto" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Render actual chart
  return (
    <div ref={containerRef} className="h-full w-full">
      {children}
    </div>
  )
})

LazyChart.displayName = "LazyChart"
