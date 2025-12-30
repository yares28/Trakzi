import { type ChartConfig } from "@/components/ui/chart"

export const pagesConfig = [
  {
    name: "Analytics",
    key: "analytics" as const,
    href: "/analytics",
    fill: "var(--chart-1)",
    description: "50/30/20 budget rule analysis",
  },
  {
    name: "Fridge",
    key: "fridge" as const,
    href: "/fridge",
    fill: "var(--chart-3)",
    description: "Nutritional balance of groceries",
  },
  {
    name: "Savings",
    key: "savings" as const,
    href: "/savings",
    fill: "var(--chart-4)",
    description: "Savings rate vs 20% target",
  },
]

export const chartConfig = {
  progress: {
    label: "Progress",
    color: "var(--primary)",
  },
} satisfies ChartConfig
