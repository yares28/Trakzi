import { colorPalettes } from "@/components/color-scheme-provider"

/**
 * Default fallback palette (sunset) for when the color scheme context is unavailable
 * or when getPalette() returns an empty array after filtering.
 * Always prefer using `getPalette()` from `useColorScheme()` when inside a component.
 */
export const DEFAULT_FALLBACK_PALETTE = colorPalettes.sunset

/**
 * Compute the relative luminance of a hex color and return either white (#ffffff)
 * or black (#000000) for maximum text contrast.
 *
 * Uses the WCAG 2.0 relative luminance formula. This replaces all hardcoded
 * darkColors/goldDarkColors arrays with a universal algorithm that works
 * across every palette.
 */
export function getContrastTextColor(hexColor: string): string {
  // Remove # prefix if present
  const hex = hexColor.replace(/^#/, "")

  // Parse hex to RGB (handle 3-digit and 6-digit hex)
  let r: number, g: number, b: number
  if (hex.length === 3) {
    r = parseInt(hex[0] + hex[0], 16) / 255
    g = parseInt(hex[1] + hex[1], 16) / 255
    b = parseInt(hex[2] + hex[2], 16) / 255
  } else {
    r = parseInt(hex.substring(0, 2), 16) / 255
    g = parseInt(hex.substring(2, 4), 16) / 255
    b = parseInt(hex.substring(4, 6), 16) / 255
  }

  // Linearize sRGB channel value
  const linearize = (c: number) =>
    c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)

  // Calculate relative luminance
  const luminance =
    0.2126 * linearize(r) + 0.7152 * linearize(g) + 0.0722 * linearize(b)

  // Return white for dark backgrounds, black for light backgrounds
  return luminance > 0.179 ? "#000000" : "#ffffff"
}

/**
 * Standard muted-foreground text color for chart axes and labels.
 * Uses Tailwind gray-400 (dark) / gray-500 (light).
 */
export function getChartTextColor(isDark: boolean): string {
  return isDark ? "#9ca3af" : "#6b7280"
}

/**
 * Standard grid/axis line color for charts (light theme).
 * Uses Tailwind gray-200.
 */
export const CHART_GRID_COLOR = "#e5e7eb"

/**
 * Theme-aware grid/axis line color for Nivo and other charts so grid and axis
 * ticks use the same stroke and do not appear as two stacked lines.
 */
export function getChartAxisLineColor(isDark: boolean): string {
  return isDark ? "#4b5563" : CHART_GRID_COLOR
}

/**
 * Standard transparent background for ECharts instances.
 */
export function getEChartsBackground(isDark: boolean): string {
  return isDark ? "rgba(15,23,42,0)" : "rgba(248,250,252,0)"
}

/**
 * Standard split line color for ECharts grids.
 */
export function getEChartsSplitLineColor(isDark: boolean): string {
  return isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"
}
