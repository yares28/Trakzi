"use client"

import * as React from "react"
import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"

interface SortableAnalyticsChartProps {
  id: string
  children: React.ReactNode
  className?: string
}

export function SortableAnalyticsChart({ id, children, className }: SortableAnalyticsChartProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id })

  // Store the last non-null transform to prevent snap-back during re-renders
  const lastTransformRef = React.useRef<string | null>(null)
  const transformString = CSS.Transform.toString(transform)
  
  // Always update the ref when we have a transform
  if (transformString) {
    lastTransformRef.current = transformString
  }

  // During transitions, preserve the transform even if it becomes null temporarily
  // This prevents the snap-back effect when React re-renders with new order
  const effectiveTransform = transformString || (transition ? lastTransformRef.current : null)

  // Clear the ref when transition completes and we're not dragging
  React.useEffect(() => {
    if (!transition && !isDragging && !transformString) {
      // Small delay to ensure animation is fully complete
      const timer = setTimeout(() => {
        lastTransformRef.current = null
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [transition, isDragging, transformString])

  const style: React.CSSProperties = {
    transform: effectiveTransform || undefined,
    transition: transition || undefined,
    cursor: isDragging ? "grabbing" : "grab",
    opacity: isDragging ? 0.96 : 1,
  }

  return (
    <div ref={setNodeRef} style={style} className={className} {...attributes} {...listeners}>
      {children}
    </div>
  )
}


