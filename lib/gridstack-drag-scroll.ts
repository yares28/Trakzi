import { DDManager, Utils } from "gridstack"
import type { DDDraggable, DDUIData, GridStack } from "gridstack"

type GridStackDragScrollOptions = {
  edgeThreshold?: number
  maxSpeed?: number
  scrollElement?: HTMLElement | null
}

type DragCallback = (event: MouseEvent, ui: DDUIData) => void
type DragInstance = DDDraggable & {
  ui?: () => DDUIData
  el?: HTMLElement
  helper?: HTMLElement
}

const DEFAULT_EDGE_THRESHOLD = 80
const DEFAULT_MAX_SPEED = 24
const SCROLL_REGEX = /(auto|scroll)/

const resolveScrollElement = (el?: HTMLElement | null) => {
  const utils = Utils as typeof Utils & {
    getScrollElement?: (element?: HTMLElement | null) => HTMLElement
  }
  if (typeof utils.getScrollElement === "function") {
    return utils.getScrollElement(el)
  }

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
  let dragInstance: DragInstance | null = null
  let dragCallback: DragCallback | null = null
  let lastDragEvent: MouseEvent | null = null
  let lastDragUi: DDUIData | null = null
  let dragTarget: HTMLElement | null = null
  let helperElement: HTMLElement | null = null
  // Track cumulative scroll offset during this drag session
  let scrollOffsetY = 0
  let scrollOffsetX = 0
  // Store the initial helper transform
  let initialHelperTransform = ""

  const wrappedDrags = new WeakSet<DDDraggable>()
  const originalDragCallbacks = new WeakMap<DDDraggable, DragCallback>()

  const shuffle = <T,>(items: T[]) => {
    const result = [...items]
    for (let i = result.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1))
        ;[result[i], result[j]] = [result[j], result[i]]
    }
    return result
  }

  const packNodes = (nodes: Array<{ el?: HTMLElement; w?: number; h?: number }>) => {
    if (!grid.engine) return new Map<HTMLElement, { x: number; y: number }>()
    const columns = grid.getColumn?.() ?? 12
    const placements = new Map<HTMLElement, { x: number; y: number }>()
    const placed: Array<{ x: number; y: number; w: number; h: number }> = []

    nodes.forEach((node) => {
      if (!node.el) return
      const width = Math.min(node.w || 1, columns)
      const height = node.h || 1
      const temp = { x: 0, y: 0, w: width, h: height }
      grid.engine.findEmptyPosition(temp, placed as any, columns)
      placed.push(temp)
      placements.set(node.el, { x: temp.x, y: temp.y })
    })

    return placements
  }

  const applyRandomLayout = () => {
    const items = grid.getGridItems?.() ?? []
    const nodes = items
      .map((item) => item.gridstackNode)
      .filter((node): node is NonNullable<typeof node> => Boolean(node && node.el))
    if (nodes.length === 0) return

    const placements = packNodes(shuffle(nodes))
    grid.batchUpdate(true)
    placements.forEach((pos, el) => {
      grid.update(el, { x: pos.x, y: pos.y })
    })
    grid.batchUpdate(false)
  }

  const applyGravityUp = () => {
    const items = grid.getGridItems?.() ?? []
    const nodes = items
      .map((item) => item.gridstackNode)
      .filter((node): node is NonNullable<typeof node> => Boolean(node && node.el))
    if (nodes.length === 0) return

    const ordered = [...nodes].sort((a, b) => {
      const yDiff = (a.y ?? 0) - (b.y ?? 0)
      if (yDiff !== 0) return yDiff
      return (a.x ?? 0) - (b.x ?? 0)
    })
    const placements = packNodes(ordered)
    grid.batchUpdate(true)
    placements.forEach((pos, el) => {
      grid.update(el, { x: pos.x, y: pos.y })
    })
    grid.batchUpdate(false)
  }

  const updatePointer = (event: Event | null) => {
    const pointerEvent = event as MouseEvent & { clientX?: number; clientY?: number }
    if (typeof pointerEvent?.clientX === "number" && typeof pointerEvent?.clientY === "number") {
      lastPointer = { x: pointerEvent.clientX, y: pointerEvent.clientY }
    }
  }

  const resolveDragCallback = (instance: DragInstance | null) => {
    if (!instance) return null
    if (!wrappedDrags.has(instance)) {
      const originalDrag = (instance as DDDraggable & { option?: { drag?: DragCallback } }).option
        ?.drag
      if (originalDrag) {
        wrappedDrags.add(instance)
        originalDragCallbacks.set(instance, originalDrag)
        instance.option.drag = (event, ui) => {
          lastDragEvent = event as MouseEvent
          lastDragUi = ui
          originalDrag(event as MouseEvent, ui)
        }
      }
    }
    return (
      originalDragCallbacks.get(instance) ??
      (instance as DDDraggable & { option?: { drag?: DragCallback } }).option?.drag ??
      null
    )
  }

  const syncDragUi = (instance: DragInstance | null) => {
    if (!instance || typeof instance.ui !== "function") return
    lastDragUi = instance.ui()
  }

  /**
   * Find the helper element being dragged - it's typically the element with 
   * ui-draggable-dragging class or the grid item being dragged
   */
  const findHelperElement = (instance: DragInstance | null): HTMLElement | null => {
    // First check DDManager for the current drag element
    const ddManager = DDManager as { dragElement?: DragInstance }
    if (ddManager.dragElement?.helper instanceof HTMLElement) {
      return ddManager.dragElement.helper
    }
    if (ddManager.dragElement?.el instanceof HTMLElement) {
      return ddManager.dragElement.el
    }

    // Try the instance
    if (instance?.helper instanceof HTMLElement) {
      return instance.helper
    }
    if (instance?.el instanceof HTMLElement) {
      return instance.el
    }

    // Look for the dragging class
    const dragging = document.querySelector(".ui-draggable-dragging, .grid-stack-item-dragging")
    if (dragging instanceof HTMLElement) {
      return dragging
    }

    return null
  }

  /**
   * Update the helper element's position to compensate for scroll
   * This is the key function that makes the dragged element follow the scroll
   */
  const updateHelperPosition = () => {
    if (!helperElement || (scrollOffsetX === 0 && scrollOffsetY === 0)) return

    // Parse the current transform or use stored initial
    const currentTransform = helperElement.style.transform || initialHelperTransform

    // Check if there's an existing translate in the transform
    const translateMatch = currentTransform.match(/translate(?:3d)?\s*\(([^)]+)\)/)

    if (translateMatch) {
      // Parse existing translate values
      const parts = translateMatch[1].split(",").map(s => parseFloat(s.trim()) || 0)
      const existingX = parts[0] || 0
      const existingY = parts[1] || 0
      const existingZ = parts[2] || 0

      // Apply scroll compensation
      const newX = existingX + scrollOffsetX
      const newY = existingY + scrollOffsetY

      // Rebuild transform with new translate
      const newTranslate = existingZ !== 0
        ? `translate3d(${newX}px, ${newY}px, ${existingZ}px)`
        : `translate(${newX}px, ${newY}px)`

      // Replace the translate in the transform string
      const newTransform = currentTransform.replace(/translate(?:3d)?\s*\([^)]+\)/, newTranslate)
      helperElement.style.transform = newTransform
    } else {
      // No existing translate, add one
      const translateValue = `translate(${scrollOffsetX}px, ${scrollOffsetY}px)`
      helperElement.style.transform = currentTransform
        ? `${currentTransform} ${translateValue}`
        : translateValue
    }

    // Reset the offsets after applying
    scrollOffsetX = 0
    scrollOffsetY = 0
  }

  const applyScrollDelta = (deltaTop: number, deltaLeft: number) => {
    if (!isDragging) return false

    // Accumulate the scroll offsets
    scrollOffsetY += deltaTop
    scrollOffsetX += deltaLeft

    // Update the UI data position if available
    if (lastDragUi?.position) {
      if (typeof lastDragUi.position.top === "number") {
        lastDragUi.position.top += deltaTop
      }
      if (typeof lastDragUi.position.left === "number") {
        lastDragUi.position.left += deltaLeft
      }
    }

    // Update helper element position visually
    updateHelperPosition()

    // Trigger a synthetic drag event to update GridStack's internal state
    if (dragCallback && lastDragUi) {
      const baseEvent = lastDragEvent as Partial<MouseEvent> | null
      const target = dragTarget ?? (baseEvent?.target as HTMLElement | null) ?? null

      // Compute page coordinates that account for scroll
      const scrollX = scrollElement?.scrollLeft ?? window.scrollX ?? 0
      const scrollY = scrollElement?.scrollTop ?? window.scrollY ?? 0

      const syntheticEvent = {
        ...(baseEvent ?? {}),
        type: "drag",
        target,
        clientX: lastPointer?.x ?? baseEvent?.clientX ?? 0,
        clientY: lastPointer?.y ?? baseEvent?.clientY ?? 0,
        pageX: (lastPointer?.x ?? 0) + scrollX,
        pageY: (lastPointer?.y ?? 0) + scrollY,
      } as MouseEvent

      dragCallback(syntheticEvent, lastDragUi)
    }

    return true
  }

  const syncScrollState = () => {
    if (!scrollElement) return false
    const nextScrollTop = scrollElement.scrollTop
    const nextScrollLeft = scrollElement.scrollLeft
    const deltaTop = nextScrollTop - lastScrollTop
    const deltaLeft = nextScrollLeft - lastScrollLeft
    if (deltaTop === 0 && deltaLeft === 0) return false

    lastScrollTop = nextScrollTop
    lastScrollLeft = nextScrollLeft

    return applyScrollDelta(deltaTop, deltaLeft)
  }

  const handleScroll = () => {
    if (!isDragging) return
    syncScrollState()
  }

  const schedule = () => {
    if (rafId !== null) return
    rafId = requestAnimationFrame(tick)
  }

  const tick = () => {
    rafId = null
    if (!isDragging || !lastPointer || !scrollElement) return

    // Sync any scroll changes that happened
    syncScrollState()

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

      // The scroll event handler will take care of updating the position
      // But we need to sync immediately for smooth feedback
      if (scrollElement.scrollTop !== previousScrollTop) {
        const actualDelta = scrollElement.scrollTop - previousScrollTop
        lastScrollTop = scrollElement.scrollTop
        applyScrollDelta(actualDelta, 0)
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

  const resolveDragInstance = (candidate?: unknown): DragInstance | null => {
    const element = resolveDraggedElement(candidate)
    if (!element) return null
    const ddElement = (element as { ddElement?: { ddDraggable?: DDDraggable } }).ddElement
    if (ddElement?.ddDraggable) {
      return ddElement.ddDraggable as DragInstance
    }
    return null
  }

  const handleDragStart = (event: Event, el?: unknown) => {
    isDragging = true
    updatePointer(event)
    scrollElement = options?.scrollElement ?? resolveScrollElement(grid.el)
    scrollTarget = scrollElement ? (isViewportScroll(scrollElement) ? window : scrollElement) : null

    if (scrollElement) {
      lastScrollTop = scrollElement.scrollTop
      lastScrollLeft = scrollElement.scrollLeft
    }

    // Reset scroll offsets for this drag session
    scrollOffsetX = 0
    scrollOffsetY = 0

    dragInstance =
      resolveDragInstance(el) ?? ((DDManager.dragElement as DragInstance | undefined) || null)
    dragCallback = resolveDragCallback(dragInstance)
    dragTarget = resolveDraggedElement(el) ?? dragInstance?.el ?? null
    lastDragEvent = event as MouseEvent
    syncDragUi(dragInstance)

    // Find and store the helper element
    // Use a small delay to ensure the helper is created
    requestAnimationFrame(() => {
      helperElement = findHelperElement(dragInstance)
      if (helperElement) {
        initialHelperTransform = helperElement.style.transform || ""
      }
    })

    if (scrollTarget) {
      scrollTarget.addEventListener("scroll", handleScroll, { passive: true })
    }
    schedule()
  }

  const handleDrag = (event: Event) => {
    updatePointer(event)
    lastDragEvent = event as MouseEvent

    // Update helper reference in case it changed
    if (!helperElement) {
      helperElement = findHelperElement(dragInstance)
      if (helperElement) {
        initialHelperTransform = helperElement.style.transform || ""
      }
    }

    schedule()
  }

  const handleDragStop = () => {
    isDragging = false
    lastPointer = null
    dragInstance = null
    dragCallback = null
    lastDragEvent = null
    lastDragUi = null
    dragTarget = null
    helperElement = null
    initialHelperTransform = ""
    scrollOffsetX = 0
    scrollOffsetY = 0

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
