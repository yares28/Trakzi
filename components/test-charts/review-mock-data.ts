import type { PlaygroundCardModel, PlaygroundSection, PlaygroundVisual } from "./one-click-playground-catalog"

function hashString(value: string) {
  let hash = 0
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) | 0
  }
  return Math.abs(hash)
}

function seededUnit(seed: number, offset: number) {
  const value = Math.sin(seed * 12.9898 + offset * 78.233) * 43758.5453
  return value - Math.floor(value)
}

function pick<T>(items: T[], seed: number, offset: number) {
  return items[Math.floor(seededUnit(seed, offset) * items.length) % items.length]
}

function round(value: number, digits = 0) {
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function numberInRange(seed: number, offset: number, min: number, max: number) {
  return min + seededUnit(seed, offset) * (max - min)
}

function buildLabels(count: number, seed: number, fallbackPrefix: string) {
  const base = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
  if (count <= 12) return base.slice(0, count)
  return Array.from({ length: count }, (_, index) => `${fallbackPrefix} ${1 + ((index + seed) % 12)}`)
}

function buildContextualLabels(card: PlaygroundCardModel, count: number, seed: number, fallbackPrefix: string) {
  const context = `${card.title} ${card.question} ${card.chartType} ${card.domain}`.toLowerCase()

  if (context.includes("store") || context.includes("merchant")) {
    return ["Mercadona", "Carrefour", "Lidl", "Aldi", "Amazon", "Shell", "Ikea", "Costco"].slice(0, count)
  }
  if (context.includes("goal")) {
    return ["Emergency", "Travel", "Rent Buffer", "Home", "Taxes", "Upgrade", "Tuition", "Move"].slice(0, count)
  }
  if (context.includes("pocket") || context.includes("property") || context.includes("vehicle")) {
    return ["Primary Car", "City Flat", "Studio", "Storage", "Family Car", "Rental", "Cabin", "Scooter"].slice(0, count)
  }
  if (context.includes("friend") || context.includes("room") || context.includes("challenge")) {
    return ["Alex", "Sam", "Jordan", "Taylor", "Casey", "Riley", "Morgan", "Jamie"].slice(0, count)
  }
  if (context.includes("category")) {
    return ["Housing", "Groceries", "Transport", "Dining", "Utilities", "Shopping", "Health", "Leisure"].slice(0, count)
  }
  if (context.includes("weekday") || context.includes("day")) {
    return ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].slice(0, count)
  }
  if (context.includes("hour")) {
    return ["06h", "09h", "12h", "15h", "18h", "21h", "24h"].slice(0, count)
  }

  return buildLabels(count, seed, fallbackPrefix)
}

function looksTemporal(card: PlaygroundCardModel, labels: string[] = []) {
  const context = `${card.title} ${card.question} ${card.chartType} ${card.domain}`.toLowerCase()
  const monthPattern = /^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i

  return (
    /month|monthly|quarter|year|yearly|trend|history|season|pace|balance|cash flow|cash|savings rate|runway|close|opening|closing/i.test(context) ||
    labels.some((label) => monthPattern.test(label))
  )
}

function expandTemporalLabels(
  card: PlaygroundCardModel,
  existingLabels: string[],
  seed: number,
  fallbackPrefix: string,
  minimum = 6,
) {
  if (!looksTemporal(card, existingLabels)) {
    return existingLabels.length ? existingLabels : buildContextualLabels(card, minimum, seed, fallbackPrefix)
  }

  if (existingLabels.length >= minimum) return existingLabels

  return buildLabels(minimum, seed, fallbackPrefix)
}

function formatterFromVisual(visual: PlaygroundVisual): "currency" | "percent" | "number" | undefined {
  switch (visual.kind) {
    case "trend":
    case "bars":
    case "groupedBars":
    case "stackedBars":
    case "splitBars":
    case "treemap":
    case "boxplot":
    case "funnel":
    case "sunburst":
    case "bullet":
    case "dotPlot":
    case "rangePlot":
    case "arrowPlot":
    case "dumbbell":
    case "pictorialBar":
    case "waterfall":
    case "rankedList":
      return visual.formatter
    default:
      return undefined
  }
}

function formatterBounds(formatter: "currency" | "percent" | "number" | undefined) {
  if (formatter === "currency") return { min: 220, max: 4200 }
  if (formatter === "percent") return { min: 12, max: 96 }
  return { min: 18, max: 180 }
}

function createDescendingValues(
  count: number,
  seed: number,
  formatter: "currency" | "percent" | "number" | undefined,
  floorRatio = 0.28,
) {
  const bounds = formatterBounds(formatter)
  const top = numberInRange(seed, 1, bounds.max * 0.7, bounds.max)

  return Array.from({ length: count }, (_, index) => {
    const progress = index / Math.max(count - 1, 1)
    const decay = 1 - progress * (1 - floorRatio)
    const wobble = 1 + (seededUnit(seed + 31, index + 1) - 0.5) * 0.12
    return round(clamp(top * decay * wobble, bounds.min, bounds.max))
  }).sort((left, right) => right - left)
}

function createTrendSeries(
  count: number,
  seed: number,
  formatter: "currency" | "percent" | "number" | undefined,
  direction: 1 | -1,
) {
  const bounds = formatterBounds(formatter)
  const values: number[] = []
  let current = numberInRange(seed, 1, bounds.min + (bounds.max - bounds.min) * 0.18, bounds.max * 0.78)

  for (let index = 0; index < count; index += 1) {
    const drift = ((bounds.max - bounds.min) / Math.max(count, 1)) * numberInRange(seed + 7, index + 1, 0.35, 0.92) * direction
    const pulse = Math.sin((index + 1) * 0.9 + seed * 0.001) * (bounds.max - bounds.min) * 0.08
    const shock = (seededUnit(seed + 19, index + 1) - 0.5) * (bounds.max - bounds.min) * 0.06
    current = clamp(current + drift + pulse + shock, bounds.min, bounds.max)
    values.push(round(current))
  }

  return values
}

function createHotspotCells(xLabels: string[], yLabels: string[], seed: number) {
  const hotspotX = Math.floor(seededUnit(seed, 1) * xLabels.length)
  const hotspotY = Math.floor(seededUnit(seed, 2) * yLabels.length)

  return yLabels.flatMap((yLabel, rowIndex) =>
    xLabels.map((xLabel, colIndex) => {
      const distance = Math.abs(rowIndex - hotspotY) + Math.abs(colIndex - hotspotX)
      const base = Math.max(0, 92 - distance * 18)
      const variance = numberInRange(seed + rowIndex * 13, colIndex + 1, -8, 16)
      return {
        x: xLabel,
        y: yLabel,
        value: Math.max(0, Math.round(base + variance)),
      }
    }),
  )
}

function metricFromVisual(
  visual: PlaygroundVisual,
  formatCurrency: (
    amount: number,
    options?: {
      minimumFractionDigits?: number
      maximumFractionDigits?: number
      showSign?: boolean
      forceFullNumber?: boolean
    }
  ) => string,
) {
  const formatter = formatterFromVisual(visual)

  const formatValue = (value: number) => {
    if (formatter === "currency") {
      return formatCurrency(value, { maximumFractionDigits: 0 })
    }
    if (formatter === "percent") {
      return `${Math.round(value)}%`
    }
    return `${Math.round(value)}`
  }

  switch (visual.kind) {
    case "trend":
      return { metricLabel: "Latest point", metricValue: formatValue(visual.points.at(-1)?.value ?? 0) }
    case "bars":
      return { metricLabel: "Top bar", metricValue: formatValue(Math.max(...visual.items.map((item) => item.value), 0)) }
    case "heatmap":
      return { metricLabel: "Active cells", metricValue: `${visual.cells.filter((cell) => cell.value > 0).length}` }
    case "gauge":
      return { metricLabel: "Score", metricValue: `${Math.round(visual.value)}%` }
    case "scatter":
      return { metricLabel: "Points", metricValue: `${visual.points.length}` }
    case "dumbbell":
      return { metricLabel: "Largest spread", metricValue: formatValue(Math.max(...visual.items.map((item) => Math.abs(item.end - item.start)), 0)) }
    case "bullet":
      return {
        metricLabel: "Best target hit",
        metricValue: `${Math.round(Math.max(...visual.items.map((item) => (item.target > 0 ? (item.value / item.target) * 100 : 0)), 0))}%`,
      }
    case "dotPlot":
      return { metricLabel: "Lead value", metricValue: formatValue(Math.max(...visual.items.map((item) => item.value), 0)) }
    case "rangePlot":
      return { metricLabel: "Widest range", metricValue: formatValue(Math.max(...visual.items.map((item) => item.end - item.start), 0)) }
    case "arrowPlot":
      return { metricLabel: "Strongest move", metricValue: formatValue(Math.max(...visual.items.map((item) => item.end - item.start), 0)) }
    case "groupedBars":
      return { metricLabel: "Groups", metricValue: `${visual.groups.length}` }
    case "stackedBars":
      return {
        metricLabel: "Largest stack",
        metricValue: formatValue(Math.max(...visual.items.map((item) => item.segments.reduce((sum, segment) => sum + segment.value, 0)), 0)),
      }
    case "splitBars":
      return { metricLabel: "Biggest side", metricValue: formatValue(Math.max(...visual.items.flatMap((item) => [item.left, item.right]), 0)) }
    case "treemap":
      return { metricLabel: "Top block", metricValue: formatValue(Math.max(...visual.items.map((item) => item.value), 0)) }
    case "boxplot":
      return { metricLabel: "Top median", metricValue: formatValue(Math.max(...visual.items.map((item) => item.median), 0)) }
    case "funnel":
      return { metricLabel: "Entry step", metricValue: formatValue(visual.steps[0]?.value ?? 0) }
    case "sankey":
      return { metricLabel: "Flow links", metricValue: `${visual.links.length}` }
    case "sunburst":
      return { metricLabel: "Outer branches", metricValue: `${visual.nodes.reduce((sum, node) => sum + (node.children?.length ?? 0), 0)}` }
    case "parallel":
      return { metricLabel: "Lines", metricValue: `${visual.lines.length}` }
    case "pictorialBar":
      return { metricLabel: "Top icon bar", metricValue: formatValue(Math.max(...visual.items.map((item) => item.value), 0)) }
    case "waterfall":
      return { metricLabel: "Net move", metricValue: formatValue(visual.steps.reduce((sum, step) => (step.isTotal ? sum : sum + step.value), 0)) }
    case "rankedList":
      return { metricLabel: "Top ranked item", metricValue: formatValue(visual.items[0]?.value ?? 0) }
    default:
      return { metricLabel: "Metric", metricValue: "0" }
  }
}

function buildMockVisual(seed: number, visual: PlaygroundVisual, card: PlaygroundCardModel): PlaygroundVisual {
  const formatter = formatterFromVisual(visual)

  switch (visual.kind) {
    case "trend": {
      const labels = expandTemporalLabels(
        card,
        visual.points.map((point) => point.label),
        seed,
        "Period",
        6,
      )
      const direction = seededUnit(seed, 4) > 0.34 ? 1 : -1
      const mainSeries = createTrendSeries(labels.length, seed, formatter, direction)
      const bounds = formatterBounds(formatter)
      const comparePoints = visual.comparePoints
        ? labels.map((label, index) => ({
            label,
            value: round(clamp(mainSeries[index] * numberInRange(seed + 11, index + 1, 0.78, 0.96), bounds.min, bounds.max)),
          }))
        : undefined

      return {
        kind: "trend",
        points: labels.map((label, index) => ({ label, value: mainSeries[index] })),
        comparePoints,
        formatter,
      }
    }

    case "bars": {
      const labels = expandTemporalLabels(
        card,
        visual.items.map((item) => item.label),
        seed,
        "Item",
        6,
      )
      const values = createDescendingValues(labels.length, seed, formatter)

      return {
        kind: "bars",
        formatter,
        items: labels.map((label, index) => ({
          label,
          value: values[index],
          secondaryValue:
            visual.items[index]?.secondaryValue != null
              ? round(values[index] * numberInRange(seed + 7, index + 1, 0.68, 0.9))
              : undefined,
        })),
      }
    }

    case "heatmap": {
      const xLabels = expandTemporalLabels(card, visual.xLabels, seed, "X", 6)
      const yLabels = visual.yLabels.length ? visual.yLabels : ["Week 1", "Week 2", "Week 3", "Week 4", "Week 5"]

      return {
        kind: "heatmap",
        xLabels,
        yLabels,
        cells: createHotspotCells(xLabels, yLabels, seed),
      }
    }

    case "gauge":
      return {
        kind: "gauge",
        value: round(numberInRange(seed, 1, 68, 94)),
        target: visual.target ?? round(numberInRange(seed + 5, 1, 74, 86)),
      }

    case "scatter": {
      const pointCount = Math.max(10, visual.points.length || 12)
      const labels = buildContextualLabels(card, pointCount, seed, "Point")

      return {
        kind: "scatter",
        xLabel: visual.xLabel,
        yLabel: visual.yLabel,
        points: Array.from({ length: pointCount }, (_, index) => {
          const x = round(numberInRange(seed, index + 1, 14, 96))
          return {
            label: visual.points[index]?.label ?? labels[index] ?? `Point ${index + 1}`,
            x,
            y: round(clamp(x * numberInRange(seed + 19, index + 1, 0.72, 1.18), 10, 98)),
          }
        }),
      }
    }

    case "dumbbell":
      return {
        kind: "dumbbell",
        formatter,
        items: (visual.items.length ? visual.items : buildContextualLabels(card, 5, seed, "Lane").map((label) => ({ label, start: 0, end: 0 }))).map((item, index) => {
          const start = round(numberInRange(seed, index + 1, formatter === "percent" ? 18 : 120, formatter === "percent" ? 64 : 1900))
          const end = round(start + numberInRange(seed + 23, index + 1, formatter === "percent" ? 6 : 90, formatter === "percent" ? 26 : 1100))
          return { label: item.label, start, end }
        }),
      }

    case "bullet": {
      const items = visual.items.length
        ? visual.items
        : buildContextualLabels(card, 5, seed, "Lane").map((label) => ({
            label,
            value: 0,
            target: 100,
            max: undefined as number | undefined,
          }))

      return {
        kind: "bullet",
        formatter,
        items: items.map((item, index) => {
          const target = round(numberInRange(seed + 29, index + 1, formatter === "percent" ? 58 : 520, formatter === "percent" ? 100 : 2600))
          const value = round(target * numberInRange(seed, index + 1, 0.76, 1.12))
          return { label: item.label, value, target, max: item.max ?? round(target * 1.35) }
        }),
      }
    }

    case "dotPlot": {
      const items = visual.items.length
        ? visual.items
        : buildContextualLabels(card, 6, seed, "Lane").map((label) => ({
            label,
            value: 0,
            reference: undefined as number | undefined,
          }))

      const values = createDescendingValues(items.length, seed, formatter, 0.34)

      return {
        kind: "dotPlot",
        formatter,
        items: items.map((item, index) => ({
          label: item.label,
          value: values[index],
          reference:
            item.reference != null
              ? round(values[index] * numberInRange(seed + 31, index + 1, 0.74, 0.96))
              : undefined,
        })),
      }
    }

    case "rangePlot": {
      const items = visual.items.length
        ? visual.items
        : buildContextualLabels(card, 6, seed, "Band").map((label) => ({
            label,
            start: 0,
            end: 0,
            marker: undefined as number | undefined,
          }))

      return {
        kind: "rangePlot",
        formatter,
        items: items.map((item, index) => {
          const start = round(numberInRange(seed, index + 1, formatter === "percent" ? 12 : 80, formatter === "percent" ? 56 : 1500))
          const end = round(start + numberInRange(seed + 37, index + 1, formatter === "percent" ? 10 : 120, formatter === "percent" ? 34 : 1500))
          return {
            label: item.label,
            start,
            end,
            marker: item.marker != null ? round(numberInRange(seed + 41, index + 1, start, end)) : undefined,
          }
        }),
      }
    }

    case "arrowPlot":
      return {
        kind: "arrowPlot",
        formatter,
        items: (visual.items.length ? visual.items : buildContextualLabels(card, 6, seed, "Band").map((label) => ({ label, start: 0, end: 0 }))).map((item, index) => {
          const start = round(numberInRange(seed, index + 1, formatter === "percent" ? 16 : 110, formatter === "percent" ? 72 : 2000))
          const direction = seededUnit(seed + 43, index + 1) > 0.45 ? 1 : -1
          const delta = numberInRange(seed + 47, index + 1, formatter === "percent" ? 4 : 60, formatter === "percent" ? 24 : 900)
          return { label: item.label, start, end: round(Math.max(0, start + direction * delta)) }
        }),
      }

    case "groupedBars": {
      const keys = visual.keys.length ? visual.keys : ["Current", "Reference", "Target"]
      const groups = (visual.groups.length
        ? expandTemporalLabels(card, visual.groups.map((group) => group.label), seed, "Month", 6).map((label) => ({ label, values: [] }))
        : expandTemporalLabels(card, [], seed, "Month", 6).map((label) => ({ label, values: [] }))).map((group, groupIndex) => {
        const values = createDescendingValues(keys.length, seed + groupIndex * 17, formatter, 0.55)
        return {
          label: group.label,
          values: keys.map((key, keyIndex) => ({ key, value: values[keyIndex] })),
        }
      })

      return { kind: "groupedBars", keys, groups, formatter }
    }

    case "stackedBars": {
      const keys = visual.keys.length ? visual.keys : ["Fixed", "Variable", "Spikes"]
      const baseLabels = expandTemporalLabels(
        card,
        visual.items.map((item) => item.label),
        seed,
        "Month",
        6,
      )
      const sourceItems = baseLabels.map((label, index) => visual.items[index] ?? { label, segments: [] })
      const items = sourceItems.map((item, itemIndex) => {
        const total = numberInRange(seed + itemIndex * 17, 1, formatter === "percent" ? 44 : 520, formatter === "percent" ? 96 : 2200)
        const weights = keys.map((_, keyIndex) => numberInRange(seed + itemIndex * 17, keyIndex + 5, 0.15, 0.52))
        const weightTotal = weights.reduce((sum, value) => sum + value, 0)

        return {
          label: item.label,
          segments: keys.map((key, keyIndex) => ({
            key,
            value: round((total * weights[keyIndex]) / weightTotal),
          })),
        }
      })

      return { kind: "stackedBars", keys, items, formatter }
    }

    case "splitBars": {
      const items = visual.items.length
        ? visual.items
        : buildContextualLabels(card, 5, seed, "Lane").map((label) => ({
            label,
            left: 0,
            right: 0,
            leftLabel: undefined as string | undefined,
            rightLabel: undefined as string | undefined,
          }))

      return {
        kind: "splitBars",
        formatter,
        items: items.map((item, index) => ({
          label: item.label,
          left: round(numberInRange(seed, index + 1, formatter === "percent" ? 10 : 90, formatter === "percent" ? 72 : 1800)),
          right: round(numberInRange(seed + 53, index + 1, formatter === "percent" ? 10 : 90, formatter === "percent" ? 72 : 1800)),
          leftLabel: item.leftLabel,
          rightLabel: item.rightLabel,
        })),
      }
    }

    case "treemap": {
      const items = (visual.items.length
        ? visual.items
        : buildContextualLabels(card, 8, seed, "Node").map((label) => ({ label, value: 0 })))
        .map((item, index) => ({
          label: item.label,
          value: createDescendingValues(visual.items.length || 8, seed, formatter, 0.16)[index],
        }))

      return { kind: "treemap", formatter, items }
    }

    case "boxplot":
      return {
        kind: "boxplot",
        formatter,
        items: (visual.items.length ? visual.items : buildContextualLabels(card, 6, seed, "Group").map((label) => ({ label, min: 0, q1: 0, median: 0, q3: 0, max: 0 }))).map((item, index) => {
          const min = round(numberInRange(seed, index + 1, formatter === "percent" ? 4 : 20, formatter === "percent" ? 28 : 600))
          const q1 = round(min + numberInRange(seed + 59, index + 1, formatter === "percent" ? 4 : 20, formatter === "percent" ? 14 : 300))
          const median = round(q1 + numberInRange(seed + 61, index + 1, formatter === "percent" ? 3 : 20, formatter === "percent" ? 12 : 250))
          const q3 = round(median + numberInRange(seed + 67, index + 1, formatter === "percent" ? 3 : 20, formatter === "percent" ? 12 : 260))
          const max = round(q3 + numberInRange(seed + 71, index + 1, formatter === "percent" ? 4 : 20, formatter === "percent" ? 16 : 340))
          return { label: item.label, min, q1, median, q3, max }
        }),
      }

    case "funnel": {
      const steps = (visual.steps.length ? visual.steps : ["Start", "Qualified", "Shortlist", "Converted"].map((label) => ({ label, value: 0 }))).map((step, index) => {
        const top = numberInRange(seed, 1, formatter === "percent" ? 52 : 900, formatter === "percent" ? 96 : 3200)
        const decay = 1 - index * 0.18 - seededUnit(seed + 71, index + 1) * 0.06
        return {
          label: step.label,
          value: round(Math.max(top * decay, top * 0.16)),
        }
      })

      return { kind: "funnel", formatter, steps }
    }

    case "sankey": {
      const nodes =
        visual.nodes.length > 0
          ? visual.nodes
          : [
              { id: "source-1", label: "Income", column: 0 },
              { id: "source-2", label: "Carryover", column: 0 },
              { id: "mid-1", label: "Core", column: 1 },
              { id: "mid-2", label: "Flexible", column: 1 },
              { id: "out-1", label: "Saved", column: 2 },
              { id: "out-2", label: "Spent", column: 2 },
            ]

      const links =
        visual.links.length > 0
          ? visual.links.map((link, index) => ({
              source: link.source,
              target: link.target,
              value: round(numberInRange(seed, index + 1, formatter === "percent" ? 6 : 90, formatter === "percent" ? 34 : 1200)),
            }))
          : [
              { source: "source-1", target: "mid-1", value: round(numberInRange(seed, 1, 900, 1800)) },
              { source: "source-1", target: "mid-2", value: round(numberInRange(seed, 2, 360, 920)) },
              { source: "source-2", target: "mid-2", value: round(numberInRange(seed, 3, 100, 460)) },
              { source: "mid-1", target: "out-2", value: round(numberInRange(seed, 4, 620, 1500)) },
              { source: "mid-2", target: "out-1", value: round(numberInRange(seed, 5, 180, 520)) },
              { source: "mid-2", target: "out-2", value: round(numberInRange(seed, 6, 240, 860)) },
            ]

      return { kind: "sankey", nodes, links, formatter }
    }

    case "sunburst": {
      const nodes = (visual.nodes.length
        ? visual.nodes
        : buildContextualLabels(card, 4, seed, "Core").map((label) => ({ label, value: 0, children: undefined as Array<{ label: string; value: number }> | undefined })))
        .map((node, index) => {
          const childLabels = node.children?.length
            ? node.children.map((child) => child.label)
            : buildContextualLabels(card, 3, seed + index, "Leaf")
          const childValues = createDescendingValues(childLabels.length, seed + index * 17, formatter, 0.42)
          const parentValue = childValues.reduce((sum, value) => sum + value, 0)

          return {
            label: node.label,
            value: parentValue,
            children: childLabels.map((label, childIndex) => ({
              label,
              value: childValues[childIndex],
            })),
          }
        })

      return { kind: "sunburst", formatter, nodes }
    }

    case "parallel":
      return {
        kind: "parallel",
        axes: visual.axes.length ? visual.axes : ["Mix", "Pace", "Risk", "Control", "Slack"],
        lines: (visual.lines.length ? visual.lines : ["Current", "Reference", "Stretch"].map((label) => ({ label, values: [] }))).map((line, index) => {
          const bias = index === 0 ? 1 : index === 1 ? 0.82 : 1.08
          return {
            label: line.label,
            values: (visual.axes.length ? visual.axes : ["Mix", "Pace", "Risk", "Control", "Slack"]).map((_, axisIndex) =>
              round(clamp(numberInRange(seed + index * 13, axisIndex + 1, 22, 88) * bias, 10, 98)),
            ),
          }
        }),
      }

    case "pictorialBar": {
      const items = visual.items.length
        ? visual.items
        : buildContextualLabels(card, 5, seed, "Lane").map((label) => ({
            label,
            value: 0,
            max: undefined as number | undefined,
          }))

      return {
        kind: "pictorialBar",
        formatter,
        items: items.map((item, index) => ({
          label: item.label,
          value: round(numberInRange(seed, index + 1, formatter === "percent" ? 18 : 160, formatter === "percent" ? 94 : 1800)),
          max: item.max ?? (formatter === "percent" ? 100 : 2000),
        })),
      }
    }

    case "waterfall": {
      const steps = visual.steps.length
        ? visual.steps.map((step, index) => ({
            label: step.label,
            value: step.isTotal ? 0 : round(numberInRange(seed, index + 1, -780, 1320)),
            isTotal: step.isTotal,
          }))
        : [
            { label: "Income", value: 1680 },
            { label: "Essentials", value: -720 },
            { label: "Flex spend", value: -460 },
            { label: "Savings lift", value: 340 },
            { label: "Close", value: 0, isTotal: true },
          ]

      const runningTotal = steps.reduce((sum, step) => (step.isTotal ? sum : sum + step.value), 0)
      const finalSteps = steps.map((step, index) =>
        step.isTotal && index === steps.length - 1 ? { ...step, value: runningTotal } : step,
      )

      return { kind: "waterfall", formatter, steps: finalSteps }
    }

    case "rankedList": {
      const items = (visual.items.length
        ? visual.items
        : buildContextualLabels(card, 8, seed, "Rank").map((label) => ({ label, value: 0, context: undefined as string | undefined })))
        .map((item, index) => ({
          label: item.label,
          value: createDescendingValues(visual.items.length || 8, seed, formatter, 0.24)[index],
          context: item.context ?? pick(["steady drag", "late spike", "repeat source", "weekend-heavy"], seed, index + 1),
        }))
        .sort((left, right) => right.value - left.value)

      return { kind: "rankedList", formatter, items }
    }

    default:
      return visual
  }
}

type ScenarioOverride = {
  visual: PlaygroundVisual
  metricLabel?: string
  metricValue?: string
  insight?: string
}

function buildTopReviewScenario(
  card: PlaygroundCardModel,
  formatCurrency: (
    amount: number,
    options?: {
      minimumFractionDigits?: number
      maximumFractionDigits?: number
      showSign?: boolean
      forceFullNumber?: boolean
    }
  ) => string,
): ScenarioOverride | null {
  switch (card.id) {
    case "savings-runway-gauge":
      return {
        metricLabel: "Runway at current close",
        metricValue: "3.8 months",
        insight:
          "The mock runway sits in the usable-but-not-relaxed range. It is long enough to absorb a short disruption, but still visibly below the six-month comfort band.",
        visual: {
          kind: "gauge",
          value: 63,
          target: 75,
        },
      }

    case "paycheck-to-paycheck-carry-ratio":
      return {
        metricLabel: "Best carry window",
        metricValue: "61%",
        insight:
          "The mock pattern shows a clear gap between healthy and fragile pay windows. When bills stay contained, more than half of available cash survives into the next income event; weaker windows carry barely a third.",
        visual: {
          kind: "bullet",
          formatter: "percent",
          items: [
            { label: "Jan window", value: 61, target: 50, max: 100 },
            { label: "Feb window", value: 54, target: 50, max: 100 },
            { label: "Mar window", value: 47, target: 50, max: 100 },
            { label: "Apr window", value: 39, target: 50, max: 100 },
            { label: "May window", value: 58, target: 50, max: 100 },
          ],
        },
      }

    case "subscription-renewal-crowding-by-week":
      return {
        metricLabel: "Most crowded week",
        metricValue: "Week 2",
        insight:
          "Recurring renewals are not evenly distributed in the mock month. The second week carries the heaviest streaming, telecom, software, and plan stack, which is exactly where cash gets squeezed before discretionary spending begins.",
        visual: {
          kind: "heatmap",
          xLabels: ["Week 1", "Week 2", "Week 3", "Week 4", "Week 5"],
          yLabels: ["Streaming", "Telecom", "Software", "Insurance", "Utilities"],
          cells: [
            { x: "Week 1", y: "Streaming", value: 18 },
            { x: "Week 2", y: "Streaming", value: 71 },
            { x: "Week 3", y: "Streaming", value: 22 },
            { x: "Week 4", y: "Streaming", value: 14 },
            { x: "Week 5", y: "Streaming", value: 0 },
            { x: "Week 1", y: "Telecom", value: 25 },
            { x: "Week 2", y: "Telecom", value: 84 },
            { x: "Week 3", y: "Telecom", value: 17 },
            { x: "Week 4", y: "Telecom", value: 8 },
            { x: "Week 5", y: "Telecom", value: 0 },
            { x: "Week 1", y: "Software", value: 9 },
            { x: "Week 2", y: "Software", value: 63 },
            { x: "Week 3", y: "Software", value: 11 },
            { x: "Week 4", y: "Software", value: 6 },
            { x: "Week 5", y: "Software", value: 0 },
            { x: "Week 1", y: "Insurance", value: 12 },
            { x: "Week 2", y: "Insurance", value: 92 },
            { x: "Week 3", y: "Insurance", value: 21 },
            { x: "Week 4", y: "Insurance", value: 12 },
            { x: "Week 5", y: "Insurance", value: 0 },
            { x: "Week 1", y: "Utilities", value: 29 },
            { x: "Week 2", y: "Utilities", value: 77 },
            { x: "Week 3", y: "Utilities", value: 33 },
            { x: "Week 4", y: "Utilities", value: 16 },
            { x: "Week 5", y: "Utilities", value: 0 },
          ],
        },
      }

    case "balance-pressure-calendar-by-weekday-pair":
      return {
        metricLabel: "Most exposed pair",
        metricValue: "Thu Week 2",
        insight:
          "Balance pressure clusters around late-week spending in the second week of the month. Thursday and Friday carry the densest low-cushion pattern, while weekends are quieter once the main fixed bills clear.",
        visual: {
          kind: "heatmap",
          xLabels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
          yLabels: ["Week 1", "Week 2", "Week 3", "Week 4", "Week 5"],
          cells: [
            { x: "Mon", y: "Week 1", value: 34 },
            { x: "Tue", y: "Week 1", value: 41 },
            { x: "Wed", y: "Week 1", value: 46 },
            { x: "Thu", y: "Week 1", value: 59 },
            { x: "Fri", y: "Week 1", value: 63 },
            { x: "Sat", y: "Week 1", value: 28 },
            { x: "Sun", y: "Week 1", value: 22 },
            { x: "Mon", y: "Week 2", value: 52 },
            { x: "Tue", y: "Week 2", value: 67 },
            { x: "Wed", y: "Week 2", value: 78 },
            { x: "Thu", y: "Week 2", value: 96 },
            { x: "Fri", y: "Week 2", value: 89 },
            { x: "Sat", y: "Week 2", value: 44 },
            { x: "Sun", y: "Week 2", value: 36 },
            { x: "Mon", y: "Week 3", value: 43 },
            { x: "Tue", y: "Week 3", value: 47 },
            { x: "Wed", y: "Week 3", value: 54 },
            { x: "Thu", y: "Week 3", value: 61 },
            { x: "Fri", y: "Week 3", value: 58 },
            { x: "Sat", y: "Week 3", value: 33 },
            { x: "Sun", y: "Week 3", value: 26 },
            { x: "Mon", y: "Week 4", value: 29 },
            { x: "Tue", y: "Week 4", value: 33 },
            { x: "Wed", y: "Week 4", value: 38 },
            { x: "Thu", y: "Week 4", value: 45 },
            { x: "Fri", y: "Week 4", value: 49 },
            { x: "Sat", y: "Week 4", value: 21 },
            { x: "Sun", y: "Week 4", value: 18 },
            { x: "Mon", y: "Week 5", value: 11 },
            { x: "Tue", y: "Week 5", value: 14 },
            { x: "Wed", y: "Week 5", value: 16 },
            { x: "Thu", y: "Week 5", value: 20 },
            { x: "Fri", y: "Week 5", value: 24 },
            { x: "Sat", y: "Week 5", value: 9 },
            { x: "Sun", y: "Week 5", value: 6 },
          ],
        },
      }

    case "income-coverage-ladder-by-essential-category":
      return {
        metricLabel: "Hardest category to cover",
        metricValue: "Housing 1.8 pays",
        insight:
          "Housing stands alone as the only essential category that meaningfully exceeds one typical income event in the mock setup. Groceries and utilities stay manageable, but housing clearly dominates coverage pressure.",
        visual: {
          kind: "bullet",
          formatter: "percent",
          items: [
            { label: "Housing", value: 180, target: 100, max: 220 },
            { label: "Groceries", value: 72, target: 100, max: 220 },
            { label: "Utilities", value: 46, target: 100, max: 220 },
            { label: "Transport", value: 38, target: 100, max: 220 },
          ],
        },
      }

    case "category-recovery-window-after-overspend":
      return {
        metricLabel: "Slowest recovery",
        metricValue: "Dining - 9 days",
        insight:
          "Dining is the category that refuses to calm down in the mock set. Groceries and transport usually settle within three to five days after a breach, but dining and shopping keep running hot long after the miss.",
        visual: {
          kind: "rangePlot",
          formatter: "number",
          items: [
            { label: "Dining", start: 4, end: 9, marker: 7 },
            { label: "Shopping", start: 3, end: 7, marker: 5 },
            { label: "Groceries", start: 2, end: 5, marker: 4 },
            { label: "Transport", start: 1, end: 4, marker: 3 },
            { label: "Leisure", start: 2, end: 6, marker: 4 },
          ],
        },
      }

    case "cushion-use-then-rebuild-ratio":
      return {
        metricLabel: "Best rebuild month",
        metricValue: "May 64%",
        insight:
          "Not every weak month is equally dangerous. In this mock pattern, April burns a lot of cushion and rebuilds very little, while May uses almost as much but restores most of it before close.",
        visual: {
          kind: "splitBars",
          formatter: "currency",
          items: [
            { label: "Feb", left: 310, right: 180, leftLabel: "Used", rightLabel: "Rebuilt" },
            { label: "Mar", left: 420, right: 240, leftLabel: "Used", rightLabel: "Rebuilt" },
            { label: "Apr", left: 560, right: 130, leftLabel: "Used", rightLabel: "Rebuilt" },
            { label: "May", left: 480, right: 308, leftLabel: "Used", rightLabel: "Rebuilt" },
            { label: "Jun", left: 260, right: 190, leftLabel: "Used", rightLabel: "Rebuilt" },
          ],
        },
      }

    case "deadline-cluster-weight-by-category":
      return {
        metricLabel: "Heaviest cluster",
        metricValue: "Housing goals",
        insight:
          "The upcoming goal calendar is not evenly distributed in this mock portfolio. Housing and emergency goals dominate near-term deadline weight, while travel and tech goals stay lighter and more optional.",
        visual: {
          kind: "treemap",
          formatter: "currency",
          items: [
            { label: "Housing", value: 9600 },
            { label: "Emergency", value: 5200 },
            { label: "Taxes", value: 3400 },
            { label: "Travel", value: 2100 },
            { label: "Education", value: 1800 },
            { label: "Tech", value: 1200 },
          ],
        },
      }

    case "store-markdown-capture-rate":
      return {
        metricLabel: "Best capture store",
        metricValue: "Lidl 31%",
        insight:
          "Lidl and Aldi produce the highest rate of category-normalized price wins in the mock review set, while premium stores occasionally win on one category but rarely across a whole basket.",
        visual: {
          kind: "groupedBars",
          formatter: "percent",
          keys: ["Markdown wins", "Neutral baskets"],
          groups: [
            {
              label: "Lidl",
              values: [
                { key: "Markdown wins", value: 31 },
                { key: "Neutral baskets", value: 52 },
              ],
            },
            {
              label: "Aldi",
              values: [
                { key: "Markdown wins", value: 27 },
                { key: "Neutral baskets", value: 55 },
              ],
            },
            {
              label: "Mercadona",
              values: [
                { key: "Markdown wins", value: 18 },
                { key: "Neutral baskets", value: 61 },
              ],
            },
            {
              label: "Carrefour",
              values: [
                { key: "Markdown wins", value: 14 },
                { key: "Neutral baskets", value: 49 },
              ],
            },
          ],
        },
      }

    case "pocket-tab-volatility-by-type":
      return {
        metricLabel: "Most volatile tab",
        metricValue: "Vehicle maintenance",
        insight:
          "The mock ownership surfaces are stable in some places and jumpy in others. Vehicle maintenance and travel fees swing far more than housing mortgage or other-pocket renewals, which makes reserve planning uneven across surfaces.",
        visual: {
          kind: "groupedBars",
          formatter: "percent",
          keys: ["Base volatility", "Spike volatility"],
          groups: [
            {
              label: "Vehicles",
              values: [
                { key: "Base volatility", value: 34 },
                { key: "Spike volatility", value: 82 },
              ],
            },
            {
              label: "Housing",
              values: [
                { key: "Base volatility", value: 18 },
                { key: "Spike volatility", value: 36 },
              ],
            },
            {
              label: "Travel",
              values: [
                { key: "Base volatility", value: 27 },
                { key: "Spike volatility", value: 71 },
              ],
            },
            {
              label: "Other",
              values: [
                { key: "Base volatility", value: 22 },
                { key: "Spike volatility", value: 44 },
              ],
            },
          ],
        },
      }

    case "member-settlement-response-time":
      return {
        metricLabel: "Fastest responder",
        metricValue: "Jordan - 1.8 days",
        insight:
          "Response time varies more by person than by room in this mock set. Jordan and Casey clear prompts quickly, while Alex and Morgan routinely let shared balances sit for almost a week.",
        visual: {
          kind: "boxplot",
          formatter: "number",
          items: [
            { label: "Jordan", min: 1, q1: 1.3, median: 1.8, q3: 2.4, max: 3.1 },
            { label: "Casey", min: 1.2, q1: 1.9, median: 2.6, q3: 3.3, max: 4.4 },
            { label: "Alex", min: 2.8, q1: 4.1, median: 5.4, q3: 6.2, max: 7.6 },
            { label: "Morgan", min: 3.1, q1: 4.4, median: 5.8, q3: 6.9, max: 8.2 },
          ],
        },
      }

    case "metric-leader-gap-momentum":
      return {
        metricLabel: "Widest widening metric",
        metricValue: "Savings rate",
        insight:
          "The mock leaderboard is diverging in savings rate while wants control is tightening. That makes the metric set feel mixed: some races are getting more open while others are becoming genuinely competitive.",
        visual: {
          kind: "arrowPlot",
          formatter: "number",
          items: [
            { label: "Savings rate", start: 6, end: 15 },
            { label: "Wants %", start: 11, end: 7 },
            { label: "Fridge score", start: 8, end: 10 },
            { label: "No-spend", start: 9, end: 12 },
          ],
        },
      }

    case "debt-ticket-variance-by-week-of-month":
      return {
        metricLabel: "Spikiest week",
        metricValue: "Week 3",
        insight:
          "Debt payments are not just heavier in total during the third week in this mock view. They are also far less predictable, with much wider ticket spread than the first two weeks.",
        visual: {
          kind: "boxplot",
          formatter: "currency",
          items: [
            { label: "Week 1", min: 84, q1: 116, median: 154, q3: 198, max: 248 },
            { label: "Week 2", min: 92, q1: 128, median: 168, q3: 214, max: 276 },
            { label: "Week 3", min: 110, q1: 182, median: 248, q3: 338, max: 462 },
            { label: "Week 4", min: 70, q1: 108, median: 149, q3: 190, max: 240 },
          ],
        },
      }

    case "room-fronting-vs-low-balance-exposure":
      return {
        metricLabel: "Worst collision month",
        metricValue: "May",
        insight:
          "The mock pattern is not subtle: as fronting responsibility rises, low-balance exposure rises with it. The heaviest fronting month also carries the sharpest jump in low-balance days for the same payer.",
        visual: {
          kind: "scatter",
          xLabel: "Fronted shared spend",
          yLabel: "Low-balance days",
          points: [
            { label: "Jan", x: 120, y: 2 },
            { label: "Feb", x: 220, y: 4 },
            { label: "Mar", x: 310, y: 5 },
            { label: "Apr", x: 470, y: 8 },
            { label: "May", x: 720, y: 13 },
            { label: "Jun", x: 430, y: 7 },
          ],
        },
      }

    case "store-price-floor-reliability":
      return {
        metricLabel: "Most reliable floor",
        metricValue: "Aldi",
        insight:
          "Aldi and Lidl win on price floor consistency in the mock view. Carrefour occasionally posts the cheapest line, but its leadership is too unstable to count on across months and categories.",
        visual: {
          kind: "heatmap",
          xLabels: ["Produce", "Dairy", "Snacks", "Frozen", "Cleaning"],
          yLabels: ["Aldi", "Lidl", "Mercadona", "Carrefour", "El Corte"],
          cells: [
            { x: "Produce", y: "Aldi", value: 84 },
            { x: "Dairy", y: "Aldi", value: 78 },
            { x: "Snacks", y: "Aldi", value: 69 },
            { x: "Frozen", y: "Aldi", value: 73 },
            { x: "Cleaning", y: "Aldi", value: 80 },
            { x: "Produce", y: "Lidl", value: 79 },
            { x: "Dairy", y: "Lidl", value: 82 },
            { x: "Snacks", y: "Lidl", value: 74 },
            { x: "Frozen", y: "Lidl", value: 76 },
            { x: "Cleaning", y: "Lidl", value: 68 },
            { x: "Produce", y: "Mercadona", value: 57 },
            { x: "Dairy", y: "Mercadona", value: 61 },
            { x: "Snacks", y: "Mercadona", value: 49 },
            { x: "Frozen", y: "Mercadona", value: 54 },
            { x: "Cleaning", y: "Mercadona", value: 58 },
            { x: "Produce", y: "Carrefour", value: 36 },
            { x: "Dairy", y: "Carrefour", value: 44 },
            { x: "Snacks", y: "Carrefour", value: 63 },
            { x: "Frozen", y: "Carrefour", value: 41 },
            { x: "Cleaning", y: "Carrefour", value: 38 },
            { x: "Produce", y: "El Corte", value: 24 },
            { x: "Dairy", y: "El Corte", value: 21 },
            { x: "Snacks", y: "El Corte", value: 28 },
            { x: "Frozen", y: "El Corte", value: 19 },
            { x: "Cleaning", y: "El Corte", value: 23 },
          ],
        },
      }

    case "budget-miss-day-clusters":
      return {
        metricLabel: "Pain window",
        metricValue: "Days 18-24",
        insight:
          "The mock calendar makes budget pain feel rhythmic rather than random. Misses stack late in the second half of the month, especially once shopping and dining both heat up at the same time.",
        visual: {
          kind: "heatmap",
          xLabels: ["1-5", "6-10", "11-15", "16-20", "21-25", "26-31"],
          yLabels: ["Groceries", "Dining", "Shopping", "Transport", "Leisure"],
          cells: [
            { x: "1-5", y: "Groceries", value: 12 },
            { x: "6-10", y: "Groceries", value: 18 },
            { x: "11-15", y: "Groceries", value: 24 },
            { x: "16-20", y: "Groceries", value: 41 },
            { x: "21-25", y: "Groceries", value: 52 },
            { x: "26-31", y: "Groceries", value: 29 },
            { x: "1-5", y: "Dining", value: 6 },
            { x: "6-10", y: "Dining", value: 11 },
            { x: "11-15", y: "Dining", value: 19 },
            { x: "16-20", y: "Dining", value: 54 },
            { x: "21-25", y: "Dining", value: 73 },
            { x: "26-31", y: "Dining", value: 38 },
            { x: "1-5", y: "Shopping", value: 8 },
            { x: "6-10", y: "Shopping", value: 14 },
            { x: "11-15", y: "Shopping", value: 22 },
            { x: "16-20", y: "Shopping", value: 61 },
            { x: "21-25", y: "Shopping", value: 81 },
            { x: "26-31", y: "Shopping", value: 42 },
            { x: "1-5", y: "Transport", value: 10 },
            { x: "6-10", y: "Transport", value: 16 },
            { x: "11-15", y: "Transport", value: 15 },
            { x: "16-20", y: "Transport", value: 28 },
            { x: "21-25", y: "Transport", value: 31 },
            { x: "26-31", y: "Transport", value: 18 },
            { x: "1-5", y: "Leisure", value: 4 },
            { x: "6-10", y: "Leisure", value: 9 },
            { x: "11-15", y: "Leisure", value: 17 },
            { x: "16-20", y: "Leisure", value: 36 },
            { x: "21-25", y: "Leisure", value: 49 },
            { x: "26-31", y: "Leisure", value: 24 },
          ],
        },
      }

    case "opening-balance-reliance-by-pay-cycle":
      return {
        metricLabel: "Most inherited cycle",
        metricValue: "April 62%",
        insight:
          "The mock pay-cycle view shows some periods surviving mostly on starting cash rather than fresh inflow. April looks safe on the surface, but almost two-thirds of that safety is inherited from the prior close.",
        visual: {
          kind: "groupedBars",
          formatter: "percent",
          keys: ["Opening cash support", "Fresh inflow support"],
          groups: [
            {
              label: "Feb cycle",
              values: [
                { key: "Opening cash support", value: 41 },
                { key: "Fresh inflow support", value: 59 },
              ],
            },
            {
              label: "Mar cycle",
              values: [
                { key: "Opening cash support", value: 48 },
                { key: "Fresh inflow support", value: 52 },
              ],
            },
            {
              label: "Apr cycle",
              values: [
                { key: "Opening cash support", value: 62 },
                { key: "Fresh inflow support", value: 38 },
              ],
            },
            {
              label: "May cycle",
              values: [
                { key: "Opening cash support", value: 36 },
                { key: "Fresh inflow support", value: 64 },
              ],
            },
          ],
        },
      }

    case "goal-portfolio-deadline-gaps":
      return {
        metricLabel: "Quietest gap",
        metricValue: "6 weeks",
        insight:
          "The mock goal calendar is not evenly intense. There is one short breathing window in late summer, then the portfolio bunches back up into two deadline-heavy runs before year-end.",
        visual: {
          kind: "rangePlot",
          formatter: "number",
          items: [
            { label: "Q2 to Q3", start: 2, end: 4, marker: 3 },
            { label: "Summer gap", start: 4, end: 10, marker: 6 },
            { label: "Early autumn", start: 10, end: 13, marker: 11 },
            { label: "Year-end rush", start: 13, end: 17, marker: 15 },
          ],
        },
      }

    case "other-pocket-renewal-pressure":
      return {
        metricLabel: "Most subscription-like",
        metricValue: "Coworking pass",
        insight:
          "The mock Other pocket surface is not random clutter. A coworking pass and storage unit recur with near-subscription regularity, while event passes and gear stay much more sporadic.",
        visual: {
          kind: "rangePlot",
          formatter: "number",
          items: [
            { label: "Coworking pass", start: 28, end: 31, marker: 30 },
            { label: "Storage unit", start: 27, end: 30, marker: 29 },
            { label: "Event pass", start: 46, end: 88, marker: 61 },
            { label: "Equipment lease", start: 32, end: 44, marker: 37 },
          ],
        },
      }

    case "settlement-batch-size-by-room":
      return {
        metricLabel: "Largest cleanup style",
        metricValue: "Beach Trip",
        insight:
          "Beach Trip clears in chunky reset moments in the mock set, while Flat Norte and Office Lunch rely on smaller drip settlements that keep the queue visible longer.",
        visual: {
          kind: "boxplot",
          formatter: "currency",
          items: [
            { label: "Flat Norte", min: 18, q1: 34, median: 56, q3: 82, max: 118 },
            { label: "Beach Trip", min: 74, q1: 112, median: 164, q3: 226, max: 312 },
            { label: "Office Lunch", min: 9, q1: 18, median: 24, q3: 32, max: 44 },
            { label: "Weekend House", min: 28, q1: 46, median: 73, q3: 108, max: 156 },
          ],
        },
      }

    case "challenge-engagement-decay-curve":
      return {
        metricLabel: "Retention to close",
        metricValue: "58%",
        insight:
          "The mock challenge flow still looks healthy, but participation clearly thins out. Most members show up at launch, a smaller group stays visible by midpoint, and only the most engaged still post strong signals near the close.",
        visual: {
          kind: "funnel",
          formatter: "number",
          steps: [
            { label: "Started", value: 24 },
            { label: "Still active at midpoint", value: 18 },
            { label: "Scored in final stretch", value: 14 },
            { label: "Strong close participation", value: 11 },
          ],
        },
      }

    case "goal-deadline-quarter-vs-debt-burst-month":
      return {
        metricLabel: "Worst collision quarter",
        metricValue: "Q3",
        insight:
          "Q3 is where the mock schedule turns uncomfortable. Goal deadlines cluster just as debt bursts intensify, which creates a timing problem even without any single category exploding on its own.",
        visual: {
          kind: "heatmap",
          xLabels: ["Q1", "Q2", "Q3", "Q4"],
          yLabels: ["Debt burst weight", "Goal deadline load"],
          cells: [
            { x: "Q1", y: "Debt burst weight", value: 34 },
            { x: "Q2", y: "Debt burst weight", value: 49 },
            { x: "Q3", y: "Debt burst weight", value: 82 },
            { x: "Q4", y: "Debt burst weight", value: 58 },
            { x: "Q1", y: "Goal deadline load", value: 27 },
            { x: "Q2", y: "Goal deadline load", value: 41 },
            { x: "Q3", y: "Goal deadline load", value: 77 },
            { x: "Q4", y: "Goal deadline load", value: 55 },
          ],
        },
      }

    case "cushion-depth-vs-essential-median":
      return {
        metricLabel: "Median essential cover",
        metricValue: "5.2 days",
        insight:
          "The mock buffer is healthier than it first looks. Even in weaker months, it still covers several median essential-spend days, but the margin gets thin fast once housing and groceries both spike.",
        visual: {
          kind: "bullet",
          formatter: "number",
          items: [
            { label: "Feb", value: 6.1, target: 5, max: 10 },
            { label: "Mar", value: 4.8, target: 5, max: 10 },
            { label: "Apr", value: 3.9, target: 5, max: 10 },
            { label: "May", value: 5.6, target: 5, max: 10 },
            { label: "Jun", value: 5.2, target: 5, max: 10 },
          ],
        },
      }

    case "receipt-cost-concentration-by-line":
      return {
        metricLabel: "Top-line share",
        metricValue: "58%",
        insight:
          "The priciest receipts are usually not broad basket blowouts. In this mock pattern, one hero line and one supporting line explain most of the jump, so the user can cut a single item instead of redesigning the whole basket.",
        visual: {
          kind: "funnel",
          formatter: "currency",
          steps: [
            { label: "Expensive receipt total", value: 132 },
            { label: "Top line item", value: 76 },
            { label: "Top two lines", value: 104 },
            { label: "Remaining lines", value: 28 },
          ],
        },
      }

    case "multi-income-cushion-advantage":
      return {
        metricLabel: "Median close lift",
        metricValue: formatCurrency(420, { maximumFractionDigits: 0, showSign: true }),
        insight:
          "Months with two or more income events finish materially safer in the mock sample, even when their floor is only modestly better. The advantage shows up most clearly in the month-end close, not just the intramonth dip.",
        visual: {
          kind: "groupedBars",
          formatter: "currency",
          keys: ["Median floor", "Median close"],
          groups: [
            {
              label: "1 income",
              values: [
                { key: "Median floor", value: 280 },
                { key: "Median close", value: 510 },
              ],
            },
            {
              label: "2 incomes",
              values: [
                { key: "Median floor", value: 430 },
                { key: "Median close", value: 930 },
              ],
            },
            {
              label: "3+ incomes",
              values: [
                { key: "Median floor", value: 470 },
                { key: "Median close", value: 960 },
              ],
            },
          ],
        },
      }

    case "debt-burst-month-share":
      return {
        metricLabel: "Burst-heavy stream",
        metricValue: "Credit line",
        insight:
          "The mock debt mix separates cleanly between steady obligations and bursty catch-up months. Credit-line and store-card pressure cluster into burst months, while installment debt behaves far more evenly.",
        visual: {
          kind: "stackedBars",
          formatter: "percent",
          keys: ["Burst months", "Steady months"],
          items: [
            {
              label: "Credit line",
              segments: [
                { key: "Burst months", value: 72 },
                { key: "Steady months", value: 28 },
              ],
            },
            {
              label: "Store card",
              segments: [
                { key: "Burst months", value: 64 },
                { key: "Steady months", value: 36 },
              ],
            },
            {
              label: "Visa Gold",
              segments: [
                { key: "Burst months", value: 43 },
                { key: "Steady months", value: 57 },
              ],
            },
            {
              label: "Car loan",
              segments: [
                { key: "Burst months", value: 22 },
                { key: "Steady months", value: 78 },
              ],
            },
          ],
        },
      }

    case "housing-obligation-mix-by-property":
      return {
        metricLabel: "Most fee-heavy property",
        metricValue: "Rental Loft",
        insight:
          "The primary residence is still mortgage-led, but the rental property carries a much messier obligation stack in the mock data, with fees, utilities, and taxes making it feel heavier than headline mortgage alone would suggest.",
        visual: {
          kind: "stackedBars",
          formatter: "currency",
          keys: ["Mortgage", "Utilities", "Tax", "Fees", "Deposit"],
          items: [
            {
              label: "City Flat",
              segments: [
                { key: "Mortgage", value: 1180 },
                { key: "Utilities", value: 210 },
                { key: "Tax", value: 120 },
                { key: "Fees", value: 85 },
                { key: "Deposit", value: 0 },
              ],
            },
            {
              label: "Rental Loft",
              segments: [
                { key: "Mortgage", value: 640 },
                { key: "Utilities", value: 190 },
                { key: "Tax", value: 145 },
                { key: "Fees", value: 220 },
                { key: "Deposit", value: 90 },
              ],
            },
            {
              label: "Beach Studio",
              segments: [
                { key: "Mortgage", value: 0 },
                { key: "Utilities", value: 160 },
                { key: "Tax", value: 96 },
                { key: "Fees", value: 140 },
                { key: "Deposit", value: 310 },
              ],
            },
          ],
        },
      }

    case "room-category-concentration-of-pending-balance":
      return {
        metricLabel: "Most stuck category",
        metricValue: "Rent / Flat Norte",
        insight:
          "Pending balances are not evenly spread across rooms. In this review scenario, Flat Norte's unresolved load is overwhelmingly rent-led, while travel and dinner rooms skew toward groceries and social categories instead.",
        visual: {
          kind: "heatmap",
          xLabels: ["Flat Norte", "Beach Trip", "Dinner Club", "Office Lunch"],
          yLabels: ["Rent", "Groceries", "Transport", "Dining", "Tickets"],
          cells: [
            { x: "Flat Norte", y: "Rent", value: 92 },
            { x: "Flat Norte", y: "Groceries", value: 28 },
            { x: "Flat Norte", y: "Transport", value: 8 },
            { x: "Flat Norte", y: "Dining", value: 12 },
            { x: "Flat Norte", y: "Tickets", value: 5 },
            { x: "Beach Trip", y: "Rent", value: 24 },
            { x: "Beach Trip", y: "Groceries", value: 44 },
            { x: "Beach Trip", y: "Transport", value: 61 },
            { x: "Beach Trip", y: "Dining", value: 38 },
            { x: "Beach Trip", y: "Tickets", value: 56 },
            { x: "Dinner Club", y: "Rent", value: 0 },
            { x: "Dinner Club", y: "Groceries", value: 14 },
            { x: "Dinner Club", y: "Transport", value: 7 },
            { x: "Dinner Club", y: "Dining", value: 74 },
            { x: "Dinner Club", y: "Tickets", value: 9 },
            { x: "Office Lunch", y: "Rent", value: 0 },
            { x: "Office Lunch", y: "Groceries", value: 19 },
            { x: "Office Lunch", y: "Transport", value: 11 },
            { x: "Office Lunch", y: "Dining", value: 41 },
            { x: "Office Lunch", y: "Tickets", value: 4 },
          ],
        },
      }

    case "challenge-spend-pace-variance":
      return {
        metricLabel: "Steadiest member",
        metricValue: "Casey",
        insight:
          "Casey stays close to the target path all month, while Alex and Morgan oscillate between very safe and very risky pace. The boxplot makes steadiness visible in a way a single end score never does.",
        visual: {
          kind: "boxplot",
          formatter: "percent",
          items: [
            { label: "Casey", min: 44, q1: 48, median: 51, q3: 54, max: 58 },
            { label: "Riley", min: 36, q1: 43, median: 50, q3: 57, max: 63 },
            { label: "Alex", min: 19, q1: 34, median: 49, q3: 68, max: 82 },
            { label: "Morgan", min: 24, q1: 38, median: 55, q3: 72, max: 88 },
          ],
        },
      }

    case "weekend-spillover-by-category":
      return {
        metricLabel: "Largest spillover",
        metricValue: "Dining",
        insight:
          "Dining and shopping do not stop when the weekend ends in this mock pattern. They keep running hot into Monday and Tuesday, while groceries and transport normalize much faster.",
        visual: {
          kind: "groupedBars",
          formatter: "currency",
          keys: ["Weekend", "Mon-Tue spillover"],
          groups: [
            {
              label: "Dining",
              values: [
                { key: "Weekend", value: 164 },
                { key: "Mon-Tue spillover", value: 82 },
              ],
            },
            {
              label: "Shopping",
              values: [
                { key: "Weekend", value: 141 },
                { key: "Mon-Tue spillover", value: 71 },
              ],
            },
            {
              label: "Groceries",
              values: [
                { key: "Weekend", value: 118 },
                { key: "Mon-Tue spillover", value: 34 },
              ],
            },
            {
              label: "Transport",
              values: [
                { key: "Weekend", value: 64 },
                { key: "Mon-Tue spillover", value: 18 },
              ],
            },
          ],
        },
      }

    case "fresh-vs-pantry-timing-calendar":
      return {
        metricLabel: "Fresh-heavy window",
        metricValue: "Days 3-9",
        insight:
          "Fresh-heavy baskets cluster just after the month opens, while pantry-heavy stock-up runs reappear around the third week. The timing split is clean enough to feel intentional rather than random.",
        visual: {
          kind: "heatmap",
          xLabels: ["1-5", "6-10", "11-15", "16-20", "21-25", "26-31"],
          yLabels: ["Fresh-heavy", "Pantry-heavy"],
          cells: [
            { x: "1-5", y: "Fresh-heavy", value: 74 },
            { x: "6-10", y: "Fresh-heavy", value: 92 },
            { x: "11-15", y: "Fresh-heavy", value: 61 },
            { x: "16-20", y: "Fresh-heavy", value: 38 },
            { x: "21-25", y: "Fresh-heavy", value: 27 },
            { x: "26-31", y: "Fresh-heavy", value: 34 },
            { x: "1-5", y: "Pantry-heavy", value: 36 },
            { x: "6-10", y: "Pantry-heavy", value: 24 },
            { x: "11-15", y: "Pantry-heavy", value: 41 },
            { x: "16-20", y: "Pantry-heavy", value: 68 },
            { x: "21-25", y: "Pantry-heavy", value: 89 },
            { x: "26-31", y: "Pantry-heavy", value: 57 },
          ],
        },
      }

    case "bill-week-recovery-lag":
      return {
        metricLabel: "Slowest rebound",
        metricValue: "11 days",
        insight:
          "Bill-week damage is not just about the dip. In the weak months here, it takes more than a week and a half to reclaim the monthly median balance, while healthier months bounce back in under five days.",
        visual: {
          kind: "rangePlot",
          formatter: "number",
          items: [
            { label: "Feb", start: 2, end: 5, marker: 4 },
            { label: "Mar", start: 3, end: 8, marker: 6 },
            { label: "Apr", start: 4, end: 11, marker: 9 },
            { label: "May", start: 2, end: 7, marker: 5 },
            { label: "Jun", start: 3, end: 10, marker: 8 },
          ],
        },
      }

    case "goal-funding-shape-mix":
      return {
        metricLabel: "Portfolio shape",
        metricValue: "Broad-and-light",
        insight:
          "The mock portfolio is carried by many light commitments rather than a couple of dominant heavy goals. Travel and emergency targets stay broad, while only home goals show a notable heavy-allocation slice.",
        visual: {
          kind: "stackedBars",
          formatter: "percent",
          keys: ["Light", "Medium", "Heavy"],
          items: [
            {
              label: "Emergency",
              segments: [
                { key: "Light", value: 58 },
                { key: "Medium", value: 31 },
                { key: "Heavy", value: 11 },
              ],
            },
            {
              label: "Travel",
              segments: [
                { key: "Light", value: 64 },
                { key: "Medium", value: 24 },
                { key: "Heavy", value: 12 },
              ],
            },
            {
              label: "Home",
              segments: [
                { key: "Light", value: 29 },
                { key: "Medium", value: 39 },
                { key: "Heavy", value: 32 },
              ],
            },
            {
              label: "Taxes",
              segments: [
                { key: "Light", value: 42 },
                { key: "Medium", value: 37 },
                { key: "Heavy", value: 21 },
              ],
            },
          ],
        },
      }

    case "grocery-store-mix-vs-challenge-fridge-score":
      return {
        metricLabel: "Best mix-score combo",
        metricValue: "Lidl-heavy months",
        insight:
          "In the mock relationship, months with a higher discount-store mix land better fridge scores, while premium-store-heavy months trail. It reads like store choice is reinforcing challenge discipline rather than just reflecting it.",
        visual: {
          kind: "scatter",
          xLabel: "Discount-store mix (%)",
          yLabel: "Fridge score",
          points: [
            { label: "Jan", x: 28, y: 53 },
            { label: "Feb", x: 34, y: 58 },
            { label: "Mar", x: 39, y: 64 },
            { label: "Apr", x: 47, y: 71 },
            { label: "May", x: 55, y: 76 },
            { label: "Jun", x: 61, y: 82 },
            { label: "Jul", x: 44, y: 68 },
          ],
        },
      }

    case "pocket-fixed-cost-start-of-month-load":
      return {
        metricLabel: "Heaviest opening drag",
        metricValue: "City Flat",
        insight:
          "The first week is dominated by fixed housing and insurance obligations in this mock pocket mix. Travel and garage costs exist, but they do not hit the month-opening window nearly as hard.",
        visual: {
          kind: "splitBars",
          formatter: "currency",
          items: [
            { label: "City Flat", left: 1460, right: 420, leftLabel: "Days 1-7 fixed", rightLabel: "After day 7" },
            { label: "Rental Loft", left: 910, right: 330, leftLabel: "Days 1-7 fixed", rightLabel: "After day 7" },
            { label: "Primary Car", left: 320, right: 250, leftLabel: "Days 1-7 fixed", rightLabel: "After day 7" },
            { label: "Travel Pocket", left: 110, right: 460, leftLabel: "Days 1-7 fixed", rightLabel: "After day 7" },
          ],
        },
      }

    case "metric-breadth-by-member":
      return {
        metricLabel: "Best all-rounder",
        metricValue: "Jordan",
        insight:
          "Jordan stays above the group baseline across every mock challenge axis, while Alex spikes hard in savings and Casey dominates only in wants control. The breadth view makes the specialists and all-rounders easy to separate.",
        visual: {
          kind: "parallel",
          axes: ["Savings", "Fridge", "Wants", "No-Spend", "Consistency"],
          lines: [
            { label: "Jordan", values: [72, 68, 74, 69, 77] },
            { label: "Alex", values: [86, 57, 48, 63, 58] },
            { label: "Casey", values: [61, 64, 83, 55, 67] },
            { label: "Morgan", values: [54, 71, 58, 79, 52] },
          ],
        },
      }

    case "subscription-load-vs-flex-spend":
      return {
        metricLabel: "Tightest flex month",
        metricValue: "April",
        insight:
          "Recurring charges crowd out discretionary room most aggressively in April and June in this mock series. The split shows the subscription stack taking a structurally large bite before free spending even begins.",
        visual: {
          kind: "splitBars",
          formatter: "currency",
          items: [
            { label: "Mar", left: 268, right: 620, leftLabel: "Subscriptions", rightLabel: "Flex spend" },
            { label: "Apr", left: 314, right: 470, leftLabel: "Subscriptions", rightLabel: "Flex spend" },
            { label: "May", left: 276, right: 590, leftLabel: "Subscriptions", rightLabel: "Flex spend" },
            { label: "Jun", left: 328, right: 455, leftLabel: "Subscriptions", rightLabel: "Flex spend" },
          ],
        },
      }

    case "category-price-season-window":
      return {
        metricLabel: "Widest season gap",
        metricValue: "Olive oil",
        insight:
          "Produce categories move, but olive oil and coffee show the clearest low-to-high seasonal price corridor in the mock data. That makes them strong candidates for deliberate timing rather than casual replenishment.",
        visual: {
          kind: "rangePlot",
          formatter: "currency",
          items: [
            { label: "Olive oil", start: 6.8, end: 11.6, marker: 10.9 },
            { label: "Coffee", start: 3.9, end: 6.7, marker: 5.8 },
            { label: "Tomatoes", start: 1.2, end: 2.7, marker: 1.8 },
            { label: "Yogurt", start: 0.68, end: 1.14, marker: 0.92 },
          ],
        },
      }

    case "safe-spend-pace-by-pay-cycle":
      return {
        metricLabel: "Safest daily pace",
        metricValue: formatCurrency(46, { maximumFractionDigits: 0 }),
        insight:
          "Cycles that start with a stronger cushion can support a meaningfully higher safe daily burn. In this mock setup, only two of five pay cycles support a pace above EUR 40 without threatening the buffer floor.",
        visual: {
          kind: "bullet",
          formatter: "currency",
          items: [
            { label: "Cycle 1", value: 38, target: 42, max: 60 },
            { label: "Cycle 2", value: 46, target: 44, max: 60 },
            { label: "Cycle 3", value: 31, target: 40, max: 60 },
            { label: "Cycle 4", value: 43, target: 43, max: 60 },
            { label: "Cycle 5", value: 28, target: 39, max: 60 },
          ],
        },
      }

    case "debt-vs-essentials-burden-split":
      return {
        metricLabel: "Most debt-heavy month",
        metricValue: "June",
        insight:
          "Debt does not always dominate essentials, but the mock June month comes close. That split makes the tradeoff legible by showing debt burden alongside housing, groceries, and utilities in the same frame.",
        visual: {
          kind: "splitBars",
          formatter: "currency",
          items: [
            { label: "Mar", left: 410, right: 960, leftLabel: "Debt", rightLabel: "Essentials" },
            { label: "Apr", left: 520, right: 990, leftLabel: "Debt", rightLabel: "Essentials" },
            { label: "May", left: 460, right: 935, leftLabel: "Debt", rightLabel: "Essentials" },
            { label: "Jun", left: 690, right: 980, leftLabel: "Debt", rightLabel: "Essentials" },
          ],
        },
      }

    case "fronted-category-mix-by-room":
      return {
        metricLabel: "Most fronted category",
        metricValue: "Groceries",
        insight:
          "Shared fronting is not mainly nightlife in this mock pattern. Groceries and transport carry the heaviest unpaid lead, especially in travel and flat rooms where one payer often covers the group first.",
        visual: {
          kind: "stackedBars",
          formatter: "currency",
          keys: ["Groceries", "Transport", "Dining", "Rent"],
          items: [
            {
              label: "Flat Norte",
              segments: [
                { key: "Groceries", value: 118 },
                { key: "Transport", value: 36 },
                { key: "Dining", value: 44 },
                { key: "Rent", value: 172 },
              ],
            },
            {
              label: "Beach Trip",
              segments: [
                { key: "Groceries", value: 134 },
                { key: "Transport", value: 112 },
                { key: "Dining", value: 68 },
                { key: "Rent", value: 54 },
              ],
            },
            {
              label: "Dinner Club",
              segments: [
                { key: "Groceries", value: 41 },
                { key: "Transport", value: 9 },
                { key: "Dining", value: 126 },
                { key: "Rent", value: 0 },
              ],
            },
          ],
        },
      }

    case "vehicle-maintenance-month-vs-buffer-drop":
      return {
        metricLabel: "Sharpest linked hit",
        metricValue: "May",
        insight:
          "The mock relationship slopes clearly upward: bigger maintenance months come with deeper buffer erosion. May is the cleanest example, where a large service month lines up with the steepest balance drop.",
        visual: {
          kind: "scatter",
          xLabel: "Maintenance spend",
          yLabel: "Buffer drop",
          points: [
            { label: "Jan", x: 120, y: 180 },
            { label: "Feb", x: 180, y: 240 },
            { label: "Mar", x: 260, y: 340 },
            { label: "Apr", x: 420, y: 520 },
            { label: "May", x: 760, y: 910 },
            { label: "Jun", x: 390, y: 470 },
          ],
        },
      }

    case "subscription-load-vs-challenge-wants-score":
      return {
        metricLabel: "Weakest wants score",
        metricValue: "61%",
        insight:
          "Higher subscription load lines up with weaker wants-control results in this mock series. The relationship is not perfect, but the heaviest passive-charge months consistently sit in the lower-score half.",
        visual: {
          kind: "scatter",
          xLabel: "Subscription load (%)",
          yLabel: "Wants score",
          points: [
            { label: "Jan", x: 9, y: 83 },
            { label: "Feb", x: 11, y: 79 },
            { label: "Mar", x: 13, y: 75 },
            { label: "Apr", x: 16, y: 69 },
            { label: "May", x: 18, y: 64 },
            { label: "Jun", x: 19, y: 61 },
            { label: "Jul", x: 15, y: 71 },
          ],
        },
      }

    case "merchant-budget-miss-map":
      return {
        metricLabel: "Worst repeat miss",
        metricValue: "Amazon / Shopping",
        insight:
          "Budget misses cluster around a small merchant set, with Amazon, Zara, and Uber Eats repeatedly driving category overages instead of broad-based drift.",
        visual: {
          kind: "heatmap",
          xLabels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
          yLabels: ["Amazon", "Zara", "Uber Eats", "Shell", "Mercadona"],
          cells: [
            { x: "Jan", y: "Amazon", value: 76 },
            { x: "Feb", y: "Amazon", value: 84 },
            { x: "Mar", y: "Amazon", value: 92 },
            { x: "Apr", y: "Amazon", value: 88 },
            { x: "May", y: "Amazon", value: 81 },
            { x: "Jun", y: "Amazon", value: 74 },
            { x: "Jan", y: "Zara", value: 29 },
            { x: "Feb", y: "Zara", value: 34 },
            { x: "Mar", y: "Zara", value: 47 },
            { x: "Apr", y: "Zara", value: 63 },
            { x: "May", y: "Zara", value: 72 },
            { x: "Jun", y: "Zara", value: 58 },
            { x: "Jan", y: "Uber Eats", value: 61 },
            { x: "Feb", y: "Uber Eats", value: 54 },
            { x: "Mar", y: "Uber Eats", value: 66 },
            { x: "Apr", y: "Uber Eats", value: 79 },
            { x: "May", y: "Uber Eats", value: 83 },
            { x: "Jun", y: "Uber Eats", value: 68 },
            { x: "Jan", y: "Shell", value: 22 },
            { x: "Feb", y: "Shell", value: 31 },
            { x: "Mar", y: "Shell", value: 28 },
            { x: "Apr", y: "Shell", value: 36 },
            { x: "May", y: "Shell", value: 33 },
            { x: "Jun", y: "Shell", value: 27 },
            { x: "Jan", y: "Mercadona", value: 18 },
            { x: "Feb", y: "Mercadona", value: 26 },
            { x: "Mar", y: "Mercadona", value: 21 },
            { x: "Apr", y: "Mercadona", value: 24 },
            { x: "May", y: "Mercadona", value: 19 },
            { x: "Jun", y: "Mercadona", value: 16 },
          ],
        },
      }

    case "diverse-fridge-store-receipt-range":
      return {
        metricLabel: "Most stable middle",
        metricValue: "Mercadona 34 EUR",
        insight:
          "Mercadona stays in the most believable middle lane of the mock set, with a narrow everyday-trip corridor. Carrefour and El Corte swing much wider, which makes receipt size feel less predictable from trip to trip.",
        visual: {
          kind: "rangePlot",
          formatter: "currency",
          items: [
            { label: "Mercadona", start: 18, end: 61, marker: 34 },
            { label: "Lidl", start: 14, end: 56, marker: 29 },
            { label: "Aldi", start: 12, end: 49, marker: 27 },
            { label: "Carrefour", start: 21, end: 86, marker: 45 },
            { label: "El Corte", start: 26, end: 94, marker: 53 },
          ],
        },
      }

    case "diverse-fridge-unit-price-distribution":
      return {
        metricLabel: "Tightest unit median",
        metricValue: "Lidl 1.42 EUR",
        insight:
          "The mock distribution keeps Lidl and Aldi in the tight low-price band, while Carrefour and El Corte show fatter upper quartiles that suggest more premium-category drift inside the same basket.",
        visual: {
          kind: "boxplot",
          formatter: "currency",
          items: [
            { label: "Lidl", min: 0.62, q1: 1.04, median: 1.42, q3: 1.78, max: 2.36 },
            { label: "Aldi", min: 0.66, q1: 1.08, median: 1.49, q3: 1.92, max: 2.58 },
            { label: "Mercadona", min: 0.78, q1: 1.21, median: 1.67, q3: 2.14, max: 2.96 },
            { label: "Carrefour", min: 0.88, q1: 1.44, median: 1.98, q3: 2.62, max: 3.74 },
            { label: "El Corte", min: 1.02, q1: 1.71, median: 2.28, q3: 3.05, max: 4.18 },
          ],
        },
      }

    case "store-price-dispersion-index":
      return {
        metricLabel: "Widest spread",
        metricValue: formatCurrency(2.7, { maximumFractionDigits: 2 }),
        insight:
          "Carrefour shows the biggest within-store price dispersion, while Lidl stays much tighter, making it easier to predict basket cost before checkout.",
        visual: {
          kind: "boxplot",
          formatter: "currency",
          items: [
            { label: "Carrefour", min: 0.9, q1: 1.6, median: 2.2, q3: 3.4, max: 5.1 },
            { label: "Mercadona", min: 0.8, q1: 1.3, median: 1.8, q3: 2.4, max: 3.6 },
            { label: "Lidl", min: 0.7, q1: 1.1, median: 1.5, q3: 1.9, max: 2.6 },
            { label: "Aldi", min: 0.6, q1: 1.0, median: 1.4, q3: 2.0, max: 2.9 },
            { label: "El Corte", min: 1.0, q1: 1.8, median: 2.7, q3: 3.5, max: 4.6 },
          ],
        },
      }

    case "fixed-bill-retention-rate":
      return {
        metricLabel: "Latest retained",
        metricValue: "49%",
        insight:
          "Fixed and essential bills are leaving less than half of gross inflow available to finish the month, with only one month clearing the healthier 55% target.",
        visual: {
          kind: "bullet",
          formatter: "percent",
          items: [
            { label: "Feb", value: 58, target: 55, max: 100 },
            { label: "Mar", value: 46, target: 55, max: 100 },
            { label: "Apr", value: 43, target: 55, max: 100 },
            { label: "May", value: 51, target: 55, max: 100 },
            { label: "Jun", value: 49, target: 55, max: 100 },
          ],
        },
      }

    case "minimum-like-payment-pattern":
      return {
        metricLabel: "Likeliest minimum trap",
        metricValue: "Store Card",
        insight:
          "The store-card stream barely moves from one month to the next, which is exactly the stagnant payment shape you would expect from minimum-like debt behavior.",
        visual: {
          kind: "dotPlot",
          formatter: "currency",
          items: [
            { label: "Store Card", value: 185, reference: 182 },
            { label: "Visa Gold", value: 210, reference: 176 },
            { label: "Car Loan", value: 362, reference: 362 },
            { label: "Personal Loan", value: 248, reference: 223 },
            { label: "Credit Line", value: 132, reference: 129 },
          ],
        },
      }

    case "vehicle-fuel-vs-maintenance-rhythm":
      return {
        metricLabel: "Biggest rhythm gap",
        metricValue: formatCurrency(740, { maximumFractionDigits: 0 }),
        insight:
          "The diesel SUV shows a predictable fuel baseline but highly bursty maintenance, making its ownership profile feel steady most months and painful in service months.",
        visual: {
          kind: "dumbbell",
          formatter: "currency",
          items: [
            { label: "Diesel SUV", start: 320, end: 1060 },
            { label: "City Hatch", start: 240, end: 620 },
            { label: "Family Van", start: 360, end: 820 },
            { label: "Scooter", start: 74, end: 210 },
          ],
        },
      }

    case "room-settlement-queue-age":
      return {
        metricLabel: "Oldest unresolved queue",
        metricValue: "47 days",
        insight:
          "Flat Norte is carrying a settlement queue that has been unresolved for nearly seven weeks, while the other rooms clear within a much tighter operating range.",
        visual: {
          kind: "rangePlot",
          formatter: "number",
          items: [
            { label: "Flat Norte", start: 11, end: 47, marker: 33 },
            { label: "Beach Trip", start: 4, end: 19, marker: 12 },
            { label: "Weekend House", start: 6, end: 22, marker: 15 },
            { label: "Office Lunch", start: 2, end: 9, marker: 6 },
          ],
        },
      }

    case "metric-podium-concentration":
      return {
        metricLabel: "Most concentrated metric",
        metricValue: "Wants %",
        insight:
          "A couple of members are dominating the podium in the wants-control metric, while savings and grocery metrics show a much healthier share of podium finishes across the group.",
        visual: {
          kind: "stackedBars",
          formatter: "percent",
          keys: ["Alex", "Sam", "Jordan", "Others"],
          items: [
            {
              label: "Wants %",
              segments: [
                { key: "Alex", value: 41 },
                { key: "Sam", value: 29 },
                { key: "Jordan", value: 18 },
                { key: "Others", value: 12 },
              ],
            },
            {
              label: "Savings",
              segments: [
                { key: "Alex", value: 24 },
                { key: "Sam", value: 22 },
                { key: "Jordan", value: 19 },
                { key: "Others", value: 35 },
              ],
            },
            {
              label: "Fridge",
              segments: [
                { key: "Alex", value: 27 },
                { key: "Sam", value: 25 },
                { key: "Jordan", value: 21 },
                { key: "Others", value: 27 },
              ],
            },
            {
              label: "No-Spend",
              segments: [
                { key: "Alex", value: 19 },
                { key: "Sam", value: 18 },
                { key: "Jordan", value: 14 },
                { key: "Others", value: 49 },
              ],
            },
          ],
        },
      }

    case "recurring-bills-vs-goal-slack":
      return {
        metricLabel: "Tightest slack month",
        metricValue: "8 days",
        insight:
          "As recurring bills climb above 50% of inflow, the months with active goal plans collapse into single-digit slack days, leaving almost no breathing room.",
        visual: {
          kind: "scatter",
          xLabel: "Recurring bills share (%)",
          yLabel: "Goal slack days",
          points: [
            { label: "Jan", x: 31, y: 24 },
            { label: "Feb", x: 35, y: 21 },
            { label: "Mar", x: 38, y: 19 },
            { label: "Apr", x: 46, y: 12 },
            { label: "May", x: 52, y: 8 },
            { label: "Jun", x: 49, y: 10 },
            { label: "Jul", x: 42, y: 15 },
          ],
        },
      }

    case "goal-deadline-order-vs-target-size":
      return {
        metricLabel: "Nearest big goal",
        metricValue: "Home Deposit",
        insight:
          "The portfolio is front-loaded: the two largest targets sit in the near-term part of the timeline instead of being safely staged into later quarters.",
        visual: {
          kind: "scatter",
          xLabel: "Months until deadline",
          yLabel: "Target amount",
          points: [
            { label: "Home Deposit", x: 5, y: 9000 },
            { label: "Emergency Buffer", x: 3, y: 4200 },
            { label: "Summer Travel", x: 2, y: 1600 },
            { label: "Tax Reserve", x: 7, y: 3800 },
            { label: "New Laptop", x: 4, y: 2100 },
            { label: "Move Fund", x: 9, y: 6400 },
          ],
        },
      }

    case "category-timing-skew-ladder":
      return {
        metricLabel: "Earliest pressure point",
        metricValue: "Housing day 4",
        insight:
          "Housing, subscriptions, and utilities all land early, while leisure and dining wait much later, creating a predictable early-month squeeze before discretionary behavior kicks in.",
        visual: {
          kind: "arrowPlot",
          formatter: "number",
          items: [
            { label: "Housing", start: 4, end: 6 },
            { label: "Subscriptions", start: 5, end: 8 },
            { label: "Utilities", start: 7, end: 10 },
            { label: "Groceries", start: 9, end: 18 },
            { label: "Dining", start: 15, end: 24 },
            { label: "Leisure", start: 18, end: 27 },
          ],
        },
      }

    case "quantity-discount-failure-map":
      return {
        metricLabel: "Worst bulk trap",
        metricValue: "Carrefour / Snacks",
        insight:
          "Bigger baskets are not always buying better unit economics. Snacks and drinks at Carrefour and El Corte still price poorly even when quantity goes up.",
        visual: {
          kind: "heatmap",
          xLabels: ["Produce", "Drinks", "Snacks", "Frozen", "Cleaning"],
          yLabels: ["Mercadona", "Carrefour", "Lidl", "Aldi", "El Corte"],
          cells: [
            { x: "Produce", y: "Mercadona", value: 18 },
            { x: "Drinks", y: "Mercadona", value: 31 },
            { x: "Snacks", y: "Mercadona", value: 44 },
            { x: "Frozen", y: "Mercadona", value: 27 },
            { x: "Cleaning", y: "Mercadona", value: 23 },
            { x: "Produce", y: "Carrefour", value: 36 },
            { x: "Drinks", y: "Carrefour", value: 58 },
            { x: "Snacks", y: "Carrefour", value: 91 },
            { x: "Frozen", y: "Carrefour", value: 62 },
            { x: "Cleaning", y: "Carrefour", value: 49 },
            { x: "Produce", y: "Lidl", value: 14 },
            { x: "Drinks", y: "Lidl", value: 28 },
            { x: "Snacks", y: "Lidl", value: 33 },
            { x: "Frozen", y: "Lidl", value: 24 },
            { x: "Cleaning", y: "Lidl", value: 21 },
            { x: "Produce", y: "Aldi", value: 16 },
            { x: "Drinks", y: "Aldi", value: 22 },
            { x: "Snacks", y: "Aldi", value: 39 },
            { x: "Frozen", y: "Aldi", value: 26 },
            { x: "Cleaning", y: "Aldi", value: 24 },
            { x: "Produce", y: "El Corte", value: 42 },
            { x: "Drinks", y: "El Corte", value: 67 },
            { x: "Snacks", y: "El Corte", value: 85 },
            { x: "Frozen", y: "El Corte", value: 59 },
            { x: "Cleaning", y: "El Corte", value: 53 },
          ],
        },
      }

    case "transfer-rescue-frequency":
      return {
        metricLabel: "At-risk months",
        metricValue: "3 of 6",
        insight:
          "Half of the recent weak-close months only stayed positive because of transfer-like inflows, which means the apparent resilience is less earned than it first appears.",
        visual: {
          kind: "groupedBars",
          formatter: "currency",
          keys: ["Core close", "Close after rescue"],
          groups: [
            {
              label: "Jan",
              values: [
                { key: "Core close", value: 420 },
                { key: "Close after rescue", value: 420 },
              ],
            },
            {
              label: "Feb",
              values: [
                { key: "Core close", value: 40 },
                { key: "Close after rescue", value: 160 },
              ],
            },
            {
              label: "Mar",
              values: [
                { key: "Core close", value: 55 },
                { key: "Close after rescue", value: 210 },
              ],
            },
            {
              label: "Apr",
              values: [
                { key: "Core close", value: 180 },
                { key: "Close after rescue", value: 180 },
              ],
            },
            {
              label: "May",
              values: [
                { key: "Core close", value: 20 },
                { key: "Close after rescue", value: 120 },
              ],
            },
            {
              label: "Jun",
              values: [
                { key: "Core close", value: 260 },
                { key: "Close after rescue", value: 260 },
              ],
            },
          ],
        },
      }

    case "debt-date-regularity-score":
      return {
        metricLabel: "Least regular stream",
        metricValue: "Store card",
        insight:
          "The car loan lands inside a narrow predictable band, but the store card swings across nearly half the month, making it much harder to plan around.",
        visual: {
          kind: "rangePlot",
          formatter: "number",
          items: [
            { label: "Car loan", start: 5, end: 8, marker: 6 },
            { label: "Visa Gold", start: 10, end: 16, marker: 13 },
            { label: "Store card", start: 7, end: 21, marker: 15 },
            { label: "Personal loan", start: 12, end: 18, marker: 15 },
            { label: "Credit line", start: 15, end: 26, marker: 20 },
          ],
        },
      }

    case "travel-spend-density-by-country":
      return {
        metricLabel: "Densest country",
        metricValue: "Japan",
        insight:
          "Japan and Switzerland absorb a disproportionately dense share of travel-pocket spend, which suggests a small number of premium destinations are driving the travel surface.",
        visual: {
          kind: "treemap",
          formatter: "currency",
          items: [
            { label: "Japan", value: 3240 },
            { label: "Switzerland", value: 2690 },
            { label: "Italy", value: 1840 },
            { label: "Portugal", value: 1120 },
            { label: "France", value: 980 },
            { label: "Germany", value: 760 },
          ],
        },
      }

    case "room-split-precision-score":
      return {
        metricLabel: "Highest precision room",
        metricValue: "Flat Norte 84%",
        insight:
          "Flat Norte relies heavily on item-level and custom splits, while Beach Trip still falls back to equal splitting for a large share of transactions.",
        visual: {
          kind: "groupedBars",
          formatter: "percent",
          keys: ["Item-level", "Custom", "Equal"],
          groups: [
            {
              label: "Flat Norte",
              values: [
                { key: "Item-level", value: 52 },
                { key: "Custom", value: 32 },
                { key: "Equal", value: 16 },
              ],
            },
            {
              label: "Beach Trip",
              values: [
                { key: "Item-level", value: 24 },
                { key: "Custom", value: 18 },
                { key: "Equal", value: 58 },
              ],
            },
            {
              label: "Weekend House",
              values: [
                { key: "Item-level", value: 33 },
                { key: "Custom", value: 29 },
                { key: "Equal", value: 38 },
              ],
            },
            {
              label: "Office Lunch",
              values: [
                { key: "Item-level", value: 18 },
                { key: "Custom", value: 14 },
                { key: "Equal", value: 68 },
              ],
            },
          ],
        },
      }

    case "rank-recovery-after-bad-month":
      return {
        metricLabel: "Best rebound",
        metricValue: "Alex 5 -> 2",
        insight:
          "Alex and Jordan are the clearest comeback players, jumping multiple rank positions after bad months instead of staying stuck in the middle of the table.",
        visual: {
          kind: "dumbbell",
          formatter: "number",
          items: [
            { label: "Alex", start: 5, end: 2 },
            { label: "Jordan", start: 6, end: 3 },
            { label: "Sam", start: 4, end: 4 },
            { label: "Casey", start: 7, end: 5 },
            { label: "Riley", start: 8, end: 7 },
          ],
        },
      }

    case "shared-expense-nights-vs-wants-control":
      return {
        metricLabel: "Worst control month",
        metricValue: "May 38%",
        insight:
          "Months with heavier evening shared-expense activity line up with materially weaker wants-control scores, especially once the social calendar turns busier in late spring.",
        visual: {
          kind: "scatter",
          xLabel: "Evening shared transactions",
          yLabel: "Wants share (%)",
          points: [
            { label: "Jan", x: 8, y: 21 },
            { label: "Feb", x: 10, y: 23 },
            { label: "Mar", x: 13, y: 26 },
            { label: "Apr", x: 17, y: 31 },
            { label: "May", x: 22, y: 38 },
            { label: "Jun", x: 19, y: 34 },
          ],
        },
      }

    case "goal-horizon-balance-index":
      return {
        metricLabel: "Largest tilt",
        metricValue: "Short-term +19 pts",
        insight:
          "The portfolio is overweight on short-horizon goals and underweight on long-horizon planning, which makes the goal stack feel urgent but less balanced.",
        visual: {
          kind: "bullet",
          formatter: "percent",
          items: [
            { label: "Short-term", value: 52, target: 33, max: 100 },
            { label: "Medium-term", value: 30, target: 33, max: 100 },
            { label: "Long-term", value: 18, target: 33, max: 100 },
          ],
        },
      }

    case "pocket-calendar-collision-map":
      return {
        metricLabel: "Peak collision",
        metricValue: "Week 2",
        insight:
          "Vehicles, housing, and other pocket obligations stack hardest in the second week of the month, creating a narrow ownership-cost choke point.",
        visual: {
          kind: "heatmap",
          xLabels: ["Week 1", "Week 2", "Week 3", "Week 4", "Week 5"],
          yLabels: ["Vehicles", "Housing", "Travel", "Other"],
          cells: [
            { x: "Week 1", y: "Vehicles", value: 42 },
            { x: "Week 2", y: "Vehicles", value: 81 },
            { x: "Week 3", y: "Vehicles", value: 33 },
            { x: "Week 4", y: "Vehicles", value: 28 },
            { x: "Week 5", y: "Vehicles", value: 14 },
            { x: "Week 1", y: "Housing", value: 56 },
            { x: "Week 2", y: "Housing", value: 94 },
            { x: "Week 3", y: "Housing", value: 41 },
            { x: "Week 4", y: "Housing", value: 22 },
            { x: "Week 5", y: "Housing", value: 11 },
            { x: "Week 1", y: "Travel", value: 15 },
            { x: "Week 2", y: "Travel", value: 39 },
            { x: "Week 3", y: "Travel", value: 61 },
            { x: "Week 4", y: "Travel", value: 47 },
            { x: "Week 5", y: "Travel", value: 20 },
            { x: "Week 1", y: "Other", value: 31 },
            { x: "Week 2", y: "Other", value: 72 },
            { x: "Week 3", y: "Other", value: 36 },
            { x: "Week 4", y: "Other", value: 18 },
            { x: "Week 5", y: "Other", value: 8 },
          ],
        },
      }

    case "overspend-streak-by-category":
      return {
        metricLabel: "Longest streak",
        metricValue: "Dining 5 months",
        insight:
          "Dining and shopping are not just bad in isolated months. They are producing the longest overrun streaks, which makes them more urgent than categories with occasional spikes.",
        visual: {
          kind: "dotPlot",
          formatter: "number",
          items: [
            { label: "Dining", value: 5, reference: 2 },
            { label: "Shopping", value: 4, reference: 2 },
            { label: "Transport", value: 3, reference: 1 },
            { label: "Leisure", value: 4, reference: 1 },
            { label: "Groceries", value: 2, reference: 2 },
          ],
        },
      }

    case "budget-breach-recovery-curve":
      return {
        metricLabel: "Slowest recovery",
        metricValue: "Dining 9 days",
        insight:
          "The mock pattern makes the recovery story easy to judge. Groceries and utilities settle back quickly after a miss, while dining and shopping stay elevated long enough to keep the month under pressure.",
        visual: {
          kind: "rangePlot",
          formatter: "number",
          items: [
            { label: "Dining", start: 2, end: 9, marker: 4 },
            { label: "Shopping", start: 1, end: 7, marker: 3 },
            { label: "Transport", start: 1, end: 5, marker: 2 },
            { label: "Groceries", start: 1, end: 3, marker: 2 },
            { label: "Utilities", start: 1, end: 2, marker: 1 },
          ],
        },
      }

    case "essential-flex-crowd-out-map":
      return {
        metricLabel: "Hardest crowd-out",
        metricValue: "Dining -42%",
        insight:
          "The seeded scenario shows a clear tradeoff line. When essential spikes climb toward rent, energy, and transport stress, discretionary categories do not move evenly: dining gets cut first, leisure follows, and shopping proves surprisingly sticky.",
        visual: {
          kind: "scatter",
          xLabel: "Essential spike index",
          yLabel: "Flex category drop %",
          points: [
            { label: "Dining", x: 82, y: 42 },
            { label: "Leisure", x: 74, y: 31 },
            { label: "Shopping", x: 69, y: 19 },
            { label: "Subscriptions", x: 61, y: 8 },
            { label: "Transport", x: 54, y: 14 },
            { label: "Health", x: 47, y: 4 },
          ],
        },
      }

    case "merchant-spike-repeaters":
      return {
        metricLabel: "Top repeater",
        metricValue: "Amazon 6 shock days",
        insight:
          "This mock set is built to expose the difference between chronic offenders and one-off hits. Amazon and Ikea keep appearing on high-ticket surprise days, while one large fuel or airline spike never repeats enough to deserve the same attention.",
        visual: {
          kind: "rankedList",
          formatter: "number",
          items: [
            { label: "Amazon", value: 6, context: "repeat shock source" },
            { label: "Ikea", value: 4, context: "clustered home spend" },
            { label: "Apple", value: 3, context: "upgrade month echo" },
            { label: "Zara", value: 3, context: "two-week burst" },
            { label: "Shell", value: 2, context: "travel-related" },
            { label: "Delta", value: 1, context: "one-off trip" },
          ],
        },
      }

    case "basket-mix-inflation-waterfall":
      return {
        metricLabel: "Mix-driven lift",
        metricValue: "+48 EUR",
        insight:
          "The mock basket shows a believable split between market inflation and user behavior. Prices pushed the trip up, but a noticeable shift into premium proteins, prepared meals, and branded household items added an even bigger lift.",
        visual: {
          kind: "waterfall",
          formatter: "currency",
          steps: [
            { label: "Base basket", value: 182 },
            { label: "Price inflation", value: 26 },
            { label: "Richer mix", value: 48 },
            { label: "Store markdowns", value: -17 },
            { label: "Current basket", value: 0, isTotal: true },
          ],
        },
      }

    case "store-visit-mission-drift":
      return {
        metricLabel: "Most stable role",
        metricValue: "Lidl",
        insight:
          "The scenario is designed to make role drift obvious. Lidl stays mostly stock-up, Carrefour oscillates between stock-up and specialty missions, and Mercadona plays an expensive but frequent top-up role.",
        visual: {
          kind: "groupedBars",
          formatter: "number",
          keys: ["Top-up", "Stock-up", "Specialty"],
          groups: [
            {
              label: "Lidl",
              values: [
                { key: "Top-up", value: 8 },
                { key: "Stock-up", value: 19 },
                { key: "Specialty", value: 3 },
              ],
            },
            {
              label: "Mercadona",
              values: [
                { key: "Top-up", value: 17 },
                { key: "Stock-up", value: 9 },
                { key: "Specialty", value: 2 },
              ],
            },
            {
              label: "Carrefour",
              values: [
                { key: "Top-up", value: 7 },
                { key: "Stock-up", value: 10 },
                { key: "Specialty", value: 8 },
              ],
            },
            {
              label: "Aldi",
              values: [
                { key: "Top-up", value: 4 },
                { key: "Stock-up", value: 11 },
                { key: "Specialty", value: 1 },
              ],
            },
          ],
        },
      }

    case "cushion-shock-rebuild-weeks":
      return {
        metricLabel: "Slowest rebuild",
        metricValue: "Travel shock 7.5 weeks",
        insight:
          "The seeded recovery bands show a convincing resilience story. Utility and medical shocks recover inside a month, but travel and home-repair hits take nearly two pay cycles to restore the prior cushion band.",
        visual: {
          kind: "bullet",
          formatter: "number",
          items: [
            { label: "Travel shock", value: 7.5, target: 4, max: 10 },
            { label: "Home repair", value: 6.2, target: 4, max: 10 },
            { label: "Medical", value: 4.1, target: 4, max: 10 },
            { label: "Insurance jump", value: 3.6, target: 4, max: 10 },
            { label: "Utility spike", value: 2.8, target: 4, max: 10 },
          ],
        },
      }

    case "low-balance-rescue-source-mix":
      return {
        metricLabel: "Most transfer-dependent month",
        metricValue: "Apr",
        insight:
          "The review scenario intentionally contrasts healthier and weaker rescue stories. March and May climb out of the danger zone with income and spending restraint, while April relies heavily on transfers to survive.",
        visual: {
          kind: "stackedBars",
          formatter: "currency",
          keys: ["Income relief", "Transfers", "Spend freeze"],
          items: [
            {
              label: "Jan",
              segments: [
                { key: "Income relief", value: 620 },
                { key: "Transfers", value: 120 },
                { key: "Spend freeze", value: 210 },
              ],
            },
            {
              label: "Feb",
              segments: [
                { key: "Income relief", value: 540 },
                { key: "Transfers", value: 80 },
                { key: "Spend freeze", value: 250 },
              ],
            },
            {
              label: "Mar",
              segments: [
                { key: "Income relief", value: 710 },
                { key: "Transfers", value: 40 },
                { key: "Spend freeze", value: 180 },
              ],
            },
            {
              label: "Apr",
              segments: [
                { key: "Income relief", value: 290 },
                { key: "Transfers", value: 420 },
                { key: "Spend freeze", value: 130 },
              ],
            },
            {
              label: "May",
              segments: [
                { key: "Income relief", value: 660 },
                { key: "Transfers", value: 60 },
                { key: "Spend freeze", value: 220 },
              ],
            },
          ],
        },
      }

    case "debt-collision-weeks":
      return {
        metricLabel: "Peak stack",
        metricValue: "Week 3",
        insight:
          "The mock collision grid is built to show one unmistakable pain window. Credit-card autopays, financing, and loan servicing all bunch together in the third week, leaving week one and week four comparatively breathable.",
        visual: {
          kind: "heatmap",
          xLabels: ["Week 1", "Week 2", "Week 3", "Week 4", "Week 5"],
          yLabels: ["Credit card", "Car loan", "Student loan", "Store finance", "Mortgage"],
          cells: [
            { x: "Week 1", y: "Credit card", value: 18 },
            { x: "Week 2", y: "Credit card", value: 24 },
            { x: "Week 3", y: "Credit card", value: 92 },
            { x: "Week 4", y: "Credit card", value: 31 },
            { x: "Week 5", y: "Credit card", value: 8 },
            { x: "Week 1", y: "Car loan", value: 12 },
            { x: "Week 2", y: "Car loan", value: 17 },
            { x: "Week 3", y: "Car loan", value: 86 },
            { x: "Week 4", y: "Car loan", value: 22 },
            { x: "Week 5", y: "Car loan", value: 5 },
            { x: "Week 1", y: "Student loan", value: 10 },
            { x: "Week 2", y: "Student loan", value: 15 },
            { x: "Week 3", y: "Student loan", value: 73 },
            { x: "Week 4", y: "Student loan", value: 19 },
            { x: "Week 5", y: "Student loan", value: 0 },
            { x: "Week 1", y: "Store finance", value: 4 },
            { x: "Week 2", y: "Store finance", value: 28 },
            { x: "Week 3", y: "Store finance", value: 66 },
            { x: "Week 4", y: "Store finance", value: 14 },
            { x: "Week 5", y: "Store finance", value: 0 },
            { x: "Week 1", y: "Mortgage", value: 58 },
            { x: "Week 2", y: "Mortgage", value: 11 },
            { x: "Week 3", y: "Mortgage", value: 37 },
            { x: "Week 4", y: "Mortgage", value: 10 },
            { x: "Week 5", y: "Mortgage", value: 0 },
          ],
        },
      }

    case "debt-ticket-drift-by-stream":
      return {
        metricLabel: "Steepest ticket drift",
        metricValue: "Store finance +82 EUR",
        insight:
          "The mock stream paths are deliberately asymmetric. Mortgage and car-loan tickets stay steady, while store-finance and revolving-card payments creep upward enough to feel worse even before the debt share chart moves much.",
        visual: {
          kind: "arrowPlot",
          formatter: "currency",
          items: [
            { label: "Store finance", start: 128, end: 210 },
            { label: "Credit card", start: 240, end: 298 },
            { label: "Student loan", start: 172, end: 185 },
            { label: "Car loan", start: 318, end: 324 },
            { label: "Mortgage", start: 860, end: 872 },
          ],
        },
      }

    case "goal-pace-compression-by-quarter":
      return {
        metricLabel: "Tightest quarter",
        metricValue: "Q3",
        insight:
          "The scenario makes compression easy to see. Q3 carries the most required monthly pace because two travel goals, a moving buffer, and tax catch-up all tighten inside the same quarter.",
        visual: {
          kind: "groupedBars",
          formatter: "currency",
          keys: ["Required / mo", "Allocated / mo"],
          groups: [
            {
              label: "Q2",
              values: [
                { key: "Required / mo", value: 420 },
                { key: "Allocated / mo", value: 360 },
              ],
            },
            {
              label: "Q3",
              values: [
                { key: "Required / mo", value: 720 },
                { key: "Allocated / mo", value: 480 },
              ],
            },
            {
              label: "Q4",
              values: [
                { key: "Required / mo", value: 510 },
                { key: "Allocated / mo", value: 430 },
              ],
            },
            {
              label: "Q1",
              values: [
                { key: "Required / mo", value: 380 },
                { key: "Allocated / mo", value: 340 },
              ],
            },
          ],
        },
      }

    case "goal-pause-relief-waterfall":
      return {
        metricLabel: "Pause relief",
        metricValue: "-230 EUR / mo",
        insight:
          "The mock goal portfolio is designed to show a real reprioritization decision. Pausing the renovation goal meaningfully reduces monthly pace pressure, while pausing the emergency buffer barely changes the stack because it was already under-allocated.",
        visual: {
          kind: "waterfall",
          formatter: "currency",
          steps: [
            { label: "Current pace", value: 690 },
            { label: "Pause renovation", value: -230 },
            { label: "Keep emergency", value: 0 },
            { label: "Keep travel", value: 0 },
            { label: "Revised pace", value: 0, isTotal: true },
          ],
        },
      }

    case "vehicle-reserve-adequacy-bands":
      return {
        metricLabel: "Most exposed vehicle",
        metricValue: "Family SUV",
        insight:
          "The seeded bands intentionally contrast a stable commuter car with a more expensive family vehicle. The scooter and hatchback sit inside their reserve targets, while the SUV keeps outrunning its realistic maintenance band.",
        visual: {
          kind: "bullet",
          formatter: "currency",
          items: [
            { label: "Family SUV", value: 1340, target: 980, max: 1600 },
            { label: "City Hatchback", value: 640, target: 720, max: 1200 },
            { label: "Scooter", value: 180, target: 220, max: 600 },
            { label: "Weekend Coupe", value: 890, target: 760, max: 1400 },
          ],
        },
      }

    case "housing-fixed-load-seasonality":
      return {
        metricLabel: "Heaviest month",
        metricValue: "Jan 1,540 EUR",
        insight:
          "The mock housing surface uses believable seasonality: winter utilities inflate January and February, while insurance and property-fee renewals hit mid-year. The result is a clear fixed-load calendar instead of a flat average.",
        visual: {
          kind: "stackedBars",
          formatter: "currency",
          keys: ["Mortgage", "Utilities", "Fees"],
          items: [
            {
              label: "Jan",
              segments: [
                { key: "Mortgage", value: 920 },
                { key: "Utilities", value: 410 },
                { key: "Fees", value: 210 },
              ],
            },
            {
              label: "Apr",
              segments: [
                { key: "Mortgage", value: 920 },
                { key: "Utilities", value: 240 },
                { key: "Fees", value: 90 },
              ],
            },
            {
              label: "Jul",
              segments: [
                { key: "Mortgage", value: 920 },
                { key: "Utilities", value: 180 },
                { key: "Fees", value: 260 },
              ],
            },
            {
              label: "Oct",
              segments: [
                { key: "Mortgage", value: 920 },
                { key: "Utilities", value: 260 },
                { key: "Fees", value: 140 },
              ],
            },
          ],
        },
      }

    case "room-fronting-rotation-stability":
      return {
        metricLabel: "Least rotated room",
        metricValue: "North Flat",
        insight:
          "The seeded fronting map is intentionally uneven so the fairness problem is obvious. North Flat keeps falling back to the same payer, while Garden House rotates fronting responsibility much more naturally across months.",
        visual: {
          kind: "heatmap",
          xLabels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
          yLabels: ["Alex", "Sam", "Jordan", "Riley"],
          cells: [
            { x: "Jan", y: "Alex", value: 88 },
            { x: "Feb", y: "Alex", value: 84 },
            { x: "Mar", y: "Alex", value: 79 },
            { x: "Apr", y: "Alex", value: 91 },
            { x: "May", y: "Alex", value: 74 },
            { x: "Jun", y: "Alex", value: 86 },
            { x: "Jan", y: "Sam", value: 15 },
            { x: "Feb", y: "Sam", value: 22 },
            { x: "Mar", y: "Sam", value: 26 },
            { x: "Apr", y: "Sam", value: 19 },
            { x: "May", y: "Sam", value: 28 },
            { x: "Jun", y: "Sam", value: 17 },
            { x: "Jan", y: "Jordan", value: 9 },
            { x: "Feb", y: "Jordan", value: 13 },
            { x: "Mar", y: "Jordan", value: 18 },
            { x: "Apr", y: "Jordan", value: 12 },
            { x: "May", y: "Jordan", value: 14 },
            { x: "Jun", y: "Jordan", value: 11 },
            { x: "Jan", y: "Riley", value: 6 },
            { x: "Feb", y: "Riley", value: 8 },
            { x: "Mar", y: "Riley", value: 12 },
            { x: "Apr", y: "Riley", value: 10 },
            { x: "May", y: "Riley", value: 9 },
            { x: "Jun", y: "Riley", value: 13 },
          ],
        },
      }

    case "partial-settlement-relief-curve":
      return {
        metricLabel: "Best partial relief",
        metricValue: "City Loft -420 EUR",
        insight:
          "The mock range bands are built to compare cosmetic versus meaningful cleanup. Some rooms barely improve after partial settlement, while City Loft drops enough pending pressure to change the payer experience immediately.",
        visual: {
          kind: "rangePlot",
          formatter: "currency",
          items: [
            { label: "City Loft", start: 980, end: 560, marker: 740 },
            { label: "North Flat", start: 760, end: 610, marker: 690 },
            { label: "Beach Trip", start: 1240, end: 1020, marker: 1110 },
            { label: "Workshare", start: 540, end: 300, marker: 410 },
          ],
        },
      }

    case "metric-leader-gap-momentum":
      return {
        metricLabel: "Fastest widening gap",
        metricValue: "No-spend days +14 pts",
        insight:
          "The scenario uses three very different trajectories. Wants control stays close, no-spend days starts breaking away, and weekly savings turns back toward a tight race after an early lead looked decisive.",
        visual: {
          kind: "arrowPlot",
          formatter: "number",
          items: [
            { label: "No-spend days", start: 8, end: 22 },
            { label: "Wants control", start: 11, end: 13 },
            { label: "Weekly savings", start: 19, end: 12 },
            { label: "Grocery discipline", start: 7, end: 15 },
          ],
        },
      }

    case "challenge-engagement-drop-funnel":
      return {
        metricLabel: "Largest drop stage",
        metricValue: "Mid-window to close",
        insight:
          "The funnel is intentionally shaped like a believable social-product problem: sign-up and early activity are healthy, but the closing stretch loses too many members unless the challenge still feels winnable.",
        visual: {
          kind: "funnel",
          formatter: "number",
          steps: [
            { label: "Window open", value: 42 },
            { label: "First active week", value: 36 },
            { label: "Mid-window", value: 28 },
            { label: "Closing stretch", value: 17 },
            { label: "Final result", value: 12 },
          ],
        },
      }

    case "grocery-budget-recovery-vs-store-discipline":
      return {
        metricLabel: "Fastest disciplined recovery",
        metricValue: "2.6 weeks",
        insight:
          "This seeded scatter is built around a clear visual pattern: months with tighter store discipline recover grocery budget stress faster, while scattered multi-store months keep pressure elevated well into the next cycle.",
        visual: {
          kind: "scatter",
          xLabel: "Store discipline score",
          yLabel: "Budget recovery days",
          points: [
            { label: "Jan", x: 84, y: 18 },
            { label: "Feb", x: 77, y: 21 },
            { label: "Mar", x: 61, y: 31 },
            { label: "Apr", x: 55, y: 36 },
            { label: "May", x: 72, y: 24 },
            { label: "Jun", x: 88, y: 16 },
          ],
        },
      }

    case "goal-deadline-pressure-vs-debt-collision":
      return {
        metricLabel: "Most stacked quarter",
        metricValue: "Q3",
        insight:
          "The review scenario is designed to show one clearly risky planning zone. Q3 combines the densest goal-deadline load with the worst debt-collision intensity, while Q1 and Q4 are much easier to absorb.",
        visual: {
          kind: "scatter",
          xLabel: "Goal deadline density",
          yLabel: "Debt collision intensity",
          points: [
            { label: "Q1", x: 22, y: 18 },
            { label: "Q2", x: 34, y: 29 },
            { label: "Q3", x: 61, y: 58 },
            { label: "Q4", x: 27, y: 24 },
          ],
        },
      }

    case "room-settlement-delay-vs-cushion-fragility":
      return {
        metricLabel: "Most fragile shared month",
        metricValue: "May",
        insight:
          "The mock pairing creates a strong review story: the worst settlement-delay months also show the weakest cushion quality, suggesting that social-money cleanup friction can line up with very real personal-balance fragility.",
        visual: {
          kind: "scatter",
          xLabel: "Settlement delay days",
          yLabel: "Cushion fragility score",
          points: [
            { label: "Jan", x: 3, y: 24 },
            { label: "Feb", x: 5, y: 31 },
            { label: "Mar", x: 7, y: 42 },
            { label: "Apr", x: 9, y: 57 },
            { label: "May", x: 12, y: 76 },
            { label: "Jun", x: 4, y: 28 },
          ],
        },
      }

    default:
      return null
  }
}

export function withSeededMockReviewCard(
  card: PlaygroundCardModel,
  sectionId: PlaygroundSection["id"],
  formatCurrency: (
    amount: number,
    options?: {
      minimumFractionDigits?: number
      maximumFractionDigits?: number
      showSign?: boolean
      forceFullNumber?: boolean
    }
  ) => string,
): PlaygroundCardModel {
  const scenarioOverride = buildTopReviewScenario(card, formatCurrency)

  if (scenarioOverride) {
    return {
      ...card,
      visual: scenarioOverride.visual,
      insight: scenarioOverride.insight ?? card.insight,
      metricLabel: scenarioOverride.metricLabel ?? card.metricLabel,
      metricValue: scenarioOverride.metricValue ?? card.metricValue,
      tags: [...new Set([card.tags[0] ?? card.chartType, "Scenario data", ...card.tags.slice(1)])],
    }
  }

  const seed = hashString(`${card.id}:${card.title}:${sectionId}:${card.chartType}`)
  const visual = buildMockVisual(seed, card.visual, card)
  const metric = metricFromVisual(visual, formatCurrency)

  return {
    ...card,
    visual,
    insight: card.insight,
    metricLabel: metric.metricLabel,
    metricValue: metric.metricValue,
    tags: [...new Set([card.tags[0] ?? card.chartType, "Scenario data", ...card.tags.slice(1)])],
  }
}
