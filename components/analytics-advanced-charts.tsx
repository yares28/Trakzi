"use client"

import { useState } from "react"
import { ResponsiveCirclePacking } from "@nivo/circle-packing"
import { ResponsivePolarBar } from "@nivo/polar-bar"
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
  Tooltip,
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
import { IconInfoCircle } from "@tabler/icons-react"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

import { useColorScheme } from "@/components/color-scheme-provider"

interface ChartCirclePackingProps {
  data?: {
    name: string
    children: Array<{
      name: string
      children: Array<{ name: string; value: number }>
    }>
  }
}

export function ChartCirclePacking({ data = { name: "", children: [] } }: ChartCirclePackingProps) {
  const { getPalette } = useColorScheme()
  
  // Check if data is empty
  if (!data || !data.children || data.children.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Budget Distribution</CardTitle>
          <CardDescription>Visualizes how your budget is allocated across categories</CardDescription>
        </CardHeader>
        <CardContent className="h-[420px] flex items-center justify-center text-muted-foreground">
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
      <CardContent className="h-[420px]">
        <ResponsiveCirclePacking
          data={data}
          margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
          id="name"
          padding={4}
          enableLabels={true}
          labelsFilter={(e) => 2 === e.node.depth}
          labelsSkipRadius={10}
          colors={getPalette()}
        />
      </CardContent>
    </Card>
  )
}

interface ChartPolarBarProps {
  data?: Array<Record<string, string | number>>
}

export function ChartPolarBar({ data = [] }: ChartPolarBarProps) {
  const { getPalette } = useColorScheme()
  
  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Household Spend Mix</CardTitle>
          <CardDescription>Track monthly expenses across key categories</CardDescription>
        </CardHeader>
        <CardContent className="h-[420px] flex items-center justify-center text-muted-foreground">
          No data available
        </CardContent>
      </Card>
    )
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Household Spend Mix</CardTitle>
        <CardDescription>Track monthly expenses across key categories</CardDescription>
      </CardHeader>
      <CardContent className="h-[420px]">
        <ResponsivePolarBar
          data={data}
          keys={["Essentials", "Lifestyle", "Transport", "Financial", "Utilities"]}
          indexBy="month"
          valueSteps={5}
          valueFormat=">-$.0f"
          margin={{ top: 30, right: 20, bottom: 70, left: 20 }}
          innerRadius={0.25}
          cornerRadius={2}
          borderWidth={1}
          arcLabelsSkipRadius={28}
          radialAxis={{ angle: 180, tickSize: 5, tickPadding: 5, tickRotation: 0, ticksPosition: 'after' }}
          circularAxisOuter={{ tickSize: 5, tickPadding: 15, tickRotation: 0 }}
          colors={getPalette()}
          legends={[
            {
              anchor: "bottom",
              direction: "row",
              translateY: 50,
              itemWidth: 90,
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
  
  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Financial Health Score</CardTitle>
          <CardDescription>Assessment of your financial wellness</CardDescription>
        </CardHeader>
        <CardContent className="h-[420px] flex items-center justify-center text-muted-foreground">
          No data available
        </CardContent>
      </Card>
    )
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Financial Health Score</CardTitle>
        <CardDescription>Assessment of your financial wellness</CardDescription>
      </CardHeader>
      <CardContent className="h-[420px]">
        <ResponsiveRadar
          data={data}
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
  
  if (!data || !data.nodes || data.nodes.length === 0 || !data.links || data.links.length === 0) {
    return (
      <Card className="col-span-full">
        <CardHeader>
          <CardTitle>Cash Flow Sankey</CardTitle>
          <CardDescription>Follow revenue as it moves through the org</CardDescription>
        </CardHeader>
        <CardContent className="h-[500px] flex items-center justify-center text-muted-foreground">
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
      <CardContent className="h-[500px]">
        <ResponsiveSankey
          data={data}
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
  
  if (!data || data.length === 0) {
    return (
      <Card className="col-span-full">
        <CardHeader>
          <CardTitle>Income Streams</CardTitle>
          <CardDescription>Monthly income breakdown by source</CardDescription>
        </CardHeader>
        <CardContent className="h-[420px] flex items-center justify-center text-muted-foreground">
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
      <CardContent className="h-[420px]">
        <ResponsiveStream
          data={data}
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
  
  if (!data || data.length === 0) {
    return (
      <Card className="col-span-full">
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
          <CardDescription>Recent transactions by category</CardDescription>
        </CardHeader>
        <CardContent className="h-[420px] flex items-center justify-center text-muted-foreground">
          No data available
        </CardContent>
      </Card>
    )
  }
  
  return (
    <Card className="col-span-full">
      <CardHeader>
        <CardTitle>Transaction History</CardTitle>
        <CardDescription>Recent transactions by category</CardDescription>
      </CardHeader>
      <CardContent className="h-[420px]">
        <ResponsiveSwarmPlot
          data={data}
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
  const [isInfoOpen, setIsInfoOpen] = useState(false)
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === "dark"
  const borderColor = isDark ? "#374151" : "#e5e7eb"
  
  if (!data || !data.children || data.children.length === 0) {
    return (
      <Card className="col-span-full">
        <CardHeader>
          <CardTitle>Net Worth Allocation</CardTitle>
          <CardDescription>Breakdown of your total assets</CardDescription>
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
        <CardContent className="h-[420px] flex items-center justify-center text-muted-foreground">
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
          <CardDescription>Breakdown of your total assets - Click on a category to see transactions</CardDescription>
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
        <CardContent className="h-[420px]">
          <ResponsiveTreeMap
            data={data}
            colors={getPalette()}
            identity="name"
            value="loc"
            valueFormat=".02s"
            margin={{ top: 10, right: 10, bottom: 10, left: 10 }}
            labelSkipSize={12}
            labelTextColor="#000000"
            labelRotation={0}
            label={(node) => {
              // Hide labels if rectangle is 28×49 or smaller
              if (node.width <= 28 || node.height <= 49) {
                return null
              }
              // If text has multiple words, show only the first word
              const name = node.data.name || ""
              const words = name.trim().split(/\s+/)
              return words.length > 1 ? words[0] : name
            }}
            parentLabelPosition="left"
            parentLabelTextColor="#000000"
            parentLabelRotation={0}
            parentLabel={(node) => {
              // Hide parent labels if rectangle is 28×49 or smaller
              if (node.width <= 28 || node.height <= 49) {
                return null
              }
              // If text has multiple words, show only the first word
              const name = node.data.name || ""
              const words = name.trim().split(/\s+/)
              return words.length > 1 ? words[0] : name
            }}
            borderColor={{ from: "color", modifiers: [["darker", 0.1]] }}
            tooltip={({ node }) => (
              <div style={{
                background: 'white',
                padding: '8px 12px',
                borderRadius: '4px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                fontSize: '12px'
              }}>
                <strong>{node.formattedValue}</strong>
                <div style={{ color: '#666', marginTop: '4px' }}>
                  {node.data.name}
                </div>
              </div>
            )}
          />
        </CardContent>
      </Card>
    </>
  )
}

interface ChartRadialBarProps {
  data?: Array<{ name: string; uv: number; pv: number; fill?: string }>
  isAnimationActive?: boolean
}

export function ChartRadialBar({
  data: radialBarData = [],
  isAnimationActive = true,
}: ChartRadialBarProps) {
  const { getPalette } = useColorScheme()
  const palette = getPalette()
  const coloredData = radialBarData.map((item, index) => ({
    ...item,
    fill: item.fill || palette[index % palette.length]
  }))

  if (!radialBarData || radialBarData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Customer Lifetime Value</CardTitle>
          <CardDescription>Radial view by key segments</CardDescription>
        </CardHeader>
        <CardContent className="h-[420px] flex items-center justify-center text-muted-foreground">
          No data available
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Customer Lifetime Value</CardTitle>
        <CardDescription>Radial view by key segments</CardDescription>
      </CardHeader>
      <CardContent className="h-[420px]">
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart
            innerRadius="15%"
            outerRadius="100%"
            cx="30%"
            cy="75%"
            data={coloredData}
            startAngle={180}
            endAngle={0}
          >
            <RadialBar
              label={{ fill: "#666", position: "insideStart" }}
              background
              dataKey="uv"
              isAnimationActive={isAnimationActive}
            />
            <Legend
              iconSize={10}
              width={120}
              height={140}
              layout="vertical"
              verticalAlign="middle"
              align="right"
            />
            <Tooltip />
          </RadialBarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}




