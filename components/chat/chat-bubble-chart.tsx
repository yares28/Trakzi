"use client"

import { memo, useMemo } from "react"
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts"
import type { InlineChartSpec } from "@/lib/chat/parse-chart-spec"

const DEFAULT_COLORS = [
  "#6366f1", "#22d3ee", "#f59e0b", "#10b981",
  "#f43f5e", "#a78bfa", "#34d399", "#fb923c",
]

interface Props {
  spec: InlineChartSpec
}

function CustomTooltip({
  active,
  payload,
  unit,
}: {
  active?: boolean
  payload?: Array<{ name?: string; value?: number }>
  unit?: string
}) {
  if (!active || !payload?.length) return null
  const item = payload[0]
  return (
    <div className="rounded-lg border border-border/50 bg-background/95 px-2.5 py-1.5 text-xs shadow-md backdrop-blur-sm">
      <span className="font-semibold">{item.value}{unit ?? ""}</span>
    </div>
  )
}

export const ChatBubbleChart = memo(function ChatBubbleChart({ spec }: Props) {
  const { type, title, data, unit } = spec

  const rechartData = useMemo(
    () => data.map((d, i) => ({ name: d.label, value: d.value, color: d.color ?? DEFAULT_COLORS[i % DEFAULT_COLORS.length] })),
    [data]
  )

  return (
    <div className="my-2 rounded-xl border border-border/40 bg-muted/30 p-3">
      {title && (
        <p className="mb-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
          {title}
        </p>
      )}
      <ResponsiveContainer width="100%" height={140}>
        {type === "bar" ? (
          <BarChart data={rechartData} barSize={20} margin={{ top: 2, right: 4, left: -16, bottom: 0 }}>
            <XAxis
              dataKey="name"
              tick={{ fontSize: 10, fill: "currentColor" }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis tick={{ fontSize: 9 }} tickLine={false} axisLine={false} />
            <Tooltip content={<CustomTooltip unit={unit} />} cursor={{ fill: "transparent" }} />
            <Bar dataKey="value" radius={[4, 4, 0, 0]}>
              {rechartData.map((entry, i) => (
                <Cell key={i} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        ) : type === "line" ? (
          <LineChart data={rechartData} margin={{ top: 2, right: 4, left: -16, bottom: 0 }}>
            <XAxis
              dataKey="name"
              tick={{ fontSize: 10, fill: "currentColor" }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis tick={{ fontSize: 9 }} tickLine={false} axisLine={false} />
            <Tooltip content={<CustomTooltip unit={unit} />} />
            <Line
              type="monotone"
              dataKey="value"
              stroke={DEFAULT_COLORS[0]}
              strokeWidth={2}
              dot={{ r: 3, fill: DEFAULT_COLORS[0] }}
              activeDot={{ r: 4 }}
            />
          </LineChart>
        ) : (
          /* Pie */
          <PieChart>
            <Pie
              data={rechartData}
              cx="50%"
              cy="50%"
              innerRadius={36}
              outerRadius={58}
              paddingAngle={2}
              dataKey="value"
            >
              {rechartData.map((entry, i) => (
                <Cell key={i} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              content={({ active, payload }) =>
                active && payload?.[0] ? (
                  <div className="rounded-lg border border-border/50 bg-background/95 px-2 py-1 text-xs shadow-md">
                    <span className="font-medium">{payload[0].name}: </span>
                    <span>{payload[0].value}{unit ?? ""}</span>
                  </div>
                ) : null
              }
            />
          </PieChart>
        )}
      </ResponsiveContainer>

      {/* Legend for pie charts */}
      {type === "pie" && (
        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 justify-center">
          {rechartData.map((d, i) => (
            <span key={i} className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <span
                className="inline-block h-2 w-2 rounded-full"
                style={{ backgroundColor: d.color }}
              />
              {d.name}
            </span>
          ))}
        </div>
      )}
    </div>
  )
})

ChatBubbleChart.displayName = "ChatBubbleChart"
