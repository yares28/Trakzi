// lib/chat/parse-chart-spec.ts
// Parses __CHART__{...}__ENDCHART__ markers from AI responses

export type ChartType = "bar" | "line" | "pie"

export interface ChartDataPoint {
  label: string
  value: number
  color?: string
}

export interface InlineChartSpec {
  type: ChartType
  title?: string
  data: ChartDataPoint[]
  unit?: string // e.g. "%" or "$"
}

export interface ParsedContent {
  segments: Array<
    | { kind: "text"; text: string }
    | { kind: "chart"; spec: InlineChartSpec }
  >
}

const CHART_REGEX = /__CHART__(\{[\s\S]*?\})__ENDCHART__/g

export function parseChartContent(content: string): ParsedContent {
  const segments: ParsedContent["segments"] = []
  let lastIndex = 0

  for (const match of content.matchAll(CHART_REGEX)) {
    // Text before this chart
    if (match.index! > lastIndex) {
      segments.push({ kind: "text", text: content.slice(lastIndex, match.index) })
    }

    try {
      const raw = JSON.parse(match[1]) as Partial<InlineChartSpec>
      if (
        raw &&
        typeof raw === "object" &&
        ["bar", "line", "pie"].includes(raw.type ?? "") &&
        Array.isArray(raw.data) &&
        raw.data.length > 0
      ) {
        segments.push({
          kind: "chart",
          spec: {
            type: raw.type as ChartType,
            title: raw.title,
            data: raw.data.map((d) => ({
              label: String(d.label ?? ""),
              value: Number(d.value ?? 0),
              color: d.color,
            })),
            unit: raw.unit,
          },
        })
      } else {
        // Malformed — treat as text
        segments.push({ kind: "text", text: match[0] })
      }
    } catch {
      segments.push({ kind: "text", text: match[0] })
    }

    lastIndex = match.index! + match[0].length
  }

  // Remaining text
  if (lastIndex < content.length) {
    segments.push({ kind: "text", text: content.slice(lastIndex) })
  }

  // If no charts found, return a single text segment
  if (segments.length === 0) {
    return { segments: [{ kind: "text", text: content }] }
  }

  return { segments }
}

/** True if content contains at least one chart marker */
export function hasChartMarkers(content: string): boolean {
  return content.includes("__CHART__") && content.includes("__ENDCHART__")
}
