"use client"

/**
 * Sortable Chart Grid - @dnd-kit based replacement for GridStack
 * 
 * This file provides the components needed to migrate from GridStack to @dnd-kit
 * while keeping the same card structure and visual appearance.
 * 
 * Key features:
 * - Built-in auto-scroll that works reliably (unlike GridStack v6+)
 * - Same drag handle behavior (via GridStackCardDragHandle)
 * - Same card sizing pattern (w: 6|12, h: grid units)
 * - Same persistence pattern (localStorage)
 * 
 * Migration guide:
 * 1. Replace GridStack imports with these imports
 * 2. Wrap chart grid with <SortableGridProvider>
 * 3. Wrap each chart with <SortableGridItem>
 * 4. Remove GridStack initialization useEffect
 * 5. Keep everything else the same
 */

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
    MeasuringStrategy,
    type UniqueIdentifier,
    DragOverlay,
    defaultDropAnimationSideEffects,
    type DropAnimation,
} from "@dnd-kit/core"
import {
    SortableContext,
    arrayMove,
    useSortable,
    rectSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { useIsMobile } from "@/hooks/use-mobile"

// ============================================================================
// Types
// ============================================================================

// Width can be 3-12 grid units (3=25%, 4=33%, 6=50%, 8=66%, 9=75%, 12=100%)
export type GridWidth = 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12

export interface ChartSize {
    w: GridWidth
    h: number
    x?: number
    y?: number
}

export interface SortableGridProviderProps {
    children: React.ReactNode
    chartOrder: string[]
    onOrderChange: (newOrder: string[]) => void
    className?: string
}

export interface SortableGridItemProps {
    id: string
    children: React.ReactNode
    /** Width in grid units: 3=25%, 4=33%, 6=50%, 8=66%, 9=75%, 12=100% */
    w?: GridWidth
    /** Height in grid units (each unit = ~70px) */
    h?: number
    /** Mobile height in grid units (used on mobile devices instead of h) */
    mobileH?: number
    className?: string
    /** Enable resize handle (default: false) */
    resizable?: boolean
    /** Min width constraint */
    minW?: number
    /** Max width constraint */
    maxW?: number
    /** Min height in grid units */
    minH?: number
    /** Max height in grid units */
    maxH?: number
    /** Callback when resize completes */
    onResize?: (id: string, w: GridWidth, h: number) => void
}

// ============================================================================
// Context for drag handle
// ============================================================================

interface DragHandleContextValue {
    setActivatorNodeRef: (element: HTMLElement | null) => void
    listeners: Record<string, Function> | undefined
    attributes: Record<string, any>
    isDragging: boolean
}

const DragHandleContext = React.createContext<DragHandleContextValue | null>(null)

export function useDragHandle() {
    const context = React.useContext(DragHandleContext)
    return context || {
        setActivatorNodeRef: () => { },
        listeners: {},
        attributes: {},
        isDragging: false,
    }
}

// ============================================================================
// SortableGridProvider - wraps the entire chart grid
// ============================================================================

// Cell height constants - smaller on mobile for better fit
const CELL_HEIGHT_MOBILE = 65 // px per grid unit on mobile (increased for taller charts)
const CELL_HEIGHT_DESKTOP = 70 // px per grid unit on desktop

export function SortableGridProvider({
    children,
    chartOrder,
    onOrderChange,
    className = "",
}: SortableGridProviderProps) {
    const isMobile = useIsMobile()
    const cellHeight = isMobile ? CELL_HEIGHT_MOBILE : CELL_HEIGHT_DESKTOP
    const [activeId, setActiveId] = React.useState<UniqueIdentifier | null>(null)

    // Sensors for mouse and touch with small activation threshold
    const mouseSensor = useSensor(MouseSensor, {
        activationConstraint: {
            distance: 8,
        },
    })

    const touchSensor = useSensor(TouchSensor, {
        activationConstraint: {
            delay: 200,
            tolerance: 8,
        },
    })

    const sensors = useSensors(mouseSensor, touchSensor)

    const handleDragStart = React.useCallback((event: DragStartEvent) => {
        setActiveId(event.active.id)
    }, [])

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
    }, [chartOrder, onOrderChange])

    const handleDragCancel = React.useCallback(() => {
        setActiveId(null)
    }, [])

    // Listen for randomize event from settings popover
    React.useEffect(() => {
        const handleRandomize = () => {
            // Shuffle the chartOrder array
            const shuffled = [...chartOrder].sort(() => Math.random() - 0.5)
            onOrderChange(shuffled)
        }

        window.addEventListener('gridstack:randomize', handleRandomize)
        return () => {
            window.removeEventListener('gridstack:randomize', handleRandomize)
        }
    }, [chartOrder, onOrderChange])

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragCancel={handleDragCancel}
            // Auto-scroll configuration - this is the key feature!
            autoScroll={{
                enabled: true,
                threshold: {
                    x: 0.1,
                    y: 0.15, // 15% from edge triggers scroll
                },
                acceleration: 15,
                interval: 5,
            }}
            measuring={{
                droppable: {
                    strategy: MeasuringStrategy.Always,
                },
            }}
        >
            <SortableContext items={chartOrder} strategy={rectSortingStrategy}>
                {/* CSS Grid: 1 column on mobile, 12 columns on desktop */}
                <div
                    className={`grid gap-4 grid-cols-1 md:grid-cols-12 ${className}`}
                    style={{
                        gridAutoFlow: 'row dense', // Pack items densely row by row
                        gridAutoRows: `${cellHeight}px`, // Responsive row height for better mobile fit
                        // Removed grid-template-columns transition - layout properties cause expensive reflows
                    }}
                >
                    {children}
                </div>
            </SortableContext>
        </DndContext>

    )
}

// ============================================================================
// SortableGridItem - wraps each chart card with optional resize
// ============================================================================

// Note: Resize is desktop-only (hidden on mobile), so use desktop cell height
const CELL_HEIGHT = CELL_HEIGHT_DESKTOP // px per grid unit for resize calculations

export function SortableGridItem({
    id,
    children,
    w = 12,
    h = 6,
    mobileH,
    className = "",
    resizable = false,
    minW = 6,
    maxW = 12,
    minH = 4,
    maxH = 12,
    onResize,
}: SortableGridItemProps) {
    const isMobile = useIsMobile()

    // Use mobileH on mobile devices if provided, otherwise fall back to h
    const effectiveH = isMobile && mobileH !== undefined ? mobileH : h

    const {
        attributes,
        listeners,
        setNodeRef,
        setActivatorNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id })

    // Resize state
    const [isResizing, setIsResizing] = React.useState(false)
    const [resizeHeight, setResizeHeight] = React.useState<number | null>(null)
    const [resizeWidth, setResizeWidth] = React.useState<GridWidth | null>(null)
    const containerRef = React.useRef<HTMLDivElement>(null)
    const startPosRef = React.useRef<{ x: number; y: number; w: number; h: number } | null>(null)

    // Current dimensions (resize state or props)
    // Use effectiveH for display, but resize operations work with original h
    const currentH = resizeHeight ?? effectiveH
    const currentW = resizeWidth ?? w

    // Handle resize start
    const handleResizeStart = React.useCallback((e: React.MouseEvent) => {
        e.preventDefault()
        e.stopPropagation()

        const rect = containerRef.current?.getBoundingClientRect()
        if (!rect) return

        startPosRef.current = {
            x: e.clientX,
            y: e.clientY,
            w: currentW,
            h: currentH,
        }
        setIsResizing(true)
    }, [currentW, currentH])

    // Handle resize move
    React.useEffect(() => {
        if (!isResizing) return

        const handleMouseMove = (e: MouseEvent) => {
            if (!startPosRef.current) return

            const deltaY = e.clientY - startPosRef.current.y
            const deltaX = e.clientX - startPosRef.current.x

            // Calculate new height in grid units
            const newHPx = startPosRef.current.h * CELL_HEIGHT + deltaY
            let newH = Math.round(newHPx / CELL_HEIGHT)
            newH = Math.max(minH, Math.min(maxH, newH))

            // Calculate width change - granular from 3 to 12
            // Each grid unit is ~8.33% of container width
            // Use deltaX to calculate proportional width change
            const containerWidth = containerRef.current?.parentElement?.offsetWidth || 800
            const widthPerUnit = containerWidth / 12
            const unitChange = Math.round(deltaX / widthPerUnit)
            let newW = Math.max(3, Math.min(12, startPosRef.current.w + unitChange)) as GridWidth

            // Apply constraints
            if (newW < minW) newW = Math.max(3, minW) as GridWidth
            if (newW > maxW) newW = Math.min(12, maxW) as GridWidth

            setResizeHeight(newH)
            setResizeWidth(newW)
        }

        const handleMouseUp = () => {
            setIsResizing(false)

            // Notify parent of final size
            if (onResize && (resizeHeight !== null || resizeWidth !== null)) {
                onResize(id, resizeWidth ?? w, resizeHeight ?? h)
            }

            // Reset resize state - the parent should update w/h props
            startPosRef.current = null
        }

        document.addEventListener('mousemove', handleMouseMove)
        document.addEventListener('mouseup', handleMouseUp)

        return () => {
            document.removeEventListener('mousemove', handleMouseMove)
            document.removeEventListener('mouseup', handleMouseUp)
        }
    }, [isResizing, id, w, h, minH, maxH, minW, maxW, onResize, resizeHeight, resizeWidth])

    // Apply full transform (both X and Y) during drag
    const adjustedTransform = transform ? {
        x: transform.x,
        y: transform.y,
        scaleX: 1, // Prevent scaling
        scaleY: 1, // Prevent scaling
    } : null

    // Provide drag handle context to children
    const handleContext: DragHandleContextValue = {
        setActivatorNodeRef,
        listeners,
        attributes,
        isDragging,
    }

    return (
        <DragHandleContext.Provider value={handleContext}>
            <div
                ref={(node) => {
                    setNodeRef(node)
                    if (containerRef) {
                        (containerRef as React.MutableRefObject<HTMLDivElement | null>).current = node
                    }
                }}
                style={{
                    // Grid positioning
                    gridRow: `span ${currentH}`,
                    gridColumn: `span ${currentW}`,
                    // Transform for dragging (no scale during drag to avoid weirdness)
                    transform: adjustedTransform ? CSS.Transform.toString(adjustedTransform) : undefined,
                    // NO transition during drag for immediate feedback
                    // Only use GPU-composited properties (transform, opacity, box-shadow)
                    // Removed grid-row/grid-column transitions - they trigger expensive layout recalculations
                    transition: isDragging
                        ? 'none'
                        : isResizing
                            ? 'box-shadow 200ms ease, opacity 200ms ease'
                            : 'transform 200ms ease-out, box-shadow 200ms ease, opacity 200ms ease',
                    // Visual feedback
                    opacity: isDragging ? 0.9 : 1,
                    zIndex: isDragging ? 1000 : isResizing ? 999 : undefined,
                    // Shadow effect based on state
                    boxShadow: isDragging
                        ? '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 2px rgba(var(--primary), 0.3)'
                        : isResizing
                            ? '0 10px 25px -5px rgba(0, 0, 0, 0.15)'
                            : undefined,
                    // GPU acceleration for smoother animations
                    willChange: isDragging || isResizing ? 'transform, opacity' : 'auto',
                }}
                className={`${className} relative group`}
                data-chart-id={id}
            >
                {children}

                {/* Resize handle - southeast corner - hidden on mobile */}
                {resizable && (
                    <div
                        className={`hidden md:block absolute bottom-1 right-1 w-5 h-5 cursor-se-resize z-50 
                                   transition-all duration-200 ease-out
                                   hover:scale-125 hover:opacity-100
                                   ${isResizing ? 'scale-150 opacity-100' : 'opacity-60'}`}
                        onMouseDown={handleResizeStart}
                        title="Drag to resize"
                    >
                        {/* Three diagonal lines like standard resize handle */}
                        <svg
                            width="100%"
                            height="100%"
                            viewBox="0 0 20 20"
                            className="text-muted-foreground/70"
                        >
                            <line x1="14" y1="20" x2="20" y2="14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                            <line x1="10" y1="20" x2="20" y2="10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                            <line x1="6" y1="20" x2="20" y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                        </svg>
                    </div>
                )}

                {/* Resize indicator while resizing - animated border */}
                {isResizing && (
                    <div
                        className="absolute inset-0 border-2 border-primary/60 rounded-lg pointer-events-none z-40 
                                   animate-pulse"
                        style={{
                            boxShadow: '0 0 0 4px rgba(var(--primary), 0.1)',
                        }}
                    />
                )}
            </div>
        </DragHandleContext.Provider>
    )
}

// ============================================================================
// Export arrayMove for convenience
// ============================================================================

export { arrayMove }
