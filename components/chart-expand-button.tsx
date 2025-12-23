"use client"

import { IconArrowsMaximize } from "@tabler/icons-react"
import { Button } from "@/components/ui/button"

interface ChartExpandButtonProps {
    onClick: () => void
    className?: string
}

/**
 * Expand button for chart cards - visible on mobile only.
 * Opens chart in fullscreen modal for better viewing.
 */
export function ChartExpandButton({ onClick, className = "" }: ChartExpandButtonProps) {
    return (
        <Button
            variant="ghost"
            size="icon"
            onClick={onClick}
            className={`md:hidden h-8 w-8 flex-shrink-0 text-muted-foreground hover:text-primary hover:bg-primary/10 ${className}`}
            aria-label="Expand chart"
            title="Expand chart"
        >
            <IconArrowsMaximize className="h-4 w-4" />
        </Button>
    )
}
