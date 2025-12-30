export function getScoreColor(score: number): string {
  if (score >= 80) return "text-green-500"
  if (score >= 50) return "text-yellow-500"
  return "text-orange-500"
}

export function getTipBgColor(priority: "low" | "medium" | "high"): string {
  switch (priority) {
    case "high":
      return "bg-orange-500/10 border-orange-500/20"
    case "medium":
      return "bg-yellow-500/10 border-yellow-500/20"
    case "low":
      return "bg-green-500/10 border-green-500/20"
  }
}

export function getTipIconColor(priority: "low" | "medium" | "high"): string {
  switch (priority) {
    case "high":
      return "text-orange-500"
    case "medium":
      return "text-yellow-500"
    case "low":
      return "text-green-500"
  }
}

export function getScoreLabel(score: number): { label: string; color: string; bgColor: string } {
  if (score >= 90) return { label: "Excellent", color: "text-green-600", bgColor: "bg-green-500/10" }
  if (score >= 70) return { label: "Good", color: "text-blue-600", bgColor: "bg-blue-500/10" }
  if (score >= 50) return { label: "Needs Work", color: "text-yellow-600", bgColor: "bg-yellow-500/10" }
  return { label: "Critical", color: "text-red-600", bgColor: "bg-red-500/10" }
}

export function getCardGradient(key: string): string {
  const gradients: Record<string, string> = {
    analytics: "bg-gradient-to-br from-[#df5501]/5 via-transparent to-[#fe680e]/10",
    fridge: "bg-gradient-to-br from-[#fe9e64]/5 via-transparent to-[#feb98f]/10",
    savings: "bg-gradient-to-br from-[#893401]/5 via-transparent to-[#b44401]/10",
    trends: "bg-gradient-to-br from-[#fe8339]/5 via-transparent to-[#ffd4bb]/10",
  }
  return gradients[key] || ""
}

export function getScoreGlow(score: number): string {
  if (score >= 80) return "shadow-[0_0_20px_rgba(34,197,94,0.3)]"
  if (score >= 50) return "shadow-[0_0_20px_rgba(234,179,8,0.3)]"
  return "shadow-[0_0_20px_rgba(249,115,22,0.3)]"
}

export function getCardHoverStyles(): string {
  return "hover:scale-[1.02] hover:shadow-xl hover:border-primary/50 transition-all duration-300 ease-out"
}
