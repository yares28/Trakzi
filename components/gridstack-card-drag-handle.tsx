"use client"

import { IconGripVertical } from "@tabler/icons-react"

export function GridStackCardDragHandle() {
  return (
    <span
      className="gridstack-drag-handle inline-flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background cursor-grab active:cursor-grabbing"
      role="button"
      tabIndex={0}
      aria-label="Drag card"
      title="Drag card"
    >
      <IconGripVertical className="h-4 w-4" aria-hidden="true" />
    </span>
  )
}
