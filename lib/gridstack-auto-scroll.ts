import type { GridStack } from "gridstack"

type GridStackAutoScrollOptions = {
  edgeThreshold?: number
  maxScrollStep?: number
}

type DragEventWithClient = Event & { clientY?: number }

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
  const edgeThreshold = options.edgeThreshold ?? 80
  const maxScrollStep = options.maxScrollStep ?? 28
  const scrollContainer = findScrollContainer(grid.el)
  let rafId: number | null = null
  let isDragging = false
  let lastEvent: DragEventWithClient | null = null

  const stop = () => {
    isDragging = false
    lastEvent = null
    if (rafId !== null) {
      cancelAnimationFrame(rafId)
      rafId = null
    }
  }

  const tick = () => {
    if (!isDragging || !lastEvent) {
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
    const clientY = (lastEvent.clientY ?? viewportHeight / 2) - containerTop
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
    isDragging = true
    lastEvent = toDragEvent(event)
    if (rafId === null) {
      rafId = requestAnimationFrame(tick)
    }
  }

  const handleDrag = (event: Event) => {
    if (!isDragging) return
    lastEvent = toDragEvent(event)
    if (rafId === null) {
      rafId = requestAnimationFrame(tick)
    }
  }

  const handleDragStop = () => {
    stop()
  }

  grid.on("dragstart", handleDragStart)
  grid.on("drag", handleDrag)
  grid.on("dragstop", handleDragStop)

  return () => {
    grid.off("dragstart", handleDragStart)
    grid.off("drag", handleDrag)
    grid.off("dragstop", handleDragStop)
    stop()
  }
}
