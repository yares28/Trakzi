import type { GridStack } from "gridstack"

/**
 * Custom auto-scroll for GridStack drag operations.
 * 
 * GridStack's native `draggable.scroll: true` doesn't work reliably in v6+.
 * This module provides:
 * 1. Auto-scrolling when dragging near screen edges
 * 2. Prevention of wheel scroll during drag (which causes cursor-card desync)
 * 
 * Key insight: We listen to GridStack's own drag events, NOT mouse events.
 * This ensures we only activate during actual GridStack drags and the
 * dragged element position updates correctly as the page scrolls.
 */
export function attachGridStackAutoScroll(grid: GridStack) {
  const EDGE_THRESHOLD = 100 // pixels from edge to start scrolling
  const MAX_SCROLL_SPEED = 15 // max pixels per frame
  const MIN_SCROLL_SPEED = 3 // min pixels per frame when at threshold edge

  let isDragging = false
  let animationFrameId: number | null = null
  let currentMouseY = 0

  /**
   * Scroll the page based on cursor position near edges.
   * Called in an animation frame loop during drag.
   */
  const scrollTick = () => {
    if (!isDragging) {
      animationFrameId = null
      return
    }

    const viewportHeight = window.innerHeight
    let scrollDelta = 0

    // Near top edge - scroll up
    if (currentMouseY < EDGE_THRESHOLD) {
      const distanceFromEdge = currentMouseY
      const progress = 1 - (distanceFromEdge / EDGE_THRESHOLD)
      scrollDelta = -Math.round(MIN_SCROLL_SPEED + (MAX_SCROLL_SPEED - MIN_SCROLL_SPEED) * progress)
    }
    // Near bottom edge - scroll down  
    else if (currentMouseY > viewportHeight - EDGE_THRESHOLD) {
      const distanceFromEdge = viewportHeight - currentMouseY
      const progress = 1 - (distanceFromEdge / EDGE_THRESHOLD)
      scrollDelta = Math.round(MIN_SCROLL_SPEED + (MAX_SCROLL_SPEED - MIN_SCROLL_SPEED) * progress)
    }

    if (scrollDelta !== 0) {
      window.scrollBy(0, scrollDelta)
    }

    // Continue the loop
    animationFrameId = requestAnimationFrame(scrollTick)
  }

  /**
   * Track mouse position during drag.
   * We need this because GridStack drag events don't always include coordinates.
   */
  const handleMouseMove = (event: MouseEvent) => {
    currentMouseY = event.clientY
  }

  /**
   * Prevent wheel scroll during drag.
   * When user scrolls with wheel during drag, the card loses sync with cursor.
   */
  const handleWheel = (event: WheelEvent) => {
    if (!isDragging) return
    event.preventDefault()
    event.stopPropagation()
  }

  /**
   * Called when GridStack starts a drag operation.
   */
  const handleDragStart = (event: Event) => {
    isDragging = true

    // Get initial cursor position from the event if available
    const mouseEvent = event as MouseEvent
    if (typeof mouseEvent.clientY === 'number') {
      currentMouseY = mouseEvent.clientY
    }

    // Start tracking mouse movement
    document.addEventListener("mousemove", handleMouseMove, { passive: true })

    // Block wheel scroll during drag
    document.addEventListener("wheel", handleWheel, { passive: false, capture: true })

    // Start the scroll animation loop
    if (animationFrameId === null) {
      animationFrameId = requestAnimationFrame(scrollTick)
    }
  }

  /**
   * Called when GridStack ends a drag operation.
   */
  const handleDragStop = () => {
    isDragging = false

    // Stop tracking mouse
    document.removeEventListener("mousemove", handleMouseMove)

    // Remove wheel block
    document.removeEventListener("wheel", handleWheel, true)

    // Stop animation loop
    if (animationFrameId !== null) {
      cancelAnimationFrame(animationFrameId)
      animationFrameId = null
    }
  }

  /**
   * Fallback: ensure drag state is cleaned up on any mouseup.
   * Sometimes GridStack's dragstop event doesn't fire properly.
   */
  const handleMouseUp = () => {
    if (isDragging) {
      // Small delay to let GridStack's dragstop fire first if it will
      setTimeout(() => {
        if (isDragging) {
          handleDragStop()
        }
      }, 50)
    }
  }

  // Subscribe to GridStack's drag events
  grid.on("dragstart", handleDragStart)
  grid.on("dragstop", handleDragStop)

  // Backup mouseup listener
  document.addEventListener("mouseup", handleMouseUp, { passive: true })

  // Return cleanup function
  return () => {
    grid.off("dragstart")
    grid.off("dragstop")
    document.removeEventListener("mouseup", handleMouseUp)
    document.removeEventListener("mousemove", handleMouseMove)
    document.removeEventListener("wheel", handleWheel, true)

    if (animationFrameId !== null) {
      cancelAnimationFrame(animationFrameId)
      animationFrameId = null
    }

    isDragging = false
  }
}
