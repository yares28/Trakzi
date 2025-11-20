"use client"

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

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

const circlePackingData = {
  name: "FY25 Budget",
  children: [
    {
      name: "Essentials",
      children: [
        { name: "Housing", value: 1800 },
        { name: "Utilities", value: 280 },
        { name: "Groceries", value: 450 },
      ],
    },
    {
      name: "Lifestyle",
      children: [
        { name: "Entertainment", value: 200 },
        { name: "Dining", value: 154 },
        { name: "Personal Care", value: 100 },
      ],
    },
    {
      name: "Financial",
      children: [
        { name: "Savings", value: 500 },
        { name: "Insurance", value: 300 },
        { name: "Healthcare", value: 120 },
      ],
    },
    {
      name: "Transport",
      children: [
        { name: "Transportation", value: 350 },
      ],
    },
  ],
}

const polarBarData = [
  { month: "Jan", Essentials: 1200, Lifestyle: 400, Transport: 200, Financial: 600, Utilities: 300 },
  { month: "Feb", Essentials: 1200, Lifestyle: 450, Transport: 180, Financial: 550, Utilities: 320 },
  { month: "Mar", Essentials: 1200, Lifestyle: 380, Transport: 220, Financial: 700, Utilities: 280 },
  { month: "Apr", Essentials: 1200, Lifestyle: 420, Transport: 210, Financial: 650, Utilities: 290 },
  { month: "May", Essentials: 1200, Lifestyle: 500, Transport: 240, Financial: 600, Utilities: 250 },
  { month: "Jun", Essentials: 1200, Lifestyle: 480, Transport: 230, Financial: 750, Utilities: 260 },
]

const radarData = [
  { capability: "Savings Rate", "This Year": 85, "Last Year": 70, "Target": 90 },
  { capability: "Debt Mgmt", "This Year": 92, "Last Year": 80, "Target": 95 },
  { capability: "Investments", "This Year": 78, "Last Year": 65, "Target": 85 },
  { capability: "Budgeting", "This Year": 88, "Last Year": 75, "Target": 90 },
  { capability: "Emergency Fund", "This Year": 95, "Last Year": 60, "Target": 100 },
]

const sankeyData = {
  nodes: [
    { id: "Revenue" },
    { id: "Subscriptions" },
    { id: "Services" },
    { id: "Marketplace" },
    { id: "Product Delivery" },
    { id: "Customer Success" },
    { id: "Growth" },
    { id: "Cash Reserve" },
  ],
  links: [
    { source: "Revenue", target: "Subscriptions", value: 64 },
    { source: "Revenue", target: "Services", value: 22 },
    { source: "Revenue", target: "Marketplace", value: 14 },
    { source: "Subscriptions", target: "Product Delivery", value: 34 },
    { source: "Subscriptions", target: "Customer Success", value: 20 },
    { source: "Services", target: "Customer Success", value: 10 },
    { source: "Services", target: "Growth", value: 12 },
    { source: "Marketplace", target: "Growth", value: 9 },
    { source: "Marketplace", target: "Cash Reserve", value: 5 },
    { source: "Customer Success", target: "Cash Reserve", value: 8 },
    { source: "Product Delivery", target: "Cash Reserve", value: 6 },
    { source: "Growth", target: "Cash Reserve", value: 4 },
  ],
}

const streamData = [
  {
    month: "Jan",
    Salary: 4850,
    Freelance: 1200,
    Dividends: 150,
    Interest: 50,
    Other: 200,
    Expenses: -3200,
  },
  {
    month: "Feb",
    Salary: 5100,
    Freelance: 1500,
    Dividends: 150,
    Interest: 55,
    Other: 100,
    Expenses: -3400,
  },
  {
    month: "Mar",
    Salary: 4900,
    Freelance: 800,
    Dividends: 180,
    Interest: 60,
    Other: 300,
    Expenses: -3100,
  },
  {
    month: "Apr",
    Salary: 5300,
    Freelance: 2000,
    Dividends: 160,
    Interest: 65,
    Other: 150,
    Expenses: -3600,
  },
  {
    month: "May",
    Salary: 5150,
    Freelance: 1800,
    Dividends: 200,
    Interest: 70,
    Other: 250,
    Expenses: -3300,
  },
  {
    month: "Jun",
    Salary: 5400,
    Freelance: 2200,
    Dividends: 220,
    Interest: 75,
    Other: 400,
    Expenses: -3800,
  },
]

const swarmData = [
  { id: "tx-1", group: "Essentials", price: 124, volume: 15 },
  { id: "tx-2", group: "Essentials", price: 85, volume: 12 },
  { id: "tx-3", group: "Essentials", price: 240, volume: 18 },
  { id: "tx-4", group: "Essentials", price: 45, volume: 8 },
  { id: "tx-5", group: "Lifestyle", price: 150, volume: 14 },
  { id: "tx-6", group: "Lifestyle", price: 65, volume: 10 },
  { id: "tx-7", group: "Lifestyle", price: 35, volume: 6 },
  { id: "tx-8", group: "Lifestyle", price: 90, volume: 11 },
  { id: "tx-9", group: "Transport", price: 45, volume: 9 },
  { id: "tx-10", group: "Transport", price: 30, volume: 7 },
  { id: "tx-11", group: "Transport", price: 60, volume: 10 },
  { id: "tx-12", group: "Financial", price: 300, volume: 19 },
  { id: "tx-13", group: "Financial", price: 150, volume: 16 },
  { id: "tx-14", group: "Essentials", price: 180, volume: 17 },
  { id: "tx-15", group: "Lifestyle", price: 120, volume: 13 },
  { id: "tx-16", group: "Transport", price: 25, volume: 5 },
  { id: "tx-17", group: "Essentials", price: 60, volume: 9 },
  { id: "tx-18", group: "Lifestyle", price: 200, volume: 16 },
  { id: "tx-19", group: "Financial", price: 450, volume: 20 },
  { id: "tx-20", group: "Transport", price: 80, volume: 12 },
  { id: "tx-21", group: "Essentials", price: 95, volume: 11 },
  { id: "tx-22", group: "Lifestyle", price: 110, volume: 13 },
  { id: "tx-23", group: "Transport", price: 55, volume: 8 },
  { id: "tx-24", group: "Financial", price: 250, volume: 18 },
  { id: "tx-25", group: "Essentials", price: 160, volume: 15 },
]

const treemapData = {
  name: "Net Worth",
  children: [
    {
      name: "Liquid Assets",
      children: [
        { name: "Savings Account", loc: 25000 },
        { name: "Checking Account", loc: 8000 },
        { name: "Cash", loc: 1500 },
      ],
    },
    {
      name: "Investments",
      children: [
        { name: "Stock Portfolio", loc: 45000 },
        { name: "ETFs", loc: 30000 },
        { name: "Crypto", loc: 5000 },
        { name: "Bonds", loc: 10000 },
      ],
    },
    {
      name: "Retirement",
      children: [
        { name: "401(k)", loc: 85000 },
        { name: "Roth IRA", loc: 22000 },
      ],
    },
    {
      name: "Property",
      children: [
        { name: "Home Equity", loc: 120000 },
        { name: "Vehicle", loc: 15000 },
      ],
    },
  ],
}

const radialBarData = [
  { name: "Self-Serve", uv: 24, pv: 1200, fill: "#6366f1" },
  { name: "Commercial", uv: 32, pv: 1800, fill: "#22c55e" },
  { name: "Enterprise", uv: 44, pv: 2400, fill: "#0ea5e9" },
  { name: "Strategic", uv: 58, pv: 2900, fill: "#f97316" },
  { name: "Government", uv: 18, pv: 900, fill: "#14b8a6" },
]

import { useColorScheme } from "@/components/color-scheme-provider"

export function ChartCirclePacking() {
  const { getPalette } = useColorScheme()
  return (
    <Card>
      <CardHeader>
        <CardTitle>Budget Distribution</CardTitle>
        <CardDescription>Visualizes how your budget is allocated across categories</CardDescription>
      </CardHeader>
      <CardContent className="h-[420px]">
        <ResponsiveCirclePacking
          data={circlePackingData}
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

export function ChartPolarBar() {
  const { getPalette } = useColorScheme()
  return (
    <Card>
      <CardHeader>
        <CardTitle>Household Spend Mix</CardTitle>
        <CardDescription>Track monthly expenses across key categories</CardDescription>
      </CardHeader>
      <CardContent className="h-[420px]">
        <ResponsivePolarBar
          data={polarBarData}
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

export function ChartRadar() {
  const { getPalette } = useColorScheme()
  return (
    <Card>
      <CardHeader>
        <CardTitle>Financial Health Score</CardTitle>
        <CardDescription>Assessment of your financial wellness</CardDescription>
      </CardHeader>
      <CardContent className="h-[420px]">
        <ResponsiveRadar
          data={radarData}
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

export function ChartSankey() {
  const { getPalette } = useColorScheme()
  return (
    <Card className="col-span-full">
      <CardHeader>
        <CardTitle>Cash Flow Sankey</CardTitle>
        <CardDescription>Follow revenue as it moves through the org</CardDescription>
      </CardHeader>
      <CardContent className="h-[500px]">
        <ResponsiveSankey
          data={sankeyData}
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

export function ChartStream() {
  const { getPalette } = useColorScheme()
  return (
    <Card className="col-span-full">
      <CardHeader>
        <CardTitle>Income Streams</CardTitle>
        <CardDescription>Monthly income breakdown by source</CardDescription>
      </CardHeader>
      <CardContent className="h-[420px]">
        <ResponsiveStream
          data={streamData}
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

export function ChartSwarmPlot() {
  const { getPalette } = useColorScheme()
  return (
    <Card className="col-span-full">
      <CardHeader>
        <CardTitle>Transaction History</CardTitle>
        <CardDescription>Recent transactions by category</CardDescription>
      </CardHeader>
      <CardContent className="h-[420px]">
        <ResponsiveSwarmPlot
          data={swarmData}
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

export function ChartTreeMap() {
  const { getPalette } = useColorScheme()
  return (
    <Card className="col-span-full">
      <CardHeader>
        <CardTitle>Net Worth Allocation</CardTitle>
        <CardDescription>Breakdown of your total assets</CardDescription>
      </CardHeader>
      <CardContent className="h-[420px]">
        <ResponsiveTreeMap
          data={treemapData}
          colors={getPalette()}
          identity="name"
          value="loc"
          valueFormat=".02s"
          margin={{ top: 10, right: 10, bottom: 10, left: 10 }}
          labelSkipSize={12}
          labelTextColor={{ from: "color", modifiers: [["darker", 1.2]] }}
          parentLabelPosition="left"
          parentLabelTextColor={{ from: "color", modifiers: [["darker", 2]] }}
          borderColor={{ from: "color", modifiers: [["darker", 0.1]] }}
        />
      </CardContent>
    </Card>
  )
}

export function ChartRadialBar({
  isAnimationActive = true,
}: {
  isAnimationActive?: boolean
}) {
  const { getPalette } = useColorScheme()
  const palette = getPalette()
  const coloredData = radialBarData.map((item, index) => ({
    ...item,
    fill: palette[index % palette.length]
  }))

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


