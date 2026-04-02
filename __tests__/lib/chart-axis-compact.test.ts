import { formatCompactAxisMagnitude } from "@/lib/chart-axis-compact"

describe("formatCompactAxisMagnitude", () => {
  const id = (v: number) => String(v)

  it("uses one decimal for non-whole thousands so ticks differ", () => {
    expect(formatCompactAxisMagnitude(1000, { belowThreshold: id })).toBe("1K")
    expect(formatCompactAxisMagnitude(1100, { belowThreshold: id })).toBe("1.1K")
    expect(formatCompactAxisMagnitude(2500, { belowThreshold: id })).toBe("2.5K")
  })

  it("delegates sub-1000 to belowThreshold", () => {
    expect(formatCompactAxisMagnitude(42, { belowThreshold: id })).toBe("42")
  })

  it("formats millions with distinct fractional labels when needed", () => {
    expect(formatCompactAxisMagnitude(1_000_000, { belowThreshold: id })).toBe("1M")
    expect(formatCompactAxisMagnitude(1_100_000, { belowThreshold: id })).toBe("1.1M")
  })
})
