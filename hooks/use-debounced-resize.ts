import * as React from "react"

/**
 * Hook that provides a debounced resize callback.
 * Uses requestAnimationFrame for smooth final updates after debounce.
 *
 * @param callback - Function to call when resize settles
 * @param delay - Debounce delay in ms (default: 150)
 *
 * @example
 * ```tsx
 * useDebouncedResize(() => {
 *   setDimensions({ width: window.innerWidth, height: window.innerHeight })
 * }, 100)
 * ```
 */
export function useDebouncedResize(
  callback: () => void,
  delay: number = 150
) {
  const timeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  const rafRef = React.useRef<number | null>(null)
  const callbackRef = React.useRef(callback)

  // Keep callback ref updated to avoid stale closures
  React.useEffect(() => {
    callbackRef.current = callback
  }, [callback])

  React.useEffect(() => {
    const debouncedCallback = () => {
      // Clear any pending timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      // Clear any pending RAF
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
      }

      // Set new debounced timeout
      timeoutRef.current = setTimeout(() => {
        // Use RAF for smooth update after debounce settles
        rafRef.current = requestAnimationFrame(() => {
          callbackRef.current()
        })
      }, delay)
    }

    window.addEventListener("resize", debouncedCallback, { passive: true })

    return () => {
      window.removeEventListener("resize", debouncedCallback)
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
      }
    }
  }, [delay])
}

/**
 * Hook that returns debounced window dimensions.
 * Useful when you need reactive dimensions without excessive re-renders.
 *
 * @param delay - Debounce delay in ms (default: 150)
 * @returns Current window dimensions (updated after resize settles)
 */
export function useDebouncedWindowSize(delay: number = 150) {
  const [size, setSize] = React.useState({
    width: typeof window !== "undefined" ? window.innerWidth : 0,
    height: typeof window !== "undefined" ? window.innerHeight : 0,
  })

  useDebouncedResize(() => {
    setSize({
      width: window.innerWidth,
      height: window.innerHeight,
    })
  }, delay)

  return size
}
