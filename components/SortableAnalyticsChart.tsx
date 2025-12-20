"use client"

import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { ReactNode } from "react"

interface SortableAnalyticsChartProps {
  id: string
  className?: string
  children: ReactNode
}

export function SortableAnalyticsChart({ id, className, children }: SortableAnalyticsChartProps) {
  const { transform, transition, setNodeRef, isDragging } = useSortable({ id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div ref={setNodeRef} style={style} className={className}>
      {children}
    </div>
  )
}

































