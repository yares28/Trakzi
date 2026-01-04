import { Area, AreaChart, ResponsiveContainer, Tooltip } from "recharts"

type ScoreSparklineProps = {
  data: Array<{ month: string; score: number; savingsRate?: number; otherPercent?: number }>
  label?: string
}

export function ScoreSparkline({ data, label = "Score History" }: ScoreSparklineProps) {
  if (!data || data.length < 2) {
    return null
  }

  const formattedData = data.map((point) => ({
    ...point,
    monthLabel: new Date(`${point.month}-01`).toLocaleDateString("en-US", { month: "short" }),
  }))

  return (
    <div className="mt-2">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
          {label}
        </span>
      </div>
      <div className="h-[40px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={formattedData} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
            <defs>
              <linearGradient id="sparklineGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--chart-1)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="var(--chart-1)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const point = payload[0].payload
                  return (
                    <div className="bg-popover border rounded-md shadow-md px-2 py-1">
                      <p className="text-xs font-medium">{point.monthLabel}</p>
                      <p className="text-xs text-muted-foreground">
                        Score: {point.score}
                        {point.savingsRate !== undefined && ` | Rate: ${point.savingsRate}%`}
                        {point.otherPercent !== undefined && ` | Other: ${point.otherPercent}%`}
                      </p>
                    </div>
                  )
                }
                return null
              }}
            />
            <Area
              type="monotone"
              dataKey="score"
              stroke="var(--chart-1)"
              strokeWidth={2}
              fill="url(#sparklineGradient)"
              dot={false}
              activeDot={{ r: 3, fill: "var(--chart-1)" }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

