import type { GridStack } from "gridstack"

/**
 * Custom auto-scroll for GridStack drag operations.
 * 
 * GridStack's native `draggable.scroll: true` doesn't work reliably in v6+.
 * This module provides:
 * 1. Auto-scrolling when dragging near screen edges
 * 2. Prevention of wheel scroll during drag (which causes cursor-card desync)
 * 
 * KEY FIX: After scrolling, we dispatch a synthetic mousemove event to force
 * GridStack to recalculate the dragged element's position. Without this,
 * the card would "stay behind" when the page scrolls because GridStack
 * uses clientY (viewport-relative) for positioning.
 */
export function attachGridStackAutoScroll(grid: GridStack) {
  const EDGE_THRESHOLD = 100 // pixels from edge to start scrolling
  const MAX_SCROLL_SPEED = 12 // max pixels per frame
  const MIN_SCROLL_SPEED = 2 // min pixels per frame when at threshold edge

  let isDragging = false
  let animationFrameId: number | null = null
  let currentMouseX = 0
  let currentMouseY = 0

  /**
   * Dispatch a synthetic mousemove event at the current cursor position.
   * This forces GridStack to recalculate the dragged element's position
   * after we've scrolled the page.
   */
  const dispatchSyntheticMouseMove = () => {
    const event = new MouseEvent('mousemove', {
      bubbles: true,
      cancelable: true,
      clientX: currentMouseX,
      clientY: currentMouseY,
      screenX: currentMouseX,
      screenY: currentMouseY,
    })
    document.dispatchEvent(event)
  }

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
    if (currentMouseY < EDGE_THRESHOLD && currentMouseY >= 0) {
      const distanceFromEdge = currentMouseY
      const progress = 1 - (distanceFromEdge / EDGE_THRESHOLD)
      scrollDelta = -Math.round(MIN_SCROLL_SPEED + (MAX_SCROLL_SPEED - MIN_SCROLL_SPEED) * progress)
    }
    // Near bottom edge - scroll down  
    else if (currentMouseY > viewportHeight - EDGE_THRESHOLD && currentMouseY <= viewportHeight) {
      const distanceFromEdge = viewportHeight - currentMouseY
      const progress = 1 - (distanceFromEdge / EDGE_THRESHOLD)
      scrollDelta = Math.round(MIN_SCROLL_SPEED + (MAX_SCROLL_SPEED - MIN_SCROLL_SPEED) * progress)
    }

    if (scrollDelta !== 0) {
      // Check if we can actually scroll (not at top/bottom of page)
      const currentScroll = window.scrollY
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight

      if ((scrollDelta < 0 && currentScroll > 0) || (scrollDelta > 0 && currentScroll < maxScroll)) {
        window.scrollBy(0, scrollDelta)

        // CRITICAL: Dispatch synthetic mousemove to update GridStack's drag position
        // This makes the card follow the scroll instead of staying behind
        dispatchSyntheticMouseMove()
      }
    }

    // Continue the loop
    animationFrameId = requestAnimationFrame(scrollTick)
  }

  /**
   * Track mouse position during drag.
   */
  const handleMouseMove = (event: MouseEvent) => {
    currentMouseX = event.clientX
    currentMouseY = event.clientY
  }

  /**
   * Prevent wheel scroll during drag.
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
    if (typeof mouseEvent.clientX === 'number') {
      currentMouseX = mouseEvent.clientX
    }
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
   */
  const handleMouseUp = () => {
    if (isDragging) {
      // Small delay to let GridStack's dragstop fire first
      setTimeout(() => {
        if (isDragging) {
          handleDragStop()
        }
      }, 100)
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
