"use client"

import React, { useMemo, useState } from "react"
import { ResponsiveCirclePacking } from "@nivo/circle-packing"
import { PolarBarTooltipProps, ResponsivePolarBar } from "@nivo/polar-bar"
import { ResponsiveRadar } from "@nivo/radar"
import { ResponsiveSankey } from "@nivo/sankey"
import { ResponsiveStream } from "@nivo/stream"
import { ResponsiveSwarmPlot } from "@nivo/swarmplot"
import { ResponsiveTreeMap } from "@nivo/treemap"
import {
  Legend,
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
} from "recharts"
import { useTheme } from "next-themes"

import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { ChartFavoriteButton } from "@/components/chart-favorite-button"
import { IconInfoCircle } from "@tabler/icons-react"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

import { useColorScheme } from "@/components/color-scheme-provider"
import { toNumericValue } from "@/lib/utils"

interface CirclePackingNode {
  name: string
  value?: number
  children?: CirclePackingNode[]
}

const sanitizeCirclePackingNode = (node?: CirclePackingNode | null): CirclePackingNode => {
  if (!node) {
    return { name: "", children: [] }
  }
  return {
    name: node.name,
    value: node.value !== undefined ? toNumericValue(node.value) : undefined,
    children: node.children?.map(sanitizeCirclePackingNode) || []
  }
}

interface ChartCirclePackingProps {
  data?: CirclePackingNode
}

export function ChartCirclePacking({ data = { name: "", children: [] } }: ChartCirclePackingProps) {
  const { getPalette } = useColorScheme()
  const sanitizedData = useMemo(() => sanitizeCirclePackingNode(data), [data])
  
  // Check if data is empty
  if (!sanitizedData || !sanitizedData.children || sanitizedData.children.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Budget Distribution</CardTitle>
        </CardHeader>
        <CardContent className="h-[250px] flex items-center justify-center text-muted-foreground">
          No data available
        </CardContent>
      </Card>
    )
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Budget Distribution</CardTitle>
        <CardDescription>Visualizes how your budget is allocated across categories</CardDescription>
      </CardHeader>
      <CardContent className="h-[250px]">
        <ResponsiveCirclePacking
          data={sanitizedData}
          margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
          id="name"
          padding={4}
          enableLabels={true}
          // Our data is a single level of category nodes, so show labels for depth 1 leaves
          labelsFilter={(e) => e.node.depth === 1}
          labelsSkipRadius={10}
          colors={getPalette()}
        />
      </CardContent>
    </Card>
  )
}

interface ChartPolarBarProps {
  data?: Array<Record<string, string | number>> | { data: Array<Record<string, string | number>>; keys: string[] }
  keys?: string[]
}

const PolarBarTooltipContent = ({ arc }: PolarBarTooltipProps) => (
  <div className="rounded-md border bg-popover px-3 py-2 text-sm shadow-sm">
    <div className="font-medium">{arc.key}</div>
    <div className="text-muted-foreground">{arc.formattedValue}</div>
  </div>
)

export function ChartPolarBar({ data: dataProp = [], keys: keysProp }: ChartPolarBarProps) {
  const { getPalette } = useColorScheme()
  const { resolvedTheme } = useTheme()
  
  // Handle both old format (array) and new format (object with data and keys)
  const chartData = Array.isArray(dataProp) ? dataProp : dataProp.data || []
  const chartKeys = keysProp || (Array.isArray(dataProp) ? [] : dataProp.keys) || []
  const sanitizedChartData = useMemo(() => {
    if (!chartData || chartData.length === 0) return []
    return chartData.map(row => {
      const sanitized: Record<string, string | number> = {}
      Object.entries(row).forEach(([key, value]) => {
        if (key === "month") {
          sanitized[key] = String(value ?? "")
        } else {
          sanitized[key] = toNumericValue(value)
        }
      })
      return sanitized
    })
  }, [chartData])
  
  // If no keys provided and data is array, extract keys from first data item (excluding 'month')
  const finalKeys = chartKeys.length > 0 
    ? chartKeys 
    : (sanitizedChartData.length > 0 
        ? Object.keys(sanitizedChartData[0]).filter(key => key !== 'month')
        : [])
  const legendItemWidth = useMemo(() => {
    if (!finalKeys.length) return 70
    const longest = finalKeys.reduce((max, key) => Math.max(max, key.length), 0)
    const baseWidth = Math.min(Math.max(longest * 9, 90), 200)
    return Math.max(baseWidth - 20, 70)
  }, [finalKeys])
  const monthLabelColor = resolvedTheme === "dark" ? "oklch(0.708 0 0)" : "oklch(0.556 0 0)"
  const polarTheme = useMemo(
    () => ({
      axis: {
        ticks: {
          text: {
            fill: monthLabelColor,
          },
        },
      },
      legends: {
        text: {
          fill: monthLabelColor,
        },
      },
    }),
    [monthLabelColor]
  )
  
  if (!sanitizedChartData || sanitizedChartData.length === 0 || finalKeys.length === 0) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <ChartFavoriteButton
              chartId="householdSpendMix"
              chartTitle="Household Spend Mix"
              size="md"
            />
            <CardTitle>Household Spend Mix</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="h-[250px] flex items-center justify-center text-muted-foreground">
          No data available
        </CardContent>
      </Card>
    )
  }
  
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <ChartFavoriteButton
            chartId="householdSpendMix"
            chartTitle="Household Spend Mix"
            size="md"
          />
          <CardTitle>Household Spend Mix</CardTitle>
        </div>
        <CardDescription>Track monthly expenses across key categories</CardDescription>
      </CardHeader>
      <CardContent className="chart-polar-bar h-[250px]">
        <ResponsivePolarBar
          data={sanitizedChartData}
          keys={finalKeys}
          indexBy="month"
          valueSteps={5}
          valueFormat=">-$.0f"
          margin={{ top: 30, right: 20, bottom: 70, left: 20 }}
          innerRadius={0.25}
          cornerRadius={4}
          borderWidth={1}
          borderColor="#d1d5db"
          arcLabelsSkipRadius={28}
          radialAxis={{ angle: 180, tickSize: 5, tickPadding: 5, tickRotation: 0, ticksPosition: 'after' }}
          circularAxisOuter={{ tickSize: 5, tickPadding: 15, tickRotation: 0 }}
          colors={getPalette()}
          tooltip={PolarBarTooltipContent}
          theme={polarTheme}
          legends={[
            {
              anchor: "bottom",
              direction: "row",
              translateY: 50,
              itemWidth: legendItemWidth,
              itemHeight: 16,
              symbolShape: "circle",
            },
          ]}
        />
      </CardContent>
    </Card>
  )
}

interface ChartRadarProps {
  data?: Array<Record<string, string | number>>
}

export function ChartRadar({ data = [] }: ChartRadarProps) {
  const { getPalette } = useColorScheme()
  const sanitizedData = useMemo(() => {
    if (!data || data.length === 0) return []
    return data.map(entry => {
      const sanitized: Record<string, string | number> = {}
      Object.entries(entry).forEach(([key, value]) => {
        sanitized[key] = key === "capability" ? String(value ?? "") : toNumericValue(value)
      })
      return sanitized
    })
  }, [data])
  
  if (!sanitizedData || sanitizedData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <ChartFavoriteButton
              chartId="financialHealthScore"
              chartTitle="Financial Health Score"
              size="md"
            />
            <CardTitle>Financial Health Score</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="h-[250px] flex items-center justify-center text-muted-foreground">
          No data available
        </CardContent>
      </Card>
    )
  }
  
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <ChartFavoriteButton
            chartId="financialHealthScore"
            chartTitle="Financial Health Score"
            size="md"
          />
          <CardTitle>Financial Health Score</CardTitle>
        </div>
        <CardDescription>Assessment of your financial wellness</CardDescription>
      </CardHeader>
      <CardContent className="h-[250px]">
        <ResponsiveRadar
          data={sanitizedData}
          keys={["This Year", "Last Year", "Target"]}
          indexBy="capability"
          margin={{ top: 70, right: 80, bottom: 40, left: 80 }}
          gridLabelOffset={36}
          dotSize={10}
          dotColor={{ theme: "background" }}
          dotBorderWidth={2}
          blendMode="multiply"
          colors={getPalette()}
          legends={[
            {
              anchor: "top-left",
              direction: "column",
              translateX: -50,
              translateY: -40,
              itemWidth: 80,
              itemHeight: 20,
              symbolShape: "circle",
            },
          ]}
        />
      </CardContent>
    </Card>
  )
}

interface ChartSankeyProps {
  data?: {
    nodes: Array<{ id: string }>
    links: Array<{ source: string; target: string; value: number }>
  }
}

export function ChartSankey({ data = { nodes: [], links: [] } }: ChartSankeyProps) {
  const { getPalette } = useColorScheme()
  const sanitizedData = useMemo(() => {
    const nodes = data?.nodes || []
    const links = data?.links?.map(link => ({
      ...link,
      value: toNumericValue(link.value)
    })) || []
    return { nodes, links }
  }, [data])
  
  if (!sanitizedData.nodes.length || !sanitizedData.links.length) {
    return (
      <Card className="col-span-full">
        <CardHeader>
          <CardTitle>Cash Flow Sankey</CardTitle>
        </CardHeader>
        <CardContent className="h-[250px] flex items-center justify-center text-muted-foreground">
          No data available
        </CardContent>
      </Card>
    )
  }
  
  return (
    <Card className="col-span-full">
      <CardHeader>
        <CardTitle>Cash Flow Sankey</CardTitle>
        <CardDescription>Follow revenue as it moves through the org</CardDescription>
      </CardHeader>
      <CardContent className="h-[250px]">
        <ResponsiveSankey
          data={sanitizedData}
          margin={{ top: 40, right: 160, bottom: 40, left: 50 }}
          align="justify"
          colors={getPalette()}
          nodeOpacity={1}
          nodeHoverOthersOpacity={0.35}
          nodeThickness={18}
          nodeSpacing={24}
          nodeBorderWidth={0}
          nodeBorderRadius={3}
          linkOpacity={0.5}
          linkHoverOthersOpacity={0.1}
          linkContract={3}
          labelPosition="outside"
          labelOrientation="vertical"
          labelPadding={16}
          labelTextColor={{ from: "color", modifiers: [["darker", 1]] }}
          legends={[
            {
              anchor: "bottom-right",
              direction: "column",
              translateX: 130,
              itemWidth: 100,
              itemHeight: 14,
              itemDirection: "right-to-left",
              itemsSpacing: 2,
              itemTextColor: "#999",
              symbolSize: 14,
            },
          ]}
        />
      </CardContent>
    </Card>
  )
}

interface ChartStreamProps {
  data?: Array<Record<string, string | number>>
}

export function ChartStream({ data = [] }: ChartStreamProps) {
  const { getPalette } = useColorScheme()
  const sanitizedData = useMemo(() => {
    if (!data || data.length === 0) return []
    return data.map(row => {
      const sanitized: Record<string, string | number> = {}
      Object.entries(row).forEach(([key, value]) => {
        sanitized[key] = key === "month" ? String(value ?? "") : toNumericValue(value)
      })
      return sanitized
    })
  }, [data])
  
  if (!sanitizedData || sanitizedData.length === 0) {
    return (
      <Card className="col-span-full">
        <CardHeader>
          <CardTitle>Income Streams</CardTitle>
        </CardHeader>
        <CardContent className="h-[250px] flex items-center justify-center text-muted-foreground">
          No data available
        </CardContent>
      </Card>
    )
  }
  
  return (
    <Card className="col-span-full">
      <CardHeader>
        <CardTitle>Income Streams</CardTitle>
        <CardDescription>Monthly income breakdown by source</CardDescription>
      </CardHeader>
      <CardContent className="h-[250px]">
        <ResponsiveStream
          data={sanitizedData}
          colors={getPalette()}
          keys={[
            "Salary",
            "Freelance",
            "Dividends",
            "Interest",
            "Other",
            "Expenses",
          ]}
          margin={{ top: 50, right: 110, bottom: 50, left: 60 }}
          enableGridX={true}
          enableGridY={false}
          offsetType="none"
          borderColor={{ theme: 'background' }}
          dotSize={8}
          dotBorderWidth={2}
          dotBorderColor={{ from: 'color', modifiers: [['darker', 0.7]] }}
          legends={[
            {
              anchor: 'bottom-right',
              direction: 'column',
              translateX: 100,
              itemWidth: 80,
              itemHeight: 20,
              symbolShape: 'circle'
            }
          ]}
        />
      </CardContent>
    </Card>
  )
}

interface ChartSwarmPlotProps {
  data?: Array<{ id: string; group: string; price: number; volume: number }>
}

export function ChartSwarmPlot({ data = [] }: ChartSwarmPlotProps) {
  const { getPalette } = useColorScheme()
  const sanitizedData = useMemo(() => {
    if (!data || data.length === 0) return []
    return data.map(item => ({
      ...item,
      price: toNumericValue(item.price),
      volume: toNumericValue(item.volume)
    }))
  }, [data])
  
  if (!sanitizedData || sanitizedData.length === 0) {
    return (
      <Card className="col-span-full">
        <CardHeader>
          <div className="flex items-center gap-2">
            <ChartFavoriteButton
              chartId="transactionHistory"
              chartTitle="Transaction History"
              size="md"
            />
            <CardTitle>Transaction History</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="h-[250px] flex items-center justify-center text-muted-foreground">
          No data available
        </CardContent>
      </Card>
    )
  }
  
  return (
    <Card className="col-span-full">
      <CardHeader>
        <div className="flex items-center gap-2">
          <ChartFavoriteButton
            chartId="transactionHistory"
            chartTitle="Transaction History"
            size="md"
          />
          <CardTitle>Transaction History</CardTitle>
        </div>
        <CardDescription>Recent transactions by category</CardDescription>
      </CardHeader>
      <CardContent className="h-[250px]">
        <ResponsiveSwarmPlot
          data={sanitizedData}
          colors={getPalette()}
          groups={["Essentials", "Lifestyle", "Transport", "Financial"]}
          value="price"
          valueScale={{ type: "linear", min: 0, max: 500, reverse: false }}
          size={{ key: "volume", values: [4, 20], sizes: [6, 20] }}
          forceStrength={4}
          simulationIterations={100}
          margin={{ top: 80, right: 100, bottom: 80, left: 100 }}
          axisBottom={{ legend: "category vs. amount", legendOffset: 40 }}
          axisLeft={{ legend: "amount ($)", legendOffset: -60 }}
        />
      </CardContent>
    </Card>
  )
}

interface ChartTreeMapProps {
  data?: {
    name: string
    children: Array<{
      name: string
      children: Array<{ name: string; loc: number }>
    }>
  }
}

export function ChartTreeMap({ data = { name: "", children: [] } }: ChartTreeMapProps) {
  const { getPalette } = useColorScheme()
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === "dark"
  const [isInfoOpen, setIsInfoOpen] = useState(false)
  const sanitizedData = useMemo(() => {
    if (!data || !data.children) return { name: "", children: [] }
    const sanitizeChildren = (node: ChartTreeMapProps["data"]): ChartTreeMapProps["data"] => ({
      name: node?.name || "",
      children: node?.children?.map(child => ({
        name: child.name,
        children: child.children.map(grandchild => ({
          name: grandchild.name,
          loc: toNumericValue(grandchild.loc)
        }))
      })) || []
    })
    return sanitizeChildren(data)
  }, [data])
  
  if (!sanitizedData || !sanitizedData.children || sanitizedData.children.length === 0) {
    return (
      <Card className="col-span-full">
        <CardHeader>
          <CardTitle>Net Worth Allocation</CardTitle>
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
                  <h4 className="font-semibold text-sm">Net Worth Allocation</h4>
                  <p className="text-sm text-muted-foreground">
                    This treemap provides a visual breakdown of your expenses by category, where the size of each rectangle represents the spending amount.
                  </p>
                  <p className="text-sm text-muted-foreground">
                    <strong>How it works:</strong> Larger rectangles indicate categories with higher spending. Click on any category rectangle to open a detailed view showing all transactions for that category, filtered by month.
                  </p>
                </div>
              </PopoverContent>
            </Popover>
          </CardAction>
        </CardHeader>
        <CardContent className="h-[250px] flex items-center justify-center text-muted-foreground">
          No data available
        </CardContent>
      </Card>
    )
  }
  
  return (
    <>
      <Card className="col-span-full">
        <CardHeader>
          <CardTitle>Net Worth Allocation</CardTitle>
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
                  <h4 className="font-semibold text-sm">Net Worth Allocation</h4>
                  <p className="text-sm text-muted-foreground">
                    This treemap provides a visual breakdown of your expenses by category, where the size of each rectangle represents the spending amount.
                  </p>
                  <p className="text-sm text-muted-foreground">
                    <strong>How it works:</strong> Larger rectangles indicate categories with higher spending. Click on any category rectangle to open a detailed view showing all transactions for that category, filtered by month.
                  </p>
                </div>
              </PopoverContent>
            </Popover>
          </CardAction>
        </CardHeader>
        <CardContent className="h-[250px]">
          <ResponsiveTreeMap
            data={sanitizedData}
            colors={getPalette()}
            identity="name"
            value="loc"
            valueFormat=".02s"
            margin={{ top: 10, right: 10, bottom: 10, left: 10 }}
            labelSkipSize={12}
            labelTextColor="#000000"
            // labelRotation removed for type compatibility; labels rendered unrotated by default
            label={(node) => {
              // Hide labels if rectangle is 28×49 or smaller
              if (node.width <= 28 || node.height <= 49) {
                return ""
              }
              // If text has multiple words, show only the first word
              const name = node.data.name || ""
              const words = name.trim().split(/\s+/)
              return words.length > 1 ? words[0] : name
            }}
            parentLabelPosition="left"
            parentLabelTextColor="#000000"
            parentLabel={(node) => {
              // Hide parent labels if rectangle is 28×49 or smaller
              if (node.width <= 28 || node.height <= 49) {
                return ""
              }
              // If text has multiple words, show only the first word
              const name = node.data.name || ""
              const words = name.trim().split(/\s+/)
              return words.length > 1 ? words[0] : name
            }}
            borderColor={{ from: "color", modifiers: [["darker", 0.1]] }}
            tooltip={({ node }) => {
              const tooltipBg = isDark ? '#1f2937' : '#ffffff'
              const tooltipText = isDark ? '#f3f4f6' : '#000000'
              const tooltipSecondary = isDark ? '#9ca3af' : '#666666'
              const tooltipBorder = isDark ? '#374151' : '#e2e8f0'
              
              return (
                <div style={{
                  background: tooltipBg,
                  padding: '8px 12px',
                  borderRadius: '8px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                  border: `1px solid ${tooltipBorder}`,
                  fontSize: '12px'
                }}>
                  <div style={{ fontWeight: 600, marginBottom: '4px', color: tooltipText }}>
                    {node.data.name}
                  </div>
                  <div style={{ color: tooltipSecondary }}>
                    {node.formattedValue}
                  </div>
                </div>
              )
            }}
          />
        </CardContent>
      </Card>
    </>
  )
}

interface ChartRadialBarProps {
  data?: Array<{ name: string; uv: number; pv: number; fill?: string }>
  isAnimationActive?: boolean
  budgets?: Record<string, number>
  onBudgetChange?: (category: string, budget: number) => void
  availableCategories?: string[]
  onCategoryChange?: (prevCategory: string, nextCategory: string) => void
}

export function ChartRadialBar({
  data: radialBarData = [],
  isAnimationActive = true,
  budgets = {},
  onBudgetChange,
  availableCategories,
  onCategoryChange,
}: ChartRadialBarProps) {
  const { getPalette } = useColorScheme()
  const palette = getPalette()
  const { resolvedTheme } = useTheme()
  const [editingCategory, setEditingCategory] = React.useState<string | null>(null)
  const [budgetInputs, setBudgetInputs] = React.useState<Record<string, string>>({})
  const [localBudgets, setLocalBudgets] = React.useState<Record<string, number>>(budgets)
  const [dateFilter, setDateFilter] = React.useState<string | null>(null)
  const [mounted, setMounted] = React.useState(false)
  const [tooltip, setTooltip] = React.useState<{ category: string; spent: number; budget: number; percentage: string; exceeded: boolean; color: string } | null>(null)
  const [tooltipPosition, setTooltipPosition] = React.useState<{ x: number; y: number } | null>(null)
  const containerRef = React.useRef<HTMLDivElement>(null)

  // Update local budgets when prop changes
  React.useEffect(() => {
    setLocalBudgets(budgets)
  }, [budgets])

  // Track current date filter from localStorage + custom event
  React.useEffect(() => {
    if (typeof window === "undefined") return

    const saved = window.localStorage.getItem("dateFilter")
    setDateFilter(saved)

    const handleFilterChange = (event: Event) => {
      const custom = event as CustomEvent
      setDateFilter(
        typeof custom.detail === "string" || custom.detail === null
          ? custom.detail
          : null
      )
    }

    window.addEventListener("dateFilterChanged", handleFilterChange as EventListener)
    return () => {
      window.removeEventListener("dateFilterChanged", handleFilterChange as EventListener)
    }
  }, [])

  // Mount check for ResponsiveContainer
  React.useEffect(() => {
    setMounted(true)
  }, [])

  // Track mouse movement for tooltip positioning
  React.useEffect(() => {
    if (tooltip && containerRef.current) {
      const handleMouseMove = (e: MouseEvent) => {
        if (!containerRef.current) return
        const rect = containerRef.current.getBoundingClientRect()
        setTooltipPosition({
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
        })
      }
      
      window.addEventListener('mousemove', handleMouseMove)
      return () => {
        window.removeEventListener('mousemove', handleMouseMove)
      }
    } else {
      setTooltip(null)
      setTooltipPosition(null)
    }
  }, [tooltip])

  const getDefaultBudget = React.useCallback(
    (categoryName: string, spent: number) => {
      // If user has explicitly set a budget, always honor that
      if (localBudgets[categoryName] != null) {
        return localBudgets[categoryName]
      }

      // Yearly-style filters: All Time (null), last year, or specific year like "2025"
      const isYearFilter =
        dateFilter === null ||
        dateFilter === "lastyear" ||
        (!!dateFilter && /^\d{4}$/.test(dateFilter))

      const base = isYearFilter ? 10000 : 2000

      // Never set a default below what has already been spent
      return Math.max(base, spent || 0)
    },
    [dateFilter, localBudgets]
  )

  // Process data: uv = spent, pv = budget (or spent * 1.2 if no budget set)
  const processedData = radialBarData.map((item, index) => {
    const spent = toNumericValue(item.uv)
    const budget = getDefaultBudget(item.name, spent)
    const sanitizedBudget = toNumericValue(budget)
    const exceeded = spent > sanitizedBudget
    const ratio = sanitizedBudget > 0 ? Math.min(spent / sanitizedBudget, 1) : 0
    
    const base = {
      ...item,
      name: item.name,
      uv: Number(spent.toFixed(2)), // Spent amount (2 decimals)
      pv: Number(sanitizedBudget.toFixed(2)), // Budget amount (2 decimals)
      value: Number(ratio.toFixed(3)), // Normalized (0–1) for full-circle visualization
      fill: exceeded ? '#ef4444' : (item.fill || palette[index % palette.length]), // Red if exceeded
    }
    return base
  }).sort((a, b) => b.uv - a.uv) // largest spend first

  const handleBudgetSave = (category: string) => {
    const value = parseFloat(budgetInputs[category] || '0')
    if (!isNaN(value) && value >= 0) {
      const newBudgets = { ...localBudgets, [category]: value }
      setLocalBudgets(newBudgets)
      if (onBudgetChange) {
        onBudgetChange(category, value)
      }
    }
    setEditingCategory(null)
    setBudgetInputs({})
  }

  if (!radialBarData || radialBarData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Category Budget</CardTitle>
        </CardHeader>
        <CardContent className="h-[250px] flex items-center justify-center text-muted-foreground">
          No data available
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="relative">
        <CardTitle>Category Budget</CardTitle>
        <CardDescription>Track spending against your budget limits</CardDescription>
        <div className="absolute top-2 right-4 flex flex-col gap-1 z-10 w-[140px]">
          {processedData
            .slice()
            .reverse()
            .map((item) => {
            const isEditing = editingCategory === item.name
            const exceeded = item.uv > item.pv
            const percentage = item.pv > 0 ? ((item.uv / item.pv) * 100).toFixed(1) : '0'
            const budget = localBudgets[item.name] || item.pv
            
            return (
              <div key={item.name} className="flex items-center gap-1 bg-background/80 backdrop-blur-sm p-1 rounded border">
                {isEditing ? (
                  <div className="flex flex-col gap-1 w-full">
                    {availableCategories && availableCategories.length > 0 && (
                      <select
                        value={item.name}
                        onChange={(e) => {
                          const next = e.target.value
                          if (!next || next === item.name) return
                          const currentBudget = localBudgets[item.name] ?? budget
                          const newBudgets = { ...localBudgets }
                          delete newBudgets[item.name]
                          newBudgets[next] = currentBudget
                          setLocalBudgets(newBudgets)
                          setEditingCategory(next)
                          setBudgetInputs({ [next]: currentBudget.toFixed(2) })
                          if (onCategoryChange) {
                            onCategoryChange(item.name, next)
                          }
                        }}
                        className="w-full px-1 py-0.5 text-[0.7rem] border rounded bg-background"
                      >
                        {availableCategories.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </select>
                    )}
                    <div className="flex items-center gap-1 w-full">
                      <input
                        type="number"
                        step="10"
                        min="0"
                        value={budgetInputs[item.name] ?? Math.floor(budget)}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\./g, '')
                          setBudgetInputs({ ...budgetInputs, [item.name]: value })
                        }}
                        className="flex-1 min-w-0 px-1 py-0.5 text-[0.7rem] border rounded"
                        placeholder="Budget"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleBudgetSave(item.name)
                          if (e.key === 'Escape') {
                            setEditingCategory(null)
                            setBudgetInputs({})
                          }
                        }}
                      />
                      <button
                        onClick={() => handleBudgetSave(item.name)}
                        className="px-1 py-0.5 text-[0.7rem] bg-primary text-primary-foreground rounded hover:bg-primary/90"
                        title="Save"
                      >
                        ✓
                      </button>
                      <button
                        onClick={() => {
                          setEditingCategory(null)
                          setBudgetInputs({})
                        }}
                        className="px-1 py-0.5 text-[0.7rem] bg-muted rounded hover:bg-muted/80"
                        title="Cancel"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <button
                      onClick={() => {
                        setEditingCategory(item.name)
                        setBudgetInputs({ [item.name]: budget.toFixed(2) })
                      }}
                      className={`px-1.5 py-0.5 text-[0.7rem] rounded w-full flex items-center justify-between gap-1.5 hover:bg-muted/80 ${
                        exceeded ? 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400' : 'bg-muted'
                      }`}
                      title={`${item.name} – ${percentage}% – Spent $${item.uv.toFixed(2)} of $${budget.toFixed(2)}`}
                    >
                      <div className="flex flex-col items-start min-w-0">
                        <span className="truncate max-w-[120px]">
                          {item.name}
                        </span>
                        <span className="text-[0.65rem] text-muted-foreground truncate max-w-[120px]">
                          Budget: ${budget.toFixed(2)}
                        </span>
                      </div>
                      <span
                        className={`text-[0.65rem] font-medium flex-shrink-0 ${
                          exceeded ? 'text-red-500' : 'text-muted-foreground'
                        }`}
                      >
                        {percentage}%
                      </span>
                    </button>
                  </>
                )}
              </div>
            )
          })}
        </div>
      </CardHeader>
      <CardContent className="h-[250px]">
        {mounted && (
          <div ref={containerRef} className="relative h-full w-full">
            <ResponsiveContainer width="100%" height="100%" minHeight={250}>
              <RadialBarChart
                innerRadius="15%"
                outerRadius="100%"
                cx="50%"
                cy="50%"
                data={processedData}
                startAngle={180}
                endAngle={-180}
                onMouseMove={(data: any, index: number, e: any) => {
                  if (data && data.activePayload && data.activePayload[0]) {
                    const payload = data.activePayload[0].payload
                    const name = data.activePayload[0].name || payload.name || ""
                    const spent = toNumericValue(payload.uv)
                    const budget = toNumericValue(payload.pv)
                    const exceeded = spent > budget
                    const pct = budget > 0 ? ((spent / budget) * 100).toFixed(1) : '0'
                    const color = payload.fill || palette[0] || "#8884d8"
                    
                    if (containerRef.current && e) {
                      const rect = containerRef.current.getBoundingClientRect()
                      setTooltipPosition({
                        x: e.clientX - rect.left,
                        y: e.clientY - rect.top,
                      })
                      setTooltip({
                        category: name,
                        spent,
                        budget,
                        percentage: pct,
                        exceeded,
                        color,
                      })
                    }
                  }
                } as any}
                onMouseLeave={() => {
                  setTooltip(null)
                  setTooltipPosition(null)
                }}
              >
                <RadialBar
                  label={(props: {
                    x: number
                    y: number
                    textAnchor?: string
                    payload?: { uv?: number; pv?: number }
                  }) => {
                    const uv = toNumericValue(props.payload?.uv)
                    const pv = toNumericValue(props.payload?.pv)
                    const exceeded = uv > pv
                    return (
                      <text
                        x={props.x}
                        y={props.y}
                        fill={exceeded ? "#ef4444" : "#666"}
                        textAnchor={props.textAnchor as "start" | "end" | "inherit" | "middle" | undefined}
                        fontSize="12"
                        fontWeight={exceeded ? "bold" : "normal"}
                      >
                        {uv.toFixed(2)}
                      </text>
                    )
                  }}
                  background
                  dataKey="value"
                  isAnimationActive={isAnimationActive}
                />
                <Legend
                  iconSize={10}
                  layout="horizontal"
                  verticalAlign="bottom"
                  align="center"
                  wrapperStyle={{ paddingTop: 16 }}
                  formatter={(value: string) => {
                    const legendTextColor =
                      resolvedTheme === "dark" ? "#ffffff" : "#000000"
                    return (
                      <span style={{ color: legendTextColor, fontSize: 12 }}>
                        {value}
                      </span>
                    )
                  }}
                />
              </RadialBarChart>
            </ResponsiveContainer>
            {tooltip && tooltipPosition && (
            <div
              className="pointer-events-none absolute z-10 rounded-md border border-border/60 bg-background/95 px-3 py-2 text-xs shadow-lg"
              style={{
                left: Math.min(Math.max(tooltipPosition.x + 16, 8), (containerRef.current?.clientWidth || 800) - 8),
                top: Math.min(Math.max(tooltipPosition.y - 16, 8), (containerRef.current?.clientHeight || 250) - 8),
              }}
            >
              <div className="flex items-center gap-2 mb-1">
                <span
                  className="h-2.5 w-2.5 rounded-full border border-border/50"
                  style={{ backgroundColor: tooltip.color, borderColor: tooltip.color }}
                />
                <span className="font-medium text-foreground whitespace-nowrap">{tooltip.category}</span>
              </div>
              <div className="mt-1 text-[0.7rem] text-foreground/80">
                Used: {tooltip.percentage}%
              </div>
              <div className={`mt-0.5 font-mono text-[0.7rem] ${tooltip.exceeded ? 'text-destructive' : 'text-foreground/80'}`}>
                Spent: ${tooltip.spent.toFixed(2)}
              </div>
              <div className="mt-0.5 font-mono text-[0.7rem] text-foreground/80">
                Budget: ${Math.floor(tooltip.budget)}
              </div>
              {tooltip.exceeded && (
                <div className="mt-1 text-[0.7rem] text-destructive">
                  ⚠ Exceeded
                </div>
              )}
            </div>
          )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}




