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
      name: "Product",
      children: [
        { name: "Mobile", value: 210 },
        { name: "Web", value: 180 },
        { name: "Data Platform", value: 160 },
      ],
    },
    {
      name: "Customer Experience",
      children: [
        { name: "Support", value: 140 },
        { name: "Success", value: 130 },
        { name: "Enablement", value: 90 },
      ],
    },
    {
      name: "Go-To-Market",
      children: [
        { name: "Demand Gen", value: 170 },
        { name: "Field Sales", value: 195 },
        { name: "Channel", value: 120 },
      ],
    },
    {
      name: "Future Bets",
      children: [
        { name: "AI Lab", value: 150 },
        { name: "Automation R&D", value: 135 },
        { name: "Venture Fund", value: 100 },
      ],
    },
    {
      name: "Reserves",
      children: [
        { name: "Cash Buffer", value: 260 },
        { name: "Debt Paydown", value: 180 },
      ],
    },
  ],
}

const polarBarData = [
  { month: "Jan", Rent: 1180, Groceries: 520, Transport: 260, Savings: 620, Misc: 180 },
  { month: "Feb", Rent: 1180, Groceries: 540, Transport: 240, Savings: 580, Misc: 210 },
  { month: "Mar", Rent: 1180, Groceries: 510, Transport: 300, Savings: 650, Misc: 170 },
  { month: "Apr", Rent: 1180, Groceries: 495, Transport: 280, Savings: 690, Misc: 160 },
  { month: "May", Rent: 1180, Groceries: 470, Transport: 320, Savings: 720, Misc: 150 },
  { month: "Jun", Rent: 1180, Groceries: 450, Transport: 310, Savings: 760, Misc: 140 },
]

const radarData = [
  { capability: "Automation", "Squad Atlas": 82, "Squad Nova": 74, "Squad Pulse": 68 },
  { capability: "Customer Exp", "Squad Atlas": 76, "Squad Nova": 88, "Squad Pulse": 81 },
  { capability: "Compliance", "Squad Atlas": 70, "Squad Nova": 64, "Squad Pulse": 86 },
  { capability: "Cost Control", "Squad Atlas": 66, "Squad Nova": 72, "Squad Pulse": 60 },
  { capability: "Scalability", "Squad Atlas": 90, "Squad Nova": 78, "Squad Pulse": 92 },
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
    "North America": 32,
    EMEA: 22,
    APAC: 15,
    LATAM: 10,
    "SMB Deals": 18,
    "Enterprise Deals": 24,
  },
  {
    month: "Feb",
    "North America": 35,
    EMEA: 24,
    APAC: 18,
    LATAM: 12,
    "SMB Deals": 20,
    "Enterprise Deals": 26,
  },
  {
    month: "Mar",
    "North America": 38,
    EMEA: 26,
    APAC: 20,
    LATAM: 14,
    "SMB Deals": 23,
    "Enterprise Deals": 28,
  },
  {
    month: "Apr",
    "North America": 42,
    EMEA: 28,
    APAC: 22,
    LATAM: 15,
    "SMB Deals": 25,
    "Enterprise Deals": 31,
  },
  {
    month: "May",
    "North America": 46,
    EMEA: 30,
    APAC: 25,
    LATAM: 16,
    "SMB Deals": 27,
    "Enterprise Deals": 34,
  },
  {
    month: "Jun",
    "North America": 44,
    EMEA: 29,
    APAC: 26,
    LATAM: 17,
    "SMB Deals": 29,
    "Enterprise Deals": 32,
  },
]

const swarmData = [
  { id: "deal-1", group: "Inbound", price: 48, volume: 5 },
  { id: "deal-2", group: "Inbound", price: 95, volume: 7 },
  { id: "deal-3", group: "Inbound", price: 140, volume: 6 },
  { id: "deal-4", group: "Inbound", price: 180, volume: 8 },
  { id: "deal-5", group: "Channel", price: 225, volume: 9 },
  { id: "deal-6", group: "Channel", price: 265, volume: 10 },
  { id: "deal-7", group: "Channel", price: 320, volume: 11 },
  { id: "deal-8", group: "Channel", price: 360, volume: 13 },
  { id: "deal-9", group: "Enterprise", price: 410, volume: 15 },
  { id: "deal-10", group: "Enterprise", price: 455, volume: 17 },
  { id: "deal-11", group: "Enterprise", price: 480, volume: 19 },
  { id: "deal-12", group: "Enterprise", price: 510, volume: 20 },
  { id: "deal-13", group: "Inbound", price: 70, volume: 5 },
  { id: "deal-14", group: "Channel", price: 295, volume: 9 },
  { id: "deal-15", group: "Enterprise", price: 530, volume: 21 },
]

const treemapData = {
  name: "Portfolio",
  children: [
    {
      name: "Recurring",
      children: [
        { name: "Enterprise MRR", loc: 220 },
        { name: "Growth MRR", loc: 180 },
        { name: "SMB MRR", loc: 140 },
      ],
    },
    {
      name: "Services",
      children: [
        { name: "Implementation", loc: 130 },
        { name: "Advisory", loc: 110 },
        { name: "Managed Ops", loc: 95 },
      ],
    },
    {
      name: "Experiments",
      children: [
        { name: "Marketplace", loc: 85 },
        { name: "Payments", loc: 70 },
        { name: "Embedded Finance", loc: 60 },
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

export function ChartCirclePacking() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Budget Distribution</CardTitle>
        <CardDescription>Visualizes how cash is split across teams</CardDescription>
      </CardHeader>
      <CardContent className="h-[420px]">
        <ResponsiveCirclePacking
          data={circlePackingData}
          margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
          padding={4}
          enableLabels
          labelsFilter={(e) => e.node.depth === 2}
          labelsSkipRadius={12}
          colors={{ scheme: "spectral" }}
          colorBy="id"
        />
      </CardContent>
    </Card>
  )
}

export function ChartPolarBar() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Household Spend Mix</CardTitle>
        <CardDescription>Track monthly expenses across key categories</CardDescription>
      </CardHeader>
      <CardContent className="h-[420px]">
        <ResponsivePolarBar
          data={polarBarData}
          keys={["Rent", "Groceries", "Transport", "Savings", "Misc"]}
          indexBy="month"
          valueSteps={5}
          valueFormat=">-$.0f"
          margin={{ top: 30, right: 20, bottom: 70, left: 20 }}
          innerRadius={0.25}
          cornerRadius={2}
          borderWidth={1}
          arcLabelsSkipRadius={28}
          radialAxis={{ angle: 180, tickSize: 5, tickPadding: 5, tickRotation: 0 }}
          circularAxisOuter={{ tickSize: 5, tickPadding: 15, tickRotation: 0 }}
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
  return (
    <Card>
      <CardHeader>
        <CardTitle>Capability Readiness</CardTitle>
        <CardDescription>Compare delivery squads by strength area</CardDescription>
      </CardHeader>
      <CardContent className="h-[420px]">
        <ResponsiveRadar
          data={radarData}
          keys={["Squad Atlas", "Squad Nova", "Squad Pulse"]}
          indexBy="capability"
          margin={{ top: 70, right: 80, bottom: 40, left: 80 }}
          gridLabelOffset={36}
          dotSize={10}
          dotColor={{ theme: "background" }}
          dotBorderWidth={2}
          blendMode="multiply"
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
          colors={{ scheme: "category10" }}
          nodeOpacity={1}
          nodeHoverOthersOpacity={0.35}
          nodeThickness={18}
          nodeSpacing={24}
          nodeBorderWidth={0}
          nodeBorderRadius={3}
          linkOpacity={0.5}
          linkHoverOthersOpacity={0.1}
          linkContract={3}
          enableLinkGradient
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
  return (
    <Card>
      <CardHeader>
        <CardTitle>Revenue Stream</CardTitle>
        <CardDescription>Layered forecast by sales pod</CardDescription>
      </CardHeader>
      <CardContent className="h-[420px]">
        <ResponsiveStream
          data={streamData}
          keys={[
            "North America",
            "EMEA",
            "APAC",
            "LATAM",
            "SMB Deals",
            "Enterprise Deals",
          ]}
          margin={{ top: 50, right: 110, bottom: 50, left: 60 }}
          enableGridX
          enableGridY={false}
          borderColor={{ theme: "background" }}
          dotSize={8}
          dotBorderWidth={2}
          dotBorderColor={{ from: "color", modifiers: [["darker", 0.7]] }}
          legends={[
            {
              anchor: "bottom-right",
              direction: "column",
              translateX: 100,
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

export function ChartSwarmPlot() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Transaction Swarm</CardTitle>
        <CardDescription>Ticket sizes clustered by customer groups</CardDescription>
      </CardHeader>
      <CardContent className="h-[420px]">
        <ResponsiveSwarmPlot
          data={swarmData}
          groups={["Inbound", "Channel", "Enterprise"]}
          value="price"
          valueScale={{ type: "linear", min: 0, max: 500, reverse: false }}
          size={{ key: "volume", values: [4, 20], sizes: [6, 20] }}
          forceStrength={4}
          simulationIterations={100}
          margin={{ top: 80, right: 100, bottom: 80, left: 100 }}
          axisBottom={{ legend: "segment vs. deal size", legendOffset: 40 }}
          axisLeft={{ legend: "deal size ($K)", legendOffset: -60 }}
        />
      </CardContent>
    </Card>
  )
}

export function ChartTreeMap() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Asset Allocation</CardTitle>
        <CardDescription>Treemap of portfolio holdings</CardDescription>
      </CardHeader>
      <CardContent className="h-[420px]">
        <ResponsiveTreeMap
          data={treemapData}
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
            data={radialBarData}
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


