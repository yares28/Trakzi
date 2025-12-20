import type { GridStack } from "gridstack"

type GridStackAutoScrollOptions = {
  edgeThreshold?: number
  maxScrollStep?: number
  dragHandleSelector?: string
}

type DragEventWithClient = Event & { clientX?: number; clientY?: number }

function findScrollContainer(element: HTMLElement | null) {
  const overflowRegex = /(auto|scroll)/
  let current: HTMLElement | null = element

  while (current) {
    const style = getComputedStyle(current)
    if (overflowRegex.test(`${style.overflow}${style.overflowY}`)) {
      return current
    }
    current = current.parentElement
  }

  return document.scrollingElement || document.documentElement
}

function toDragEvent(event: Event): DragEventWithClient | null {
  if ("clientY" in event) return event as DragEventWithClient
  return null
}

export function attachGridStackAutoScroll(
  grid: GridStack,
  options: GridStackAutoScrollOptions = {}
) {
  const dragHandleSelector =
    options.dragHandleSelector ??
    grid.opts.draggable?.handle ??
    ".grid-stack-item-content"
  const edgeThreshold = options.edgeThreshold ?? 80
  const maxScrollStep = options.maxScrollStep ?? 28
  const scrollContainer = findScrollContainer(grid.el)
  const moveThreshold = 3
  let rafId: number | null = null
  let isDragging = false
  let pendingStart = false
  let lastEvent: DragEventWithClient | null = null
  let lastClientX: number | null = null
  let lastClientY: number | null = null
  let startClientX: number | null = null
  let startClientY: number | null = null
  let listenersAttached = false

  const maybeStart = (clientX: number, clientY: number) => {
    if (!pendingStart || isDragging) return
    if (startClientX === null || startClientY === null) return
    const distance =
      Math.abs(clientX - startClientX) + Math.abs(clientY - startClientY)
    if (distance <= moveThreshold) return
    start()
  }

  const updateFromMouse = (event: MouseEvent) => {
    lastClientX = event.clientX
    lastClientY = event.clientY
    maybeStart(event.clientX, event.clientY)
  }

  const updateFromPointer = (event: PointerEvent) => {
    lastClientX = event.clientX
    lastClientY = event.clientY
    maybeStart(event.clientX, event.clientY)
  }

  const updateFromTouch = (event: TouchEvent) => {
    if (event.touches.length === 0) return
    const touch = event.touches[0]
    lastClientX = touch.clientX
    lastClientY = touch.clientY
    maybeStart(touch.clientX, touch.clientY)
  }

  const attachMoveListeners = () => {
    if (listenersAttached) return
    listenersAttached = true
    document.addEventListener("mousemove", updateFromMouse, { passive: true })
    document.addEventListener("pointermove", updateFromPointer, { passive: true })
    document.addEventListener("touchmove", updateFromTouch, { passive: true })
  }

  const detachMoveListeners = () => {
    if (!listenersAttached) return
    listenersAttached = false
    document.removeEventListener("mousemove", updateFromMouse)
    document.removeEventListener("pointermove", updateFromPointer)
    document.removeEventListener("touchmove", updateFromTouch)
  }

  const stop = () => {
    isDragging = false
    pendingStart = false
    lastEvent = null
    lastClientX = null
    lastClientY = null
    startClientX = null
    startClientY = null
    detachMoveListeners()
    if (rafId !== null) {
      cancelAnimationFrame(rafId)
      rafId = null
    }
  }

  const start = () => {
    if (isDragging) return
    isDragging = true
    pendingStart = false
    attachMoveListeners()
    if (rafId === null) {
      rafId = requestAnimationFrame(tick)
    }
  }

  const tick = () => {
    if (!isDragging || (lastEvent === null && lastClientY === null)) {
      stop()
      return
    }

    const viewportHeight =
      scrollContainer === document.scrollingElement
        ? window.innerHeight || document.documentElement.clientHeight
        : scrollContainer.clientHeight
    const containerTop =
      scrollContainer === document.scrollingElement
        ? 0
        : scrollContainer.getBoundingClientRect().top
    const clientY =
      (lastClientY ?? lastEvent?.clientY ?? viewportHeight / 2) - containerTop
    let delta = 0

    if (clientY < edgeThreshold) {
      delta = -Math.min(maxScrollStep, edgeThreshold - clientY)
    } else if (clientY > viewportHeight - edgeThreshold) {
      delta = Math.min(maxScrollStep, clientY - (viewportHeight - edgeThreshold))
    }

    if (delta !== 0) {
      if (scrollContainer === document.scrollingElement) {
        window.scrollBy({ top: delta, left: 0, behavior: "auto" })
      } else {
        scrollContainer.scrollTop += delta
      }
    }

    rafId = requestAnimationFrame(tick)
  }

  const handleDragStart = (event: Event) => {
    lastEvent = toDragEvent(event)
    if (lastEvent?.clientX !== undefined) {
      lastClientX = lastEvent.clientX
    }
    if (lastEvent?.clientY !== undefined) {
      lastClientY = lastEvent.clientY
    }
    start()
  }

  const handleDrag = (event: Event) => {
    if (!isDragging) return
    lastEvent = toDragEvent(event)
    if (lastEvent?.clientX !== undefined) {
      lastClientX = lastEvent.clientX
    }
    if (lastEvent?.clientY !== undefined) {
      lastClientY = lastEvent.clientY
    }
    if (rafId === null) {
      rafId = requestAnimationFrame(tick)
    }
  }

  const handleDragStop = () => {
    stop()
  }

  const handlePointerDown = (event: MouseEvent | TouchEvent) => {
    if ("button" in event && event.button !== 0) return
    const target = event.target as HTMLElement | null
    if (!target) return
    if (dragHandleSelector && !target.closest(dragHandleSelector)) return

    pendingStart = true
    if ("touches" in event) {
      if (event.touches.length === 0) return
      const touch = event.touches[0]
      startClientX = touch.clientX
      startClientY = touch.clientY
      lastClientX = touch.clientX
      lastClientY = touch.clientY
    } else {
      startClientX = event.clientX
      startClientY = event.clientY
      lastClientX = event.clientX
      lastClientY = event.clientY
    }
    attachMoveListeners()
  }

  const handlePointerUp = () => {
    stop()
  }

  grid.on("dragstart", handleDragStart)
  grid.on("drag", handleDrag)
  grid.on("dragstop", handleDragStop)
  grid.el.addEventListener("mousedown", handlePointerDown)
  grid.el.addEventListener("touchstart", handlePointerDown, { passive: true })
  document.addEventListener("mouseup", handlePointerUp, true)
  document.addEventListener("touchend", handlePointerUp, true)
  document.addEventListener("touchcancel", handlePointerUp, true)

  return () => {
    grid.off("dragstart")
    grid.off("drag")
    grid.off("dragstop")
    grid.el.removeEventListener("mousedown", handlePointerDown)
    grid.el.removeEventListener("touchstart", handlePointerDown)
    document.removeEventListener("mouseup", handlePointerUp, true)
    document.removeEventListener("touchend", handlePointerUp, true)
    document.removeEventListener("touchcancel", handlePointerUp, true)
    stop()
  }
}
