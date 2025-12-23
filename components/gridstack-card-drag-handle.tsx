"use client"

import { IconGripVertical } from "@tabler/icons-react"
import { useDragHandle } from "./sortable-grid"

/**
 * Drag handle for chart cards.
 * 
 * Works with both:
 * - GridStack (via CSS class "gridstack-drag-handle") - legacy
 * - @dnd-kit/sortable (via SortableGridItem context) - new
 * 
 * The handle automatically detects which system is in use and attaches
 * the appropriate event handlers.
 * 
 * Hidden on mobile (md:hidden) since dragging is disabled on small screens.
 */
export function GridStackCardDragHandle() {
  // Get @dnd-kit drag handle props (will be no-op if not in SortableGridItem)
  const { setActivatorNodeRef, listeners, attributes, isDragging } = useDragHandle()

  return (
    <span
      ref={setActivatorNodeRef}
      className="gridstack-drag-handle hidden md:inline-flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background touch-none select-none"
      style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
      role="button"
      tabIndex={0}
      aria-label="Drag card"
      title="Drag card"
      {...attributes}
      {...listeners}
    >
      <IconGripVertical className="h-4 w-4" aria-hidden="true" />
    </span>
  )
}
