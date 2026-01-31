"use client"

import { memo, useState, useEffect, useMemo } from "react"
import { useTheme } from "next-themes"
import { ResponsiveChoropleth } from "@nivo/geo"
import { useColorScheme } from "@/components/color-scheme-provider"
import { useCurrency } from "@/components/currency-provider"
import { NivoChartTooltip } from "@/components/chart-tooltip"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

// World countries GeoJSON features - loaded dynamically
import worldCountries from "@/lib/data/world-countries.json"

export interface CountryData {
  id: string // ISO 3166-1 alpha-3 country code
  value: number
  label?: string
}

interface WorldMapChartProps {
  data?: CountryData[]
  isLoading?: boolean
  title?: string
  description?: string
}

export const WorldMapChart = memo(function WorldMapChart({
  data = [],
  isLoading = false,
  title = "Global Spending Distribution",
  description = "Spending breakdown by country",
}: WorldMapChartProps) {
  const { resolvedTheme } = useTheme()
  const { getPalette } = useColorScheme()
  const { formatCurrency } = useCurrency()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Get palette colors for the choropleth scale
  const colorScale = useMemo(() => {
    const palette = getPalette().filter(c => c !== "#c3c3c3")
    // Return colors from lightest to darkest for choropleth
    return [...palette].reverse().slice(0, 7)
  }, [getPalette])

  // Calculate domain for color scale
  const domain = useMemo(() => {
    if (data.length === 0) return [0, 100]
    const values = data.map(d => d.value)
    const min = Math.min(...values)
    const max = Math.max(...values)
    return [min, max]
  }, [data])

  const isDark = resolvedTheme === "dark"

  // Nivo theme configuration
  const nivoTheme = useMemo(() => ({
    background: "transparent",
    text: {
      fontSize: 11,
      fill: isDark ? "#ffffff" : "#000000",
    },
    tooltip: {
      container: {
        background: isDark ? "#1a1a1a" : "#ffffff",
        color: isDark ? "#ffffff" : "#000000",
        fontSize: 12,
        borderRadius: 8,
        boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
      },
    },
    legends: {
      text: {
        fontSize: 11,
        fill: isDark ? "#a1a1aa" : "#71717a",
      },
    },
  }), [isDark])

  // Loading skeleton
  if (!mounted || isLoading) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent className="flex-1 min-h-[500px]">
          <div className="h-full w-full animate-pulse bg-muted/50 rounded-lg" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 min-h-[500px]">
        <div className="h-full w-full">
          <ResponsiveChoropleth
            data={data}
            features={worldCountries.features}
            margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
            colors={colorScale.length > 0 ? colorScale : ["#e5e7eb", "#d1d5db", "#9ca3af", "#6b7280", "#4b5563", "#374151", "#1f2937"]}
            domain={domain}
            unknownColor={isDark ? "#27272a" : "#e5e7eb"}
            label="properties.name"
            valueFormat=".2s"
            projectionType="mercator"
            projectionScale={120}
            projectionTranslation={[0.5, 0.65]}
            projectionRotation={[0, 0, 0]}
            enableGraticule={true}
            graticuleLineColor={isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}
            borderWidth={0.5}
            borderColor={isDark ? "#3f3f46" : "#d4d4d8"}
            theme={nivoTheme}
            tooltip={({ feature }) => {
              // Feature properties are available at runtime but Nivo's types are incomplete
              type GeoFeature = { id?: string; properties?: { name?: string } }
              const geoFeature = feature as GeoFeature
              const featureId = geoFeature.id ?? ""
              const countryData = data.find(d => d.id === featureId)
              const value = countryData?.value ?? 0
              const countryName = geoFeature.properties?.name || featureId

              return (
                <NivoChartTooltip
                  title={String(countryName)}
                  titleColor={colorScale[Math.floor(colorScale.length / 2)]}
                  value={formatCurrency(value)}
                  subValue={countryData ? "Total spending" : "No data"}
                />
              )
            }}
            legends={[
              {
                anchor: "bottom-left",
                direction: "column",
                justify: true,
                translateX: 20,
                translateY: -20,
                itemsSpacing: 0,
                itemWidth: 94,
                itemHeight: 18,
                itemDirection: "left-to-right",
                itemTextColor: isDark ? "#a1a1aa" : "#71717a",
                itemOpacity: 0.85,
                symbolSize: 18,
                effects: [
                  {
                    on: "hover",
                    style: {
                      itemTextColor: isDark ? "#ffffff" : "#000000",
                      itemOpacity: 1,
                    },
                  },
                ],
              },
            ]}
          />
        </div>
      </CardContent>
    </Card>
  )
})

WorldMapChart.displayName = "WorldMapChart"
