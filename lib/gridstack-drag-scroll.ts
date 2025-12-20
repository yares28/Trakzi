import type { GridStack } from "gridstack"

type GridStackDragScrollOptions = {
  edgeThreshold?: number
  maxSpeed?: number
  scrollElement?: HTMLElement | null
}

const DEFAULT_EDGE_THRESHOLD = 80
const DEFAULT_MAX_SPEED = 15
const SCROLL_REGEX = /(auto|scroll)/

const getScrollParent = (el?: HTMLElement | null): HTMLElement => {
  let current = el ?? null
  while (current && current !== document.body) {
    const style = window.getComputedStyle(current)
    const overflow = `${style.overflow}${style.overflowY}${style.overflowX}`
    if (SCROLL_REGEX.test(overflow)) return current
    current = current.parentElement
  }
  return (document.scrollingElement as HTMLElement) || document.documentElement
}

const isViewportScroll = (el: HTMLElement) => {
  const scrollingElement = document.scrollingElement || document.documentElement
  return el === scrollingElement || el === document.documentElement || el === document.body
}

const getScrollRect = (el: HTMLElement) => {
  if (isViewportScroll(el)) {
    return { top: 0, bottom: window.innerHeight }
  }
  const rect = el.getBoundingClientRect()
  return { top: rect.top, bottom: rect.bottom }
}

export const setupGridStackDragScroll = (
  grid: GridStack,
  options?: GridStackDragScrollOptions,
) => {
  const edgeThreshold = options?.edgeThreshold ?? DEFAULT_EDGE_THRESHOLD
  const maxSpeed = options?.maxSpeed ?? DEFAULT_MAX_SPEED

  let rafId: number | null = null
  let isDragging = false
  let lastClientY = 0
  let scrollElement: HTMLElement | null = null
  let scrollTarget: HTMLElement | Window | null = null
  let lastScrollTop = 0
  let helperEl: HTMLElement | null = null

  // Store the accumulated scroll offset during this drag session
  let accumulatedScrollDelta = 0

  const findHelper = (): HTMLElement | null => {
    // GridStack adds ui-draggable-dragging class during drag
    const el = document.querySelector(".ui-draggable-dragging") as HTMLElement | null
    if (el) return el

    // Also check for grid-stack-item being dragged
    const gsItem = document.querySelector(".grid-stack-item.ui-draggable-dragging") as HTMLElement | null
    return gsItem
  }

  const updateMousePosition = (event: Event) => {
    const e = event as MouseEvent
    if (typeof e?.clientY === "number") {
      lastClientY = e.clientY
    }
  }

  /**
   * When the container scrolls, we need to adjust the helper element's
   * position so it appears to stay in the same place relative to the cursor.
   * 
   * GridStack's drag uses CSS top/left positioning. When we scroll down,
   * the helper's top value stays the same but it appears to move up on screen.
   * We need to ADD the scroll delta to the top value to compensate.
   */
  const compensateForScroll = () => {
    if (!scrollElement || !helperEl) return

    const currentScrollTop = scrollElement.scrollTop
    const scrollDelta = currentScrollTop - lastScrollTop

    if (scrollDelta === 0) return

    // Accumulate the total scroll delta
    accumulatedScrollDelta += scrollDelta
    lastScrollTop = currentScrollTop

    // Get current top position (could be from style or computed)
    const currentTop = parseFloat(helperEl.style.top) || 0

    // Apply scroll compensation to keep helper under cursor
    // When scrolling DOWN (positive delta), the helper moves UP visually
    // So we ADD delta to top to counteract this
    helperEl.style.top = `${currentTop + scrollDelta}px`

    // Also trigger a synthetic mousemove to update GridStack's internal position
    // This ensures the drop position is calculated correctly
    const syntheticMove = new MouseEvent("mousemove", {
      bubbles: true,
      cancelable: true,
      clientX: parseInt(helperEl.style.left) || 0,
      clientY: lastClientY,
      view: window,
    })
    document.dispatchEvent(syntheticMove)
  }

  const handleScroll = () => {
    if (!isDragging) return
    compensateForScroll()
  }

  const schedule = () => {
    if (rafId !== null) return
    rafId = requestAnimationFrame(tick)
  }

  const tick = () => {
    rafId = null
    if (!isDragging || !scrollElement) return

    const rect = getScrollRect(scrollElement)
    const distanceTop = lastClientY - rect.top
    const distanceBottom = rect.bottom - lastClientY
    let scrollDelta = 0

    // Calculate scroll speed based on distance from edge
    // Using quadratic easing for smoother acceleration
    if (distanceTop >= 0 && distanceTop < edgeThreshold) {
      const ratio = 1 - (distanceTop / edgeThreshold)
      scrollDelta = -Math.ceil(maxSpeed * ratio * ratio)
    } else if (distanceBottom >= 0 && distanceBottom < edgeThreshold) {
      const ratio = 1 - (distanceBottom / edgeThreshold)
      scrollDelta = Math.ceil(maxSpeed * ratio * ratio)
    }

    if (scrollDelta !== 0) {
      const prevScroll = scrollElement.scrollTop
      scrollElement.scrollTop = prevScroll + scrollDelta

      // The scroll event will handle position compensation
      // but we call it directly for immediate feedback
      if (scrollElement.scrollTop !== prevScroll) {
        compensateForScroll()
      }
    }

    // Continue the animation loop while dragging
    if (isDragging) {
      schedule()
    }
  }

  const handleDragStart = (event: Event) => {
    isDragging = true
    updateMousePosition(event)
    accumulatedScrollDelta = 0

    scrollElement = options?.scrollElement ?? getScrollParent(grid.el)
    scrollTarget = scrollElement
      ? (isViewportScroll(scrollElement) ? window : scrollElement)
      : null

    if (scrollElement) {
      lastScrollTop = scrollElement.scrollTop
    }

    // Find the helper element after GridStack creates it
    // Use requestAnimationFrame to ensure it exists
    requestAnimationFrame(() => {
      helperEl = findHelper()
    })

    if (scrollTarget) {
      scrollTarget.addEventListener("scroll", handleScroll, { passive: true })
    }

    schedule()
  }

  const handleDrag = (event: Event) => {
    updateMousePosition(event)

    // Ensure we have the helper reference
    if (!helperEl) {
      helperEl = findHelper()
    }

    schedule()
  }

  const handleDragStop = () => {
    isDragging = false
    accumulatedScrollDelta = 0
    helperEl = null

    if (rafId !== null) {
      cancelAnimationFrame(rafId)
      rafId = null
    }

    if (scrollTarget) {
      scrollTarget.removeEventListener("scroll", handleScroll)
      scrollTarget = null
    }

    scrollElement = null
  }

  // Register GridStack event handlers
  grid.on("dragstart", handleDragStart)
  grid.on("drag", handleDrag)
  grid.on("dragstop", handleDragStop)

  // Return cleanup function
  return () => {
    handleDragStop()
    grid.off("dragstart")
    grid.off("drag")
    grid.off("dragstop")
  }
}
