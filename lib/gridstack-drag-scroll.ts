import type { GridStack } from "gridstack"

type GridStackDragScrollOptions = {
  edgeThreshold?: number
  maxSpeed?: number
  scrollElement?: HTMLElement | null
}

const DEFAULT_EDGE_THRESHOLD = 80
const DEFAULT_MAX_SPEED = 24
const SCROLL_REGEX = /(auto|scroll)/

const getScrollParent = (el?: HTMLElement | null) => {
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
  let lastPointer: { x: number; y: number } | null = null
  let scrollElement: HTMLElement | null = null
  let scrollTarget: HTMLElement | Window | null = null
  let lastScrollTop = 0
  let lastScrollLeft = 0
  let dragInstance: {
    dragOffset?: { offsetTop?: number; offsetLeft?: number; top?: number; left?: number }
    dragTransform?: { xScale?: number; yScale?: number }
  } | null = null
  const shuffle = <T,>(items: T[]) => {
    const result = [...items]
    for (let i = result.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[result[i], result[j]] = [result[j], result[i]]
    }
    return result
  }

  const applyRandomLayout = () => {
    const items = grid.getGridItems?.() ?? []
    const nodes = items
      .map((item) => item.gridstackNode)
      .filter((node): node is NonNullable<typeof node> => Boolean(node && node.el))
    if (nodes.length === 0) return

    const columns = grid.getColumn?.() ?? 12
    const shuffledNodes = shuffle(nodes)
    let cursorX = 0
    let cursorY = 0
    let rowHeight = 0

    grid.batchUpdate(true)
    shuffledNodes.forEach((node) => {
      const width = Math.min(node.w || 1, columns)
      const height = node.h || 1
      if (cursorX + width > columns) {
        cursorX = 0
        cursorY += rowHeight
        rowHeight = 0
      }
      if (node.el) {
        grid.update(node.el, { x: cursorX, y: cursorY })
      }
      cursorX += width
      rowHeight = Math.max(rowHeight, height)
    })
    grid.batchUpdate(false)
  }

  const applyGravityUp = () => {
    grid.compact("list")
  }

  const updatePointer = (event: Event | null) => {
    const pointerEvent = event as MouseEvent & { clientX?: number; clientY?: number }
    if (typeof pointerEvent?.clientX === "number" && typeof pointerEvent?.clientY === "number") {
      lastPointer = { x: pointerEvent.clientX, y: pointerEvent.clientY }
    }
  }

  const dispatchMouseMove = () => {
    if (!lastPointer) return

    document.dispatchEvent(
      new MouseEvent("mousemove", {
        clientX: lastPointer.x,
        clientY: lastPointer.y,
        bubbles: true,
        cancelable: true,
        view: window,
        buttons: 1,
      }),
    )
  }

  const applyScrollDelta = (deltaTop: number, deltaLeft: number) => {
    if (!dragInstance?.dragOffset) return
    const scaleX = dragInstance.dragTransform?.xScale ?? 1
    const scaleY = dragInstance.dragTransform?.yScale ?? 1
    const safeScaleX = scaleX === 0 ? 1 : scaleX
    const safeScaleY = scaleY === 0 ? 1 : scaleY
    const scaledDeltaTop = deltaTop / safeScaleY
    const scaledDeltaLeft = deltaLeft / safeScaleX

    if (typeof dragInstance.dragOffset.offsetTop === "number") {
      dragInstance.dragOffset.offsetTop -= scaledDeltaTop
    }
    if (typeof dragInstance.dragOffset.offsetLeft === "number") {
      dragInstance.dragOffset.offsetLeft -= scaledDeltaLeft
    }
    if (typeof dragInstance.dragOffset.top === "number") {
      dragInstance.dragOffset.top -= scaledDeltaTop
    }
    if (typeof dragInstance.dragOffset.left === "number") {
      dragInstance.dragOffset.left -= scaledDeltaLeft
    }
  }

  const syncScrollState = () => {
    if (!scrollElement) return
    const nextScrollTop = scrollElement.scrollTop
    const nextScrollLeft = scrollElement.scrollLeft
    const deltaTop = nextScrollTop - lastScrollTop
    const deltaLeft = nextScrollLeft - lastScrollLeft
    if (deltaTop === 0 && deltaLeft === 0) return false
    applyScrollDelta(deltaTop, deltaLeft)
    lastScrollTop = nextScrollTop
    lastScrollLeft = nextScrollLeft
    return true
  }

  const handleScroll = () => {
    if (!isDragging || !lastPointer) return
    if (syncScrollState()) {
      dispatchMouseMove()
    }
  }

  const schedule = () => {
    if (rafId !== null) return
    rafId = requestAnimationFrame(tick)
  }

  const tick = () => {
    rafId = null
    if (!isDragging || !lastPointer || !scrollElement) return

    if (syncScrollState()) {
      dispatchMouseMove()
    }

    const rect = getScrollRect(scrollElement)
    const distanceTop = lastPointer.y - rect.top
    const distanceBottom = rect.bottom - lastPointer.y
    let deltaY = 0

    if (distanceTop < edgeThreshold) {
      const ratio = (edgeThreshold - distanceTop) / edgeThreshold
      deltaY = -Math.max(1, Math.round(maxSpeed * ratio))
    } else if (distanceBottom < edgeThreshold) {
      const ratio = (edgeThreshold - distanceBottom) / edgeThreshold
      deltaY = Math.max(1, Math.round(maxSpeed * ratio))
    }

    if (deltaY !== 0) {
      const previousScrollTop = scrollElement.scrollTop
      scrollElement.scrollTop = previousScrollTop + deltaY
      if (scrollElement.scrollTop !== previousScrollTop) {
        const deltaTop = scrollElement.scrollTop - previousScrollTop
        applyScrollDelta(deltaTop, 0)
        lastScrollTop = scrollElement.scrollTop
        dispatchMouseMove()
      }
    }
    if (isDragging) {
      schedule()
    }
  }

  const resolveDraggedElement = (candidate?: unknown) => {
    if (candidate instanceof HTMLElement) {
      return candidate
    }
    if (Array.isArray(candidate)) {
      const first = candidate[0] as { el?: HTMLElement } | undefined
      if (first?.el instanceof HTMLElement) {
        return first.el
      }
    }
    if (candidate && typeof candidate === "object") {
      const maybeEl = (candidate as { el?: HTMLElement }).el
      if (maybeEl instanceof HTMLElement) {
        return maybeEl
      }
    }
    return null
  }

  const resolveDragInstance = (candidate?: unknown) => {
    const element = resolveDraggedElement(candidate)
    if (!element) return null
    const ddElement = (element as { ddElement?: { ddDraggable?: unknown } }).ddElement
    if (ddElement?.ddDraggable && typeof ddElement.ddDraggable === "object") {
      return ddElement.ddDraggable as {
        dragOffset?: { offsetTop?: number; offsetLeft?: number; top?: number; left?: number }
        dragTransform?: { xScale?: number; yScale?: number }
      }
    }
    return null
  }

  const handleDragStart = (event: Event, el?: unknown) => {
    isDragging = true
    updatePointer(event)
    scrollElement = options?.scrollElement ?? getScrollParent(grid.el)
    scrollTarget = scrollElement ? (isViewportScroll(scrollElement) ? window : scrollElement) : null
    if (scrollElement) {
      lastScrollTop = scrollElement.scrollTop
      lastScrollLeft = scrollElement.scrollLeft
    }
    dragInstance = resolveDragInstance(el)
    if (scrollTarget) {
      scrollTarget.addEventListener("scroll", handleScroll, { passive: true })
    }
    schedule()
  }

  const handleDrag = (event: Event) => {
    updatePointer(event)
    schedule()
  }

  const handleDragStop = () => {
    isDragging = false
    lastPointer = null
    dragInstance = null
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

  const handleRandomize = () => {
    applyRandomLayout()
  }

  const handleGravity = () => {
    applyGravityUp()
  }

  grid.on("dragstart", handleDragStart)
  grid.on("drag", handleDrag)
  grid.on("dragstop", handleDragStop)
  window.addEventListener("gridstack:randomize", handleRandomize)
  window.addEventListener("gridstack:compact", handleGravity)

  return () => {
    handleDragStop()
    grid.off("dragstart")
    grid.off("drag")
    grid.off("dragstop")
    window.removeEventListener("gridstack:randomize", handleRandomize)
    window.removeEventListener("gridstack:compact", handleGravity)
  }
}
