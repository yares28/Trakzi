import type { GridStack } from "gridstack"

/**
 * Auto-scroll for GridStack drag operations with cursor sync.
 * 
 * When dragging near viewport edges, this scrolls the window and dispatches
 * pointer events to keep the dragged card synced with the cursor position.
 */
export function attachGridStackAutoScroll(grid: GridStack) {
  const EDGE_THRESHOLD = 100 // pixels from edge to start scrolling
  const MAX_SCROLL_SPEED = 15
  const MIN_SCROLL_SPEED = 4

  let isDragging = false
  let animationFrameId: number | null = null
  let currentMouseX = 0
  let currentMouseY = 0
  let draggedElement: HTMLElement | null = null

  // Track mouse position globally during drag
  const handleMouseMove = (event: MouseEvent) => {
    currentMouseX = event.clientX
    currentMouseY = event.clientY
  }

  // Force GridStack to update the dragged element's position
  const syncDraggedElement = () => {
    if (!draggedElement) return

    // Dispatch a pointermove event to trigger GridStack's internal position update
    const event = new PointerEvent("pointermove", {
      bubbles: true,
      cancelable: true,
      clientX: currentMouseX,
      clientY: currentMouseY,
      pointerType: "mouse",
      isPrimary: true,
    })
    draggedElement.dispatchEvent(event)
  }

  // Scroll loop - runs during drag
  const scrollLoop = () => {
    if (!isDragging) {
      animationFrameId = null
      return
    }

    const viewportHeight = window.innerHeight
    let scrollDelta = 0

    // Near top edge - scroll up
    if (currentMouseY < EDGE_THRESHOLD && currentMouseY >= 0) {
      const intensity = 1 - (currentMouseY / EDGE_THRESHOLD)
      scrollDelta = -Math.round(MIN_SCROLL_SPEED + (MAX_SCROLL_SPEED - MIN_SCROLL_SPEED) * intensity)
    }
    // Near bottom edge - scroll down  
    else if (currentMouseY > viewportHeight - EDGE_THRESHOLD && currentMouseY <= viewportHeight) {
      const intensity = 1 - ((viewportHeight - currentMouseY) / EDGE_THRESHOLD)
      scrollDelta = Math.round(MIN_SCROLL_SPEED + (MAX_SCROLL_SPEED - MIN_SCROLL_SPEED) * intensity)
    }

    if (scrollDelta !== 0) {
      const currentScroll = window.scrollY
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight

      // Only scroll if we can scroll in that direction
      if ((scrollDelta < 0 && currentScroll > 0) || (scrollDelta > 0 && currentScroll < maxScroll)) {
        window.scrollBy(0, scrollDelta)

        // After scrolling, sync the dragged element to follow the cursor
        syncDraggedElement()
      }
    }

    animationFrameId = requestAnimationFrame(scrollLoop)
  }

  // Block wheel scroll during drag to prevent desync
  const handleWheel = (event: WheelEvent) => {
    if (!isDragging) return
    event.preventDefault()
    event.stopPropagation()
  }

  const handleDragStart = (event: Event, el: { el?: HTMLElement }) => {
    isDragging = true
    draggedElement = el?.el || null

    // Get initial cursor position from the event if available
    const mouseEvent = event as MouseEvent
    if (typeof mouseEvent.clientX === "number") currentMouseX = mouseEvent.clientX
    if (typeof mouseEvent.clientY === "number") currentMouseY = mouseEvent.clientY

    document.addEventListener("mousemove", handleMouseMove, { passive: true })
    document.addEventListener("wheel", handleWheel, { passive: false, capture: true })

    if (animationFrameId === null) {
      animationFrameId = requestAnimationFrame(scrollLoop)
    }
  }

  const handleDragStop = () => {
    isDragging = false
    draggedElement = null

    document.removeEventListener("mousemove", handleMouseMove)
    document.removeEventListener("wheel", handleWheel, true)

    if (animationFrameId !== null) {
      cancelAnimationFrame(animationFrameId)
      animationFrameId = null
    }
  }

  // Safety: also stop on mouseup in case dragstop doesn't fire
  const handleMouseUp = () => {
    if (isDragging) {
      setTimeout(handleDragStop, 50)
    }
  }

  // Attach to GridStack events
  grid.on("dragstart", handleDragStart as Parameters<typeof grid.on>[1])
  grid.on("dragstop", handleDragStop)
  document.addEventListener("mouseup", handleMouseUp, { passive: true })

  // Cleanup function
  return () => {
    grid.off("dragstart")
    grid.off("dragstop")
    document.removeEventListener("mouseup", handleMouseUp)
    document.removeEventListener("mousemove", handleMouseMove)
    document.removeEventListener("wheel", handleWheel, true)
    if (animationFrameId !== null) {
      cancelAnimationFrame(animationFrameId)
    }
  }
}
