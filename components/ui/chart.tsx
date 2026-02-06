"use client"

import * as React from "react"
import * as RechartsPrimitive from "recharts"

import { cn } from "@/lib/utils"
import { isChartResizePaused } from "@/lib/chart-resize-context"

// Format: { THEME_NAME: CSS_SELECTOR }
const THEMES = { light: "", dark: ".dark" } as const

export type ChartConfig = {
  [k in string]: {
    label?: React.ReactNode
    icon?: React.ComponentType
  } & (
    | { color?: string; theme?: never }
    | { color?: never; theme: Record<keyof typeof THEMES, string> }
  )
}

type ChartContextProps = {
  config: ChartConfig
}

const ChartContext = React.createContext<ChartContextProps | null>(null)

function useChart() {
  const context = React.useContext(ChartContext)

  if (!context) {
    throw new Error("useChart must be used within a <ChartContainer />")
  }

  return context
}

/**
 * Optimized ResponsiveContainer that prevents re-renders during layout transitions
 * Uses RAF for smooth, immediate updates when not paused
 *
 * Key optimization: Does NOT subscribe to isPaused context value.
 * Instead, listens for 'chart-resize-resume' event to re-measure once after animation.
 * This prevents re-render cascade when all charts would update simultaneously.
 */
function DebouncedResponsiveContainer({
  children,
  chartId,
}: {
  children: React.ComponentProps<typeof RechartsPrimitive.ResponsiveContainer>["children"]
  chartId: string
}) {
  const containerRef = React.useRef<HTMLDivElement>(null)
  const [dimensions, setDimensions] = React.useState<{ width: number; height: number } | null>(null)
  const lastDimensions = React.useRef<{ width: number; height: number } | null>(null)
  const rafId = React.useRef<number | null>(null)

  // Observe container size changes
  React.useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (!entry) return

      const { width, height } = entry.contentRect
      const newDimensions = { width: Math.floor(width), height: Math.floor(height) }

      // Skip if dimensions haven't actually changed (with small tolerance)
      if (
        lastDimensions.current &&
        Math.abs(lastDimensions.current.width - newDimensions.width) < 2 &&
        Math.abs(lastDimensions.current.height - newDimensions.height) < 2
      ) {
        return
      }

      lastDimensions.current = newDimensions

      // Use synchronous check for pause state (avoids closure issues)
      // This is critical for sidebar toggle where pause happens synchronously
      // but React state updates are asynchronous
      if (isChartResizePaused()) {
        return
      }

      // Cancel any pending RAF
      if (rafId.current) {
        cancelAnimationFrame(rafId.current)
      }

      // Use RAF for smooth, immediate update on next frame
      rafId.current = requestAnimationFrame(() => {
        setDimensions(newDimensions)
      })
    })

    observer.observe(container)

    // Initial measurement - immediate (only if not paused)
    if (!isChartResizePaused()) {
      const rect = container.getBoundingClientRect()
      const initialDimensions = { width: Math.floor(rect.width), height: Math.floor(rect.height) }
      lastDimensions.current = initialDimensions
      setDimensions(initialDimensions)
    }

    return () => {
      observer.disconnect()
      if (rafId.current) {
        cancelAnimationFrame(rafId.current)
      }
    }
  }, []) // No dependencies - uses synchronous isChartResizePaused()

  // Listen for resume event to re-measure after animation completes
  // This replaces the isPaused dependency which caused re-render cascade
  React.useEffect(() => {
    const handleResume = () => {
      const container = containerRef.current
      if (!container) return

      // Cancel any pending RAF
      if (rafId.current) {
        cancelAnimationFrame(rafId.current)
      }

      // Re-measure on next frame
      rafId.current = requestAnimationFrame(() => {
        if (!isChartResizePaused()) {
          const rect = container.getBoundingClientRect()
          const newDimensions = { width: Math.floor(rect.width), height: Math.floor(rect.height) }
          lastDimensions.current = newDimensions
          setDimensions(newDimensions)
        }
      })
    }

    window.addEventListener('chart-resize-resume', handleResume)
    return () => {
      window.removeEventListener('chart-resize-resume', handleResume)
      if (rafId.current) {
        cancelAnimationFrame(rafId.current)
      }
    }
  }, [])

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
      }}
    >
      {dimensions && dimensions.width > 0 && dimensions.height > 0 ? (
        <RechartsPrimitive.ResponsiveContainer
          width={dimensions.width}
          height={dimensions.height}
          debounce={0}
        >
          {children}
        </RechartsPrimitive.ResponsiveContainer>
      ) : (
        <div style={{ width: '100%', height: '100%' }} />
      )}
    </div>
  )
}

function ChartContainer({
  id,
  className,
  children,
  config,
  ...props
}: React.ComponentProps<"div"> & {
  config: ChartConfig
  children: React.ComponentProps<
    typeof RechartsPrimitive.ResponsiveContainer
  >["children"]
}) {
  const uniqueId = React.useId()
  const chartId = `chart-${id || uniqueId.replace(/:/g, "")}`

  return (
    <ChartContext.Provider value={{ config }}>
      <div
        data-slot="chart"
        data-chart={chartId}
        className={cn(
          "[&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground [&_.recharts-cartesian-grid_line[stroke='#ccc']]:stroke-border/50 dark:[&_.recharts-cartesian-grid_line]:stroke-[#e5e7eb] [&_.recharts-curve.recharts-tooltip-cursor]:stroke-border [&_.recharts-polar-grid_[stroke='#ccc']]:stroke-border dark:[&_.recharts-polar-grid_line]:stroke-[#e5e7eb] [&_.recharts-radial-bar-background-sector]:fill-muted [&_.recharts-rectangle.recharts-tooltip-cursor]:fill-muted [&_.recharts-reference-line_[stroke='#ccc']]:stroke-border dark:[&_.recharts-reference-line]:stroke-[#e5e7eb] flex aspect-video justify-center text-xs [&_.recharts-dot[stroke='#fff']]:stroke-transparent [&_.recharts-layer]:outline-hidden [&_.recharts-sector]:outline-hidden [&_.recharts-sector[stroke='#fff']]:stroke-transparent [&_.recharts-surface]:outline-hidden",
          className
        )}
        {...props}
      >
        <ChartStyle id={chartId} config={config} />
        <DebouncedResponsiveContainer chartId={chartId}>
          {children}
        </DebouncedResponsiveContainer>
      </div>
    </ChartContext.Provider>
  )
}

const ChartStyle = ({ id, config }: { id: string; config: ChartConfig }) => {
  const colorConfig = Object.entries(config).filter(
    ([, config]) => config.theme || config.color
  )

  if (!colorConfig.length) {
    return null
  }

  return (
    <style
      dangerouslySetInnerHTML={{
        __html: Object.entries(THEMES)
          .map(
            ([theme, prefix]) => `
${prefix} [data-chart=${id}] {
${colorConfig
                .map(([key, itemConfig]) => {
                  const color =
                    itemConfig.theme?.[theme as keyof typeof itemConfig.theme] ||
                    itemConfig.color
                  return color ? `  --color-${key}: ${color};` : null
                })
                .join("\n")}
}
`
          )
          .join("\n"),
      }}
    />
  )
}

/**
 * ChartTooltip - Recharts Tooltip wrapper with smart boundary constraints
 *
 * Features:
 * - Automatically flips tooltip position when near viewport edges
 * - Prevents tooltip from overflowing outside visible area
 * - Consistent offset from cursor
 *
 * @example
 * ```tsx
 * <ChartTooltip
 *   cursor={false}
 *   content={<ChartTooltipContent indicator="dot" />}
 * />
 * ```
 */
const ChartTooltip = (
  props: React.ComponentProps<typeof RechartsPrimitive.Tooltip>
) => {
  return (
    <RechartsPrimitive.Tooltip
      // Allow tooltip to escape chart SVG boundaries (fixes clipping issues)
      allowEscapeViewBox={{ x: true, y: true }}
      // Offset from cursor to prevent tooltip overlap with pointer
      offset={16}
      // Add wrapper styles for visibility and correct stacking
      wrapperStyle={{
        zIndex: 50,
        pointerEvents: 'none',
      }}
      {...props}
    />
  )
}

function ChartTooltipContent({
  active,
  payload,
  className,
  indicator = "dot",
  hideLabel = false,
  hideIndicator = false,
  label,
  labelFormatter,
  labelClassName,
  formatter,
  color,
  nameKey,
  labelKey,
}: React.ComponentProps<typeof RechartsPrimitive.Tooltip> &
  React.ComponentProps<"div"> & {
    hideLabel?: boolean
    hideIndicator?: boolean
    indicator?: "line" | "dot" | "dashed"
    nameKey?: string
    labelKey?: string
  }) {
  const { config } = useChart()

  const tooltipLabel = React.useMemo(() => {
    if (hideLabel || !payload?.length) {
      return null
    }

    const [item] = payload
    const key = `${labelKey || item?.dataKey || item?.name || "value"}`
    const itemConfig = getPayloadConfigFromPayload(config, item, key)
    const value =
      !labelKey && typeof label === "string"
        ? config[label as keyof typeof config]?.label || label
        : itemConfig?.label

    if (labelFormatter) {
      return (
        <div className={cn("font-medium", labelClassName)}>
          {labelFormatter(value, payload)}
        </div>
      )
    }

    if (!value) {
      return null
    }

    return <div className={cn("font-medium", labelClassName)}>{value}</div>
  }, [
    label,
    labelFormatter,
    payload,
    hideLabel,
    labelClassName,
    config,
    labelKey,
  ])

  if (!active || !payload?.length) {
    return null
  }

  const nestLabel = payload.length === 1 && indicator !== "dot"

  return (
    <div
      className={cn(
        // Unified tooltip styling - matches NivoChartTooltip in chart-tooltip.tsx
        "pointer-events-none select-none border-border/50 bg-background grid min-w-[8rem] items-start gap-1.5 rounded-lg border px-3 py-2 text-xs shadow-xl",
        className
      )}
    >
      {!nestLabel ? tooltipLabel : null}
      <div className="grid gap-1.5">
        {payload
          .filter((item) => item.type !== "none")
          .map((item, index) => {
            const key = `${nameKey || item.name || item.dataKey || "value"}`
            const itemConfig = getPayloadConfigFromPayload(config, item, key)
            const indicatorColor = color || item.payload.fill || item.color

            return (
              <div
                key={item.dataKey}
                className={cn(
                  "[&>svg]:text-muted-foreground flex w-full flex-wrap items-stretch gap-2 [&>svg]:h-2.5 [&>svg]:w-2.5",
                  indicator === "dot" && "items-center"
                )}
              >
                {formatter && item?.value !== undefined && item.name ? (
                  formatter(item.value, item.name, item, index, item.payload)
                ) : (
                  <>
                    {itemConfig?.icon ? (
                      <itemConfig.icon />
                    ) : (
                      !hideIndicator && (
                        <div
                          className={cn(
                            "shrink-0 rounded-[2px] border-(--color-border) bg-(--color-bg)",
                            {
                              "h-2.5 w-2.5": indicator === "dot",
                              "w-1": indicator === "line",
                              "w-0 border-[1.5px] border-dashed bg-transparent":
                                indicator === "dashed",
                              "my-0.5": nestLabel && indicator === "dashed",
                            }
                          )}
                          style={
                            {
                              "--color-bg": indicatorColor,
                              "--color-border": indicatorColor,
                            } as React.CSSProperties
                          }
                        />
                      )
                    )}
                    <div
                      className={cn(
                        "flex flex-1 justify-between leading-none",
                        nestLabel ? "items-end" : "items-center"
                      )}
                    >
                      <div className="grid gap-1.5">
                        {nestLabel ? tooltipLabel : null}
                        <span className="text-muted-foreground">
                          {itemConfig?.label || item.name}
                        </span>
                      </div>
                      {item.value && (
                        <span className="text-foreground font-mono font-medium tabular-nums">
                          {item.value.toLocaleString()}
                        </span>
                      )}
                    </div>
                  </>
                )}
              </div>
            )
          })}
      </div>
    </div>
  )
}

const ChartLegend = RechartsPrimitive.Legend

function ChartLegendContent({
  className,
  hideIcon = false,
  payload,
  verticalAlign = "bottom",
  nameKey,
}: React.ComponentProps<"div"> &
  Pick<RechartsPrimitive.LegendProps, "payload" | "verticalAlign"> & {
    hideIcon?: boolean
    nameKey?: string
  }) {
  const { config } = useChart()

  if (!payload?.length) {
    return null
  }

  return (
    <div
      className={cn(
        "flex items-center justify-center gap-4",
        verticalAlign === "top" ? "pb-3" : "pt-3",
        className
      )}
    >
      {payload
        .filter((item) => item.type !== "none")
        .map((item) => {
          const key = `${nameKey || item.dataKey || "value"}`
          const itemConfig = getPayloadConfigFromPayload(config, item, key)

          return (
            <div
              key={item.value}
              className={cn(
                "[&>svg]:text-muted-foreground flex items-center gap-1.5 [&>svg]:h-3 [&>svg]:w-3"
              )}
            >
              {itemConfig?.icon && !hideIcon ? (
                <itemConfig.icon />
              ) : (
                <div
                  className="h-2 w-2 shrink-0 rounded-[2px]"
                  style={{
                    backgroundColor: item.color,
                  }}
                />
              )}
              {itemConfig?.label}
            </div>
          )
        })}
    </div>
  )
}

// Helper to extract item config from a payload.
function getPayloadConfigFromPayload(
  config: ChartConfig,
  payload: unknown,
  key: string
) {
  if (typeof payload !== "object" || payload === null) {
    return undefined
  }

  const payloadPayload =
    "payload" in payload &&
      typeof payload.payload === "object" &&
      payload.payload !== null
      ? payload.payload
      : undefined

  let configLabelKey: string = key

  if (
    key in payload &&
    typeof payload[key as keyof typeof payload] === "string"
  ) {
    configLabelKey = payload[key as keyof typeof payload] as string
  } else if (
    payloadPayload &&
    key in payloadPayload &&
    typeof payloadPayload[key as keyof typeof payloadPayload] === "string"
  ) {
    configLabelKey = payloadPayload[
      key as keyof typeof payloadPayload
    ] as string
  }

  return configLabelKey in config
    ? config[configLabelKey]
    : config[key as keyof typeof config]
}

export {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  ChartStyle,
}
