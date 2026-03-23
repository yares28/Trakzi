import type { ReactNode } from "react"

/**
 * Chart Registry Types
 *
 * Use these types when creating chart rendering maps in grid components.
 * Each page defines its own registry as a Record<chartId, renderFn>.
 */
export type ChartRenderer = () => ReactNode
export type ChartRegistry = Record<string, ChartRenderer>
