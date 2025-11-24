"use client"

import { useState, useEffect, useMemo } from "react"
import { useTheme } from "next-themes"
import { ResponsivePie } from "@nivo/pie"
import { useColorScheme } from "@/components/color-scheme-provider"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { IconInfoCircle } from "@tabler/icons-react"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface ChartExpensesPieProps {
  data?: Array<{
    id: string
    label: string
    value: number
  }>
}

// Dark colors that require white text
const darkColors = ["#696969", "#464646", "#2F2F2F", "#252525"]

// Gold palette colors that require white text (black and brown)
const goldDarkColors = ["#000000", "#361c1b", "#754232", "#cd894a"]

// Helper function to determine text color based on slice color
const getTextColor = (sliceColor: string, colorScheme?: string): string => {
  if (colorScheme === "gold") {
    return goldDarkColors.includes(sliceColor) ? "#ffffff" : "#000000"
  }
  return darkColors.includes(sliceColor) ? "#ffffff" : "#000000"
}

export function ChartExpensesPie({ data: baseData = [] }: ChartExpensesPieProps) {
  const { resolvedTheme } = useTheme()
  const { colorScheme, getPalette } = useColorScheme()
  const [mounted, setMounted] = useState(false)
  const [isInfoOpen, setIsInfoOpen] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])
  
  // Dynamically assign colors based on number of parts (max 7)
  // For all palettes: darker colors = larger amounts, lighter colors = smaller amounts
  const dataWithColors = useMemo(() => {
    const numParts = Math.min(baseData.length, 7)
    const palette = getPalette().filter(color => color !== "#c3c3c3")
    
    // Sort by value descending (highest first) and assign colors
    // Darker colors go to higher values, lighter colors to lower values
    const sorted = [...baseData].sort((a, b) => b.value - a.value)
    // Reverse palette so darkest colors are first (for highest values)
    const reversedPalette = [...palette].reverse().slice(0, numParts)
    return sorted.map((item, index) => ({
      ...item,
      color: reversedPalette[index % reversedPalette.length]
    }))
  }, [baseData, colorScheme, getPalette])
  
  const data = dataWithColors
  
  const colorConfig = colorScheme === "colored" 
    ? { datum: "data.color" as const }
    : { datum: "data.color" as const } // Use assigned colors from darkDataWithColors

  const isDark = resolvedTheme === "dark"

  const textColor = isDark ? "#9ca3af" : "#4b5563"
  const arcLinkLabelColor = isDark ? "#d1d5db" : "#374151"

  if (!mounted) {
    return (
      <Card className="@container/card">
        <CardHeader>
          <CardTitle>Expense Breakdown</CardTitle>
          <CardDescription>Your spending by category</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[400px] w-full" />
        </CardContent>
      </Card>
    )
  }

  // Don't render chart if data is empty
  if (!baseData || baseData.length === 0) {
    return (
      <Card className="@container/card">
        <CardHeader>
          <CardTitle>Expense Breakdown</CardTitle>
          <CardDescription>
            <span className="hidden @[540px]/card:block">
              Distribution of your monthly expenses across categories
            </span>
            <span className="@[540px]/card:hidden">Monthly expense distribution</span>
          </CardDescription>
          <CardAction>
            <Popover open={isInfoOpen} onOpenChange={setIsInfoOpen}>
              <PopoverTrigger asChild>
                <button 
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  onMouseEnter={() => setIsInfoOpen(true)}
                  onMouseLeave={() => setIsInfoOpen(false)}
                >
                  <IconInfoCircle className="h-4 w-4" />
                </button>
              </PopoverTrigger>
              <PopoverContent 
                className="w-80" 
                align="end"
                onMouseEnter={() => setIsInfoOpen(true)}
                onMouseLeave={() => setIsInfoOpen(false)}
              >
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm">Expense Breakdown</h4>
                  <p className="text-sm text-muted-foreground">
                    This pie chart shows how your total expenses are distributed across different spending categories.
                  </p>
                  <p className="text-sm text-muted-foreground">
                    <strong>How it works:</strong> Each slice represents a category, with the size proportional to the amount spent. Hover over slices to see exact amounts and percentages. Larger slices indicate categories where you spend more.
                  </p>
                </div>
              </PopoverContent>
            </Popover>
          </CardAction>
        </CardHeader>
        <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
          <div className="h-[400px] w-full flex items-center justify-center text-muted-foreground">
            No data available
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
      <Card className="@container/card">
        <CardHeader>
          <CardTitle>Expense Breakdown</CardTitle>
          <CardDescription>
            <span className="hidden @[540px]/card:block">
              Distribution of your monthly expenses across categories
            </span>
            <span className="@[540px]/card:hidden">Monthly expense distribution</span>
          </CardDescription>
          <CardAction>
            <Popover open={isInfoOpen} onOpenChange={setIsInfoOpen}>
              <PopoverTrigger asChild>
                <button 
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  onMouseEnter={() => setIsInfoOpen(true)}
                  onMouseLeave={() => setIsInfoOpen(false)}
                >
                  <IconInfoCircle className="h-4 w-4" />
                </button>
              </PopoverTrigger>
              <PopoverContent 
                className="w-80" 
                align="end"
                onMouseEnter={() => setIsInfoOpen(true)}
                onMouseLeave={() => setIsInfoOpen(false)}
              >
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm">Expense Breakdown</h4>
                  <p className="text-sm text-muted-foreground">
                    This pie chart shows how your total expenses are distributed across different spending categories.
                  </p>
                  <p className="text-sm text-muted-foreground">
                    <strong>How it works:</strong> Each slice represents a category, with the size proportional to the amount spent. Hover over slices to see exact amounts and percentages. Larger slices indicate categories where you spend more.
                  </p>
                </div>
              </PopoverContent>
            </Popover>
          </CardAction>
        </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <div className="h-[400px] w-full" key={colorScheme}>
          <ResponsivePie
            data={data}
            margin={{ top: 40, right: 80, bottom: 40, left: 80 }}
            innerRadius={0.5}
            padAngle={0.7}
            cornerRadius={3}
            activeOuterRadiusOffset={8}
            borderWidth={0}
            arcLinkLabelsSkipAngle={10}
            arcLinkLabelsTextColor={arcLinkLabelColor}
            arcLinkLabelsThickness={2}
            arcLinkLabelsColor={{ from: "color" }}
            arcLabelsSkipAngle={20}
            arcLabelsTextColor={(d: { color: string }) => getTextColor(d.color, colorScheme)}
            valueFormat={(value) => `$${value.toFixed(2)}`}
            colors={colorConfig}
            theme={{
              text: {
                fill: textColor,
                fontSize: 12,
              },
              tooltip: {
                container: {
                  background: "#ffffff",
                  color: "#000000",
                  fontSize: 12,
                  borderRadius: "8px",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                  padding: "8px 12px",
                  border: "1px solid #e2e8f0",
                },
              },
            }}
          />
        </div>
      </CardContent>
    </Card>
  )
}

