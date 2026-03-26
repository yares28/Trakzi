"use client"

import * as React from "react"
import { useTheme } from "next-themes"
import { ResponsiveBar } from "@nivo/bar"
import { ChartInfoPopover } from "@/components/chart-info-popover"
import { ChartAiInsightButton } from "@/components/chart-ai-insight-button"
import { useColorScheme } from "@/components/color-scheme-provider"
import { useCurrency } from "@/components/currency-provider"
import {
  DEFAULT_FALLBACK_PALETTE,
  getChartTextColor,
  getChartAxisLineColor,
} from "@/lib/chart-colors"
import { NivoChartTooltip } from "@/components/chart-tooltip"
import { HoverableBar } from "@/components/chart-hoverable-bar"
import { deduplicatedFetch, getCachedResponse } from "@/lib/request-deduplication"
import { ChartLoadingState } from "@/components/chart-loading-state"
import {
  useIsInsideAnalyticsProvider,
  useAnalyticsChartData,
} from "@/contexts/analytics-data-context"
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { ChartFavoriteButton } from "@/components/chart-favorite-button"
import { GridStackCardDragHandle } from "@/components/gridstack-card-drag-handle"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ChartExpandButton } from "@/components/chart-expand-button"
import { ChartFullscreenModal } from "@/components/chart-fullscreen-modal"

interface ChartDayOfWeekCategoryProps {
  dateFilter?: string | null
  bundleData?: Array<{ dayOfWeek: number; category: string; total: number }>
  bundleLoading?: boolean
  emptyTitle?: string
  emptyDescription?: string
}

type DayOfWeekData = {
  category: string
  dayOfWeek: number
  total: number
}

const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

interface DayOfWeekCategoryInfoTriggerProps {
  forFullscreen?: boolean
}

const DayOfWeekCategoryInfoTrigger = React.memo(function DayOfWeekCategoryInfoTrigger({
  forFullscreen = false,
}: DayOfWeekCategoryInfoTriggerProps) {
  return (
    <div className={`flex items-center gap-2 ${forFullscreen ? '' : 'hidden md:flex flex-col'}`}>
      <ChartInfoPopover
        title="Day of Week Category Spending"
        description="Compare spending across categories for a selected day of the week."
        details={[
          "Each bar represents total spending in a category for the selected day of the week.",
          "Only the most spent categories are shown for each day.",
          "Use the day selector to switch between different days of the week.",
        ]}
        ignoredFootnote="Only expense transactions (amount < 0) are included."
      />
      <ChartAiInsightButton
        chartId="dayOfWeekCategory"
        chartTitle="Day of Week Category Spending"
        chartDescription="Compare spending across categories for a selected day of the week."
        size="sm"
      />
    </div>
  )
})

DayOfWeekCategoryInfoTrigger.displayName = "DayOfWeekCategoryInfoTrigger"

const buildDayOfWeekUrl = (params: URLSearchParams) =>
  `/api/analytics/day-of-week-category?${params.toString()}`

export const ChartDayOfWeekCategory = React.memo(function ChartDayOfWeekCategory({
  dateFilter,
  bundleData,
  bundleLoading,
  emptyTitle,
  emptyDescription
}: ChartDayOfWeekCategoryProps) {
  const { resolvedTheme } = useTheme()
  const { getShuffledPalette, colorScheme } = useColorScheme()
  const { formatCurrency } = useCurrency()
  const buildDayParams = React.useCallback(
    (day?: number | null) => {
      const params = new URLSearchParams()
      if (dateFilter) {
        params.append("filter", dateFilter)
      }
      if (typeof day === "number") {
        params.append("dayOfWeek", day.toString())
      }
      return params
    },
    [dateFilter],
  )
  const availableUrl = buildDayOfWeekUrl(buildDayParams())
  const cachedAvailable = getCachedResponse<{
    data: Array<{ category: string; dayOfWeek: number; total: number }>
    availableDays: number[]
  }>(availableUrl)
  const initialAvailableDays = cachedAvailable?.availableDays ?? []
  const initialSelectedDay =
    initialAvailableDays.length > 0 ? initialAvailableDays[0] : null
  const cachedSelected = initialSelectedDay !== null
    ? getCachedResponse<{
      data: Array<{ category: string; dayOfWeek: number; total: number }>
      availableDays: number[]
    }>(buildDayOfWeekUrl(buildDayParams(initialSelectedDay)))
    : undefined
  const [mounted, setMounted] = React.useState(false)
  const [data, setData] = React.useState<DayOfWeekData[]>(
    () => cachedSelected?.data ?? [],
  )
  const [availableDays, setAvailableDays] = React.useState<number[]>(
    () => initialAvailableDays,
  )
  const [selectedDay, setSelectedDay] = React.useState<number | null>(
    () => initialSelectedDay,
  )
  const [loading, setLoading] = React.useState(
    () => initialAvailableDays.length > 0 && cachedSelected === undefined,
  )
  const [isFullscreen, setIsFullscreen] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  React.useEffect(() => {
    if (bundleLoading !== undefined) {
      if (bundleLoading) {
        setLoading(true)
        return
      }
      if (bundleData && bundleData.length > 0) {
        const days = [...new Set(bundleData.map(d => d.dayOfWeek))].sort((a, b) => a - b)
        setAvailableDays(days)
        if (days.length > 0) {
          setSelectedDay((prev) => {
            if (prev === null || !days.includes(prev)) {
              return days[0]
            }
            return prev
          })
        } else {
          setSelectedDay(null)
        }
        setLoading(false)
        return
      }
    }

    const fetchAvailableDays = async () => {
      try {
        const cached = getCachedResponse<{ data: Array<{ category: string; dayOfWeek: number; total: number }>; availableDays: number[] }>(
          availableUrl,
        )
        if (cached) {
          const days = cached.availableDays || []
          setAvailableDays(days)
          if (days.length > 0) {
            setSelectedDay((prev) => {
              if (prev === null || !days.includes(prev)) {
                return days[0]
              }
              return prev
            })
          } else {
            setSelectedDay(null)
            setLoading(false)
          }
          return
        }

        const result = await deduplicatedFetch<{ data: Array<{ category: string; dayOfWeek: number; total: number }>; availableDays: number[] }>(
          availableUrl
        )
        const days = result.availableDays || []
        setAvailableDays(days)
        if (days.length > 0) {
          setSelectedDay((prev) => {
            if (prev === null || !days.includes(prev)) {
              return days[0]
            }
            return prev
          })
        } else {
          setSelectedDay(null)
          setLoading(false)
        }
      } catch {
        setAvailableDays([])
        setSelectedDay(null)
        setLoading(false)
      }
    }

    if (mounted) {
      fetchAvailableDays()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateFilter, mounted, availableUrl, bundleData, bundleLoading])

  React.useEffect(() => {
    if (bundleLoading !== undefined) {
      if (bundleLoading) {
        return
      }
      if (bundleData && bundleData.length > 0) {
        if (selectedDay === null) {
          setData([])
        } else {
          const filtered = bundleData.filter(d => d.dayOfWeek === selectedDay)
          setData(filtered)
        }
        setLoading(false)
        return
      }
    }

    const fetchData = async () => {
      if (selectedDay === null) {
        setData([])
        setLoading(false)
        return
      }

      const dataUrl = buildDayOfWeekUrl(buildDayParams(selectedDay))
      const cached = getCachedResponse<{ data: Array<{ category: string; dayOfWeek: number; total: number }>; availableDays: number[] }>(
        dataUrl,
      )
      if (cached) {
        setData(cached.data || [])
        setLoading(false)
        return
      }

      setLoading(true)
      try {
        const result = await deduplicatedFetch<{ data: Array<{ category: string; dayOfWeek: number; total: number }>; availableDays: number[] }>(
          dataUrl
        )
        const fetchedData = result.data || []

        if (fetchedData.length === 0 && availableDays.length > 1) {
          for (const day of availableDays) {
            if (day === selectedDay) continue

            const altUrl = buildDayOfWeekUrl(buildDayParams(day))
            const cachedAlt = getCachedResponse<{ data: Array<{ category: string; dayOfWeek: number; total: number }>; availableDays: number[] }>(
              altUrl,
            )
            if (cachedAlt?.data && cachedAlt.data.length > 0) {
              setSelectedDay(day)
              setData(cachedAlt.data)
              setLoading(false)
              return
            }

            const altResult = await deduplicatedFetch<{ data: Array<{ category: string; dayOfWeek: number; total: number }>; availableDays: number[] }>(
              altUrl
            )

            if (altResult.data && altResult.data.length > 0) {
              setSelectedDay(day)
              setData(altResult.data)
              setLoading(false)
              return
            }
          }
        }

        setData(fetchedData)
      } catch {
        setData([])
      } finally {
        setLoading(false)
      }
    }

    if (mounted && selectedDay !== null) {
      fetchData()
    }
  }, [selectedDay, dateFilter, mounted, availableDays, buildDayParams, bundleData, bundleLoading])

  const palette = React.useMemo(() => {
    const p = getShuffledPalette("analytics:dayOfWeekCategory")
    return p.length ? p : DEFAULT_FALLBACK_PALETTE
  }, [getShuffledPalette])

  const isDark = resolvedTheme === "dark"
  const textColor = getChartTextColor(isDark)
  const gridColor = getChartAxisLineColor(isDark)

  const topCategories = React.useMemo(() => data.slice(0, 10), [data])

  // Sort descending by total so largest segments are at top (Nivo renders first key at top)
  const sortedCategories = React.useMemo(() =>
    [...topCategories].sort((a, b) => b.total - a.total),
    [topCategories]
  )

  const categoryKeys = React.useMemo(() =>
    sortedCategories.map(d => d.category),
    [sortedCategories]
  )

  const categoryColors = React.useMemo(() => {
    const colorMap = new Map<string, string>()
    sortedCategories.forEach((d, index) => {
      colorMap.set(d.category, palette[index % palette.length])
    })
    return colorMap
  }, [sortedCategories, palette])

  const nivoData = React.useMemo(() => {
    if (selectedDay === null || sortedCategories.length === 0) return []
    const row: Record<string, number | string> = { day: DAY_NAMES[selectedDay] }
    sortedCategories.forEach(d => {
      row[d.category] = d.total
    })
    return [row]
  }, [sortedCategories, selectedDay])

  const dayTotal = React.useMemo(() =>
    topCategories.reduce((sum, item) => sum + item.total, 0),
    [topCategories]
  )

  const dayOfWeekSelectRowEl =
    availableDays.length > 0 ? (
      <div className="flex w-full shrink-0 justify-center px-2 sm:px-6">
        <Select
          value={selectedDay !== null ? selectedDay.toString() : ""}
          onValueChange={(value) => setSelectedDay(parseInt(value, 10))}
        >
          <SelectTrigger
            className="w-32"
            size="sm"
            aria-label="Select day of week"
          >
            <SelectValue placeholder="Select day" />
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            {availableDays.map((day) => (
              <SelectItem key={day} value={day.toString()} className="rounded-lg">
                {DAY_NAMES[day]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    ) : null

  if (!mounted) {
    return (
      <Card className="@container/card gap-[20px]">
        <CardHeader className="pb-0">
          <div className="flex items-center gap-2">
            <GridStackCardDragHandle />
            <ChartFavoriteButton
              chartId="dayOfWeekCategory"
              chartTitle="Day of Week Category Spending"
              size="md"
            />
            <CardTitle>Day of Week Category Spending</CardTitle>
          </div>
          <CardAction className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
            <DayOfWeekCategoryInfoTrigger />
          </CardAction>
        </CardHeader>
        {dayOfWeekSelectRowEl}
        <CardContent className="px-2 pt-0 sm:px-6 h-[250px]">
          <ChartLoadingState
            isLoading
            skeletonType="bar"
            emptyTitle={emptyTitle}
            emptyDescription={emptyDescription}
          />
        </CardContent>
      </Card>
    )
  }

  if (loading) {
    return (
      <Card className="@container/card gap-[20px]">
        <CardHeader className="pb-0">
          <div className="flex items-center gap-2">
            <GridStackCardDragHandle />
            <ChartFavoriteButton
              chartId="dayOfWeekCategory"
              chartTitle="Day of Week Category Spending"
              size="md"
            />
            <CardTitle>Day of Week Category Spending</CardTitle>
          </div>
          <CardAction className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
            <DayOfWeekCategoryInfoTrigger />
          </CardAction>
        </CardHeader>
        {dayOfWeekSelectRowEl}
        <CardContent className="px-2 pt-0 sm:px-6 h-[250px]">
          <ChartLoadingState
            isLoading
            skeletonType="bar"
            emptyTitle={emptyTitle}
            emptyDescription={emptyDescription}
          />
        </CardContent>
      </Card>
    )
  }

  if (!availableDays.length || selectedDay === null) {
    return (
      <Card className="@container/card gap-[20px]">
        <CardHeader className="pb-0">
          <div className="flex items-center gap-2">
            <GridStackCardDragHandle />
            <ChartFavoriteButton
              chartId="dayOfWeekCategory"
              chartTitle="Day of Week Category Spending"
              size="md"
            />
            <CardTitle>Day of Week Category Spending</CardTitle>
          </div>
          <CardAction className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
            <DayOfWeekCategoryInfoTrigger />
          </CardAction>
        </CardHeader>
        {dayOfWeekSelectRowEl}
        <CardContent className="px-2 pt-0 sm:px-6 h-[250px]">
          <ChartLoadingState
            skeletonType="bar"
            emptyTitle={emptyTitle || "No spending data"}
            emptyDescription={emptyDescription || "Import your bank statements to see spending by day of week"}
          />
        </CardContent>
      </Card>
    )
  }

  const renderChart = () => (
    <ResponsiveBar
      data={nivoData}
      keys={categoryKeys}
      indexBy="day"
      groupMode="stacked"
      margin={{ top: 16, right: 16, bottom: 40, left: 60 }}
      padding={0.3}
      colors={({ id }) => categoryColors.get(id as string) ?? palette[0]}
      borderRadius={4}
      enableLabel={false}
      axisBottom={{ tickSize: 0, tickPadding: 8 }}
      axisLeft={{
        tickSize: 0,
        tickPadding: 8,
        format: (v: number) => {
          if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`
          if (v >= 1_000) return `${(v / 1_000).toFixed(0)}K`
          return formatCurrency(v, { maximumFractionDigits: 0 })
        },
      }}
      enableGridY={true}
      gridYValues={5}
      theme={{
        text: { fill: textColor, fontSize: 11 },
        axis: {
          ticks: { text: { fill: textColor } },
          domain: { line: { stroke: gridColor } },
        },
        grid: {
          line: {
            stroke: gridColor,
            strokeWidth: 0.5,
            strokeDasharray: "3,3",
          },
        },
      }}
      tooltip={({ id, value, color }) => (
        <NivoChartTooltip
          title={String(id)}
          titleColor={color}
          value={formatCurrency(value as number)}
        />
      )}
      animate={true}
      motionConfig="gentle"
      barComponent={HoverableBar}
    />
  )

  return (
    <>
      <ChartFullscreenModal
        isOpen={isFullscreen}
        onClose={() => setIsFullscreen(false)}
        title="Day of Week Category Spending"
        description="Compare spending across categories by day"
        headerActions={<DayOfWeekCategoryInfoTrigger forFullscreen />}
      >
        <div className="h-full w-full min-h-[400px] flex flex-col">
          {dayOfWeekSelectRowEl ? (
            <div className="shrink-0 pb-2">{dayOfWeekSelectRowEl}</div>
          ) : null}
          <div className="flex-1 min-h-0" key={`${selectedDay}-${colorScheme}`}>
            {renderChart()}
          </div>
          <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs text-muted-foreground mt-2">
            {categoryKeys.map((cat) => (
              <div key={cat} className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: categoryColors.get(cat) }} />
                <span className="font-medium text-foreground truncate max-w-[120px]" title={cat}>{cat}</span>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-end gap-1 px-4 py-2 text-xs text-muted-foreground border-t">
            <span>Total:</span>
            <span className="font-semibold text-foreground">{formatCurrency(dayTotal)}</span>
          </div>
        </div>
      </ChartFullscreenModal>

      <Card className="@container/card gap-[20px]">
        <CardHeader className="pb-0">
          <div className="flex items-center gap-2">
            <GridStackCardDragHandle />
            <ChartExpandButton onClick={() => setIsFullscreen(true)} />
            <ChartFavoriteButton
              chartId="dayOfWeekCategory"
              chartTitle="Day of Week Category Spending"
              size="md"
            />
            <CardTitle>Day of Week Category Spending</CardTitle>
          </div>
          <CardAction className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
            <DayOfWeekCategoryInfoTrigger />
          </CardAction>
        </CardHeader>
        {dayOfWeekSelectRowEl}
        <CardContent className="px-2 pt-0 sm:px-6 flex-1 min-h-0 flex flex-col">
          {topCategories.length > 0 ? (
            <>
              <div className="h-full w-full min-h-[210px]" key={`${selectedDay}-${colorScheme}`}>
                {renderChart()}
              </div>
              <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs text-muted-foreground mt-2">
                {categoryKeys.map((cat) => (
                  <div key={cat} className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: categoryColors.get(cat) }} />
                    <span className="font-medium text-foreground truncate max-w-[120px]" title={cat}>{cat}</span>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-end gap-1 pt-2 text-xs text-muted-foreground">
                <span>Total:</span>
                <span className="font-semibold text-foreground">{formatCurrency(dayTotal)}</span>
              </div>
            </>
          ) : (
            <div className="h-[250px]">
              <ChartLoadingState
                skeletonType="bar"
                emptyTitle={emptyTitle || "No spending data"}
                emptyDescription={emptyDescription || "No transactions recorded for this day yet"}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </>
  )
})

ChartDayOfWeekCategory.displayName = "ChartDayOfWeekCategory"
