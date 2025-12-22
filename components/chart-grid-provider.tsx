"use client"

import * as React from "react"
import {
    DndContext,
    closestCenter,
    MouseSensor,
    TouchSensor,
    useSensor,
    useSensors,
    type DragEndEvent,
    type DragStartEvent,
    type DragMoveEvent,
    MeasuringStrategy,
    type UniqueIdentifier,
} from "@dnd-kit/core"
import {
    SortableContext,
    arrayMove,
    rectSortingStrategy,
    verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { restrictToWindowEdges } from "@dnd-kit/modifiers"

interface ChartGridProviderProps {
    children: React.ReactNode
    /** Array of chart IDs in display order */
    chartOrder: string[]
    /** Callback when order changes */
    onOrderChange: (newOrder: string[]) => void
    /** Layout mode: 'grid' for 2-column, 'list' for single column */
    layout?: "grid" | "list"
    /** Optional callback when drag starts */
    onDragStart?: (event: DragStartEvent) => void
    /** Optional callback when drag ends */
    onDragEnd?: (event: DragEndEvent) => void
    /** Optional class name for the grid container */
    className?: string
}

/**
 * Provider component for chart drag-and-drop grid.
 * 
 * This wraps your chart cards with DndContext and SortableContext,
 * enabling drag-to-reorder with auto-scroll support.
 * 
 * Features:
 * - Auto-scroll when dragging near viewport edges (built into @dnd-kit)
 * - Supports both grid (2-column) and list layouts
 * - Mouse and touch sensors with activation delay
 * - Persists order via callback
 * 
 * Usage:
 * ```tsx
 * <ChartGridProvider
 *   chartOrder={chartOrder}
 *   onOrderChange={setChartOrder}
 *   layout="grid"
 * >
 *   {chartOrder.map(id => (
 *     <SortableChartCard key={id} id={id}>
 *       <YourChart />
 *     </SortableChartCard>
 *   ))}
 * </ChartGridProvider>
 * ```
 */
export function ChartGridProvider({
    children,
    chartOrder,
    onOrderChange,
    layout = "grid",
    onDragStart,
    onDragEnd,
    className = "",
}: ChartGridProviderProps) {
    const [activeId, setActiveId] = React.useState<UniqueIdentifier | null>(null)

    // Configure sensors with activation constraints
    const mouseSensor = useSensor(MouseSensor, {
        activationConstraint: {
            // Small distance to start drag (prevents accidental drags)
            distance: 5,
        },
    })

    const touchSensor = useSensor(TouchSensor, {
        activationConstraint: {
            // Delay for touch to distinguish from scroll
            delay: 150,
            tolerance: 5,
        },
    })

    const sensors = useSensors(mouseSensor, touchSensor)

    // Handle drag start
    const handleDragStart = React.useCallback((event: DragStartEvent) => {
        setActiveId(event.active.id)
        onDragStart?.(event)
    }, [onDragStart])

    // Handle drag end - reorder items
    const handleDragEnd = React.useCallback((event: DragEndEvent) => {
        const { active, over } = event
        setActiveId(null)

        if (over && active.id !== over.id) {
            const oldIndex = chartOrder.indexOf(String(active.id))
            const newIndex = chartOrder.indexOf(String(over.id))

            if (oldIndex !== -1 && newIndex !== -1) {
                const newOrder = arrayMove(chartOrder, oldIndex, newIndex)
                onOrderChange(newOrder)
            }
        }

        onDragEnd?.(event)
    }, [chartOrder, onOrderChange, onDragEnd])

    // Choose sorting strategy based on layout
    const sortingStrategy = layout === "grid"
        ? rectSortingStrategy
        : verticalListSortingStrategy

    // Grid container classes
    const containerClass = layout === "grid"
        ? "flex flex-wrap gap-4"
        : "flex flex-col gap-4"

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            // Enable auto-scroll by default (built into DndContext)
            autoScroll={{
                enabled: true,
                threshold: {
                    // Start scrolling when within 80px of edge
                    x: 0.1,
                    y: 0.1,
                },
                acceleration: 10,
                interval: 5,
            }}
            // Measure during drag for accurate positioning
            measuring={{
                droppable: {
                    strategy: MeasuringStrategy.Always,
                },
            }}
        >
            <SortableContext items={chartOrder} strategy={sortingStrategy}>
                <div className={`${containerClass} ${className}`}>
                    {children}
                </div>
            </SortableContext>
        </DndContext>
    )
}

export { arrayMove }
