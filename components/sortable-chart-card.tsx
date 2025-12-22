"use client"

import * as React from "react"
import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"

interface SortableChartCardProps {
    id: string
    children: React.ReactNode
    className?: string
    /** Width in grid units (6 = half, 12 = full) */
    gridWidth?: 6 | 12
    /** Height in grid units (each unit = 70px) */
    gridHeight?: number
    /** Whether to use drag handle (recommended for cards with interactive content) */
    useDragHandle?: boolean
}

/**
 * Wrapper component for sortable chart cards using @dnd-kit.
 * 
 * This replaces GridStack's drag functionality with @dnd-kit's sortable,
 * which has proper auto-scroll support when dragging near viewport edges.
 * 
 * Usage:
 * ```tsx
 * <SortableChartCard id="chartId" gridWidth={6} gridHeight={10}>
 *   <YourChartComponent />
 * </SortableChartCard>
 * ```
 */
export function SortableChartCard({
    id,
    children,
    className = "",
    gridWidth = 12,
    gridHeight = 6,
    useDragHandle = true,
}: SortableChartCardProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
        setActivatorNodeRef,
    } = useSortable({
        id,
        // Use a custom drag handle if specified
        ...(useDragHandle ? {} : {}),
    })

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

    // Calculate height based on grid units (70px per unit)
    const pixelHeight = gridHeight * 70

    const style: React.CSSProperties = {
        transform: effectiveTransform || undefined,
        transition: transition || undefined,
        opacity: isDragging ? 0.96 : 1,
        zIndex: isDragging ? 1000 : undefined,
        position: "relative",
        // Grid sizing
        height: `${pixelHeight}px`,
    }

    // Width classes based on grid width
    const widthClass = gridWidth === 12
        ? "w-full"
        : "w-full md:w-[calc(50%-8px)]"

    // If using drag handle, don't spread listeners to the container
    // Instead, we'll provide a ref setter for the drag handle
    if (useDragHandle) {
        return (
            <SortableChartCardContext.Provider value={{
                dragHandleRef: setActivatorNodeRef,
                dragHandleListeners: listeners,
                dragHandleAttributes: attributes,
                isDragging,
            }}>
                <div
                    ref={setNodeRef}
                    style={style}
                    className={`${widthClass} ${className}`}
                    data-chart-id={id}
                >
                    {children}
                </div>
            </SortableChartCardContext.Provider>
        )
    }

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`${widthClass} ${className}`}
            data-chart-id={id}
            {...attributes}
            {...listeners}
        >
            {children}
        </div>
    )
}

// Context for passing drag handle props to child components
interface SortableChartCardContextValue {
    dragHandleRef: (element: HTMLElement | null) => void
    dragHandleListeners: ReturnType<typeof useSortable>["listeners"]
    dragHandleAttributes: ReturnType<typeof useSortable>["attributes"]
    isDragging: boolean
}

const SortableChartCardContext = React.createContext<SortableChartCardContextValue | null>(null)

/**
 * Hook to access drag handle props from within a SortableChartCard.
 * Use this in your drag handle component.
 */
export function useSortableChartCardDragHandle() {
    const context = React.useContext(SortableChartCardContext)
    if (!context) {
        // Return no-op values if not inside a SortableChartCard
        return {
            ref: () => { },
            listeners: {},
            attributes: {},
            isDragging: false,
        }
    }
    return {
        ref: context.dragHandleRef,
        listeners: context.dragHandleListeners,
        attributes: context.dragHandleAttributes,
        isDragging: context.isDragging,
    }
}

/**
 * Drag handle component that works with SortableChartCard.
 * This is a drop-in replacement for GridStackCardDragHandle.
 */
export function SortableCardDragHandle({ className = "" }: { className?: string }) {
    const { ref, listeners, attributes, isDragging } = useSortableChartCardDragHandle()

    return (
        <button
            ref={ref}
            type="button"
            className={`
        flex h-8 w-8 items-center justify-center rounded-md 
        text-muted-foreground hover:text-foreground hover:bg-muted/50
        focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring
        touch-none
        ${isDragging ? "cursor-grabbing" : "cursor-grab"}
        ${className}
      `}
            aria-label="Drag to reorder"
            {...attributes}
            {...listeners}
        >
            <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            >
                <circle cx="9" cy="5" r="1" />
                <circle cx="9" cy="12" r="1" />
                <circle cx="9" cy="19" r="1" />
                <circle cx="15" cy="5" r="1" />
                <circle cx="15" cy="12" r="1" />
                <circle cx="15" cy="19" r="1" />
            </svg>
        </button>
    )
}
