"use client"

import { useEffect, useMemo, useState } from "react"
import { ResponsiveRadar } from "@nivo/radar"
import { useTheme } from "next-themes"

import { ChartInfoPopover, ChartInfoPopoverCategoryControls } from "@/components/chart-info-popover"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { useColorScheme } from "@/components/color-scheme-provider"
import { toNumericValue } from "@/lib/utils"

const LIGHT_CATEGORY_TEXT = "oklch(0.556 0 0)"
const DARK_CATEGORY_TEXT = "oklch(0.708 0 0)"

type RadarDatum = Record<string, string | number>

type FinancialHealthYearSummary = {
  year: number
  income: number
  expenses: number
  savings: number
}

type FinancialHealthResponse = {
  data: RadarDatum[]
  years: FinancialHealthYearSummary[]
}

interface ChartRadarProps {
  categoryControls?: ChartInfoPopoverCategoryControls
}

export function ChartRadar({ categoryControls }: ChartRadarProps) {
  const { resolvedTheme } = useTheme()
  const { getPalette } = useColorScheme()
  const [chartData, setChartData] = useState<RadarDatum[]>([])
  const [yearSummaries, setYearSummaries] = useState<FinancialHealthYearSummary[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const palette = getPalette()

  useEffect(() => {
    const controller = new AbortController()

    async function loadNeonData() {
      setIsLoading(true)
      setError(null)
      try {
        const response = await fetch("/api/financial-health", {
          cache: "no-store",
          signal: controller.signal,
        })
        if (!response.ok) {
          throw new Error("Failed to load financial data")
        }
        const payload: FinancialHealthResponse = await response.json()
        if (!payload || !Array.isArray(payload.data)) {
          throw new Error("Unexpected response shape")
        }
        if (!controller.signal.aborted) {
          setChartData(payload.data as RadarDatum[])
          setYearSummaries(
            Array.isArray(payload.years)
              ? (payload.years as FinancialHealthYearSummary[])
              : []
          )
        }
      } catch (err) {
        if (controller.signal.aborted) return
        console.error("[ChartRadar] Failed to load Neon data:", err)
        setError(err instanceof Error ? err.message : "Failed to load data")
        setChartData([])
        setYearSummaries([])
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false)
        }
      }
    }

    void loadNeonData()

    return () => controller.abort()
  }, [])

  const sanitizedData = useMemo(() => {
    if (!chartData || chartData.length === 0) return []
    return chartData.map(entry => {
      const sanitized: RadarDatum = {}
      Object.entries(entry).forEach(([key, value]) => {
        sanitized[key] = key === "capability" ? String(value ?? "") : toNumericValue(value)
      })
      return sanitized
    })
  }, [chartData])

  const keys = useMemo(
    () => yearSummaries.map(summary => summary.year.toString()),
    [yearSummaries]
  )

  const themeMode = resolvedTheme === "dark" ? "dark" : "light"
  const categoryTextColor = themeMode === "dark" ? DARK_CATEGORY_TEXT : LIGHT_CATEGORY_TEXT

  const radarTheme = useMemo(
    () => ({
      textColor: categoryTextColor,
      axis: {
        ticks: {
          text: {
            fill: categoryTextColor,
          },
        },
        legend: {
          text: {
            fill: categoryTextColor,
          },
        },
      },
      legends: {
        text: {
          fill: categoryTextColor,
        },
      },
      labels: {
        text: {
          fill: categoryTextColor,
        },
      },
    }),
    [categoryTextColor]
  )

  const currencyFormatter = useMemo(
    () =>
      new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
      }),
    []
  )

  const legendEntries = yearSummaries.map((summary, index) => {
    const color = palette[index % palette.length] || palette[0] || "#94a3b8"
    return {
      id: summary.year.toString(),
      label: summary.year.toString(),
      color,
    }
  })

  const renderInfoTrigger = () => (
    <ChartInfoPopover
      title="Financial Health Score"
      description="Assessment of your financial wellness"
      details={[
        "The radar compares income, expenses, and your top spending categories year over year.",
        "Only years with available data and the three highest expense categories are shown to keep the chart legible."
      ]}
      ignoredFootnote="We surface at most three years of history and focus on the categories where you spend the most."
      categoryControls={categoryControls}
    />
  )

  const renderStatusCard = (message: string) => (
    <Card>
      <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CardTitle>Financial Health Score</CardTitle>
          <CardDescription>Assessment of your financial wellness</CardDescription>
        </div>
        <CardAction>{renderInfoTrigger()}</CardAction>
      </CardHeader>
      <CardContent className="h-[420px] flex items-center justify-center text-muted-foreground">
        {message}
      </CardContent>
    </Card>
  )

  if (isLoading) {
    return renderStatusCard("Loading Neon data…")
  }

  if (error) {
    return renderStatusCard(error)
  }

  if (!sanitizedData || sanitizedData.length === 0 || keys.length === 0) {
    return renderStatusCard("No data available")
  }

  return (
    <Card>
      <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CardTitle>Financial Health Score</CardTitle>
          <CardDescription>Assessment of your financial wellness</CardDescription>
        </div>
        <CardAction>{renderInfoTrigger()}</CardAction>
      </CardHeader>
      <CardContent className="h-[420px]">
        <ResponsiveRadar
          data={sanitizedData}
          keys={keys}
          indexBy="capability"
          margin={{ top: 70, right: 80, bottom: 40, left: 80 }}
          gridLabelOffset={36}
          dotSize={10}
          dotColor={{ theme: "background" }}
          dotBorderWidth={2}
          blendMode="multiply"
          colors={palette}
          theme={radarTheme}
          legends={legendEntries.length ? [
            {
              anchor: "top-left",
              direction: "column",
              translateX: -50,
              translateY: -40,
              itemWidth: 240,
              itemHeight: 18,
              symbolShape: "circle",
              symbolSize: 12,
              symbolBorderColor: "currentColor",
              data: legendEntries,
            },
          ] : []}
        />
      </CardContent>
    </Card>
  )
}

