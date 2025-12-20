import type { GridStack } from "gridstack"

type GridStackAutoScrollOptions = {
  edgeThreshold?: number
  maxScrollStep?: number
  dragHandleSelector?: string
}

export function attachGridStackAutoScroll(
  grid: GridStack,
  options: GridStackAutoScrollOptions = {}
) {
  const dragHandleSelector =
    options.dragHandleSelector ??
    grid.opts.draggable?.handle ??
    ".grid-stack-item-content"
  const edgeThreshold = options.edgeThreshold ?? 100 // Increased from 80
  const maxScrollStep = options.maxScrollStep ?? 20

  let rafId: number | null = null
  let isDragging = false
  let lastMouseY: number = 0
  let wheelListenerAttached = false

  // Handle wheel events during drag - prevent the wheel scroll from
  // interfering with the drag operation
  const handleWheel = (event: WheelEvent) => {
    if (!isDragging) return
    event.preventDefault()
    event.stopPropagation()
  }

  const attachWheelListener = () => {
    if (wheelListenerAttached) return
    wheelListenerAttached = true
    document.addEventListener("wheel", handleWheel, { passive: false, capture: true })
  }

  const detachWheelListener = () => {
    if (!wheelListenerAttached) return
    wheelListenerAttached = false
    document.removeEventListener("wheel", handleWheel, true)
  }

  // Track mouse position globally during drag
  const handleMouseMove = (event: MouseEvent) => {
    if (!isDragging) return
    lastMouseY = event.clientY
  }

  const tick = () => {
    if (!isDragging) {
      rafId = null
      return
    }

    const viewportHeight = window.innerHeight
    const mouseY = lastMouseY

    let delta = 0

    // Near top edge - scroll up
    if (mouseY < edgeThreshold && mouseY > 0) {
      // Calculate scroll speed based on distance to edge
      const distanceToEdge = mouseY
      const speedFactor = 1 - (distanceToEdge / edgeThreshold)
      delta = -Math.round(maxScrollStep * speedFactor)
    }
    // Near bottom edge - scroll down
    else if (mouseY > viewportHeight - edgeThreshold && mouseY < viewportHeight) {
      const distanceToEdge = viewportHeight - mouseY
      const speedFactor = 1 - (distanceToEdge / edgeThreshold)
      delta = Math.round(maxScrollStep * speedFactor)
    }

    if (delta !== 0) {
      window.scrollBy({ top: delta, left: 0, behavior: "auto" })
    }

    rafId = requestAnimationFrame(tick)
  }

  const startAutoScroll = () => {
    if (isDragging) return
    isDragging = true
    attachWheelListener()
    document.addEventListener("mousemove", handleMouseMove, { passive: true })
    if (rafId === null) {
      rafId = requestAnimationFrame(tick)
    }
  }

  const stopAutoScroll = () => {
    isDragging = false
    detachWheelListener()
    document.removeEventListener("mousemove", handleMouseMove)
    if (rafId !== null) {
      cancelAnimationFrame(rafId)
      rafId = null
    }
  }

  // GridStack drag events
  const handleDragStart = (event: Event) => {
    // Get initial mouse position from event if available
    if ("clientY" in event) {
      lastMouseY = (event as MouseEvent).clientY
    }
    startAutoScroll()
  }

  const handleDragStop = () => {
    stopAutoScroll()
  }

  // Attach GridStack event listeners
  grid.on("dragstart", handleDragStart)
  grid.on("dragstop", handleDragStop)

  // Cleanup function
  return () => {
    grid.off("dragstart")
    grid.off("dragstop")
    stopAutoScroll()
  }
}
