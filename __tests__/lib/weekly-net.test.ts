import { computeWeeklyNet, getIsoWeekStart } from "@/lib/charts/weekly-net"

const noop = (s: string) => s.toLowerCase()

describe("getIsoWeekStart", () => {
  it("returns the same Monday for a Monday input", () => {
    expect(getIsoWeekStart("2024-01-08")).toBe("2024-01-08")
  })

  it("returns the previous Monday for a Sunday input", () => {
    expect(getIsoWeekStart("2024-01-07")).toBe("2024-01-01")
  })

  it("returns the correct Monday for a mid-week Wednesday", () => {
    expect(getIsoWeekStart("2024-01-10")).toBe("2024-01-08")
  })

  it("returns the correct Monday for a Saturday", () => {
    expect(getIsoWeekStart("2024-01-13")).toBe("2024-01-08")
  })
})

describe("computeWeeklyNet", () => {
  it("returns empty array for empty transactions", () => {
    expect(computeWeeklyNet([], new Set(), noop)).toEqual([])
  })

  it("sums net per week across multiple days", () => {
    const txs = [
      { date: "2024-01-08", amount: 1000 }, // Mon week 1
      { date: "2024-01-09", amount: -200 }, // Tue week 1
      { date: "2024-01-15", amount: -300 }, // Mon week 2
    ]
    const result = computeWeeklyNet(txs, new Set(), noop)
    expect(result).toEqual([
      { date: "2024-01-08", net: 800 },
      { date: "2024-01-15", net: -300 },
    ])
  })

  it("handles negative-dominant weeks (expenses > income)", () => {
    const txs = [
      { date: "2024-01-08", amount: -500 },
      { date: "2024-01-08", amount: -300 },
      { date: "2024-01-08", amount: 100 },
    ]
    const result = computeWeeklyNet(txs, new Set(), noop)
    expect(result).toEqual([{ date: "2024-01-08", net: -700 }])
  })

  it("filters out hidden categories", () => {
    const txs = [
      { date: "2024-01-08", amount: 1000, category: "Income" },
      { date: "2024-01-08", amount: -200, category: "Rent" },
    ]
    const result = computeWeeklyNet(txs, new Set(["rent"]), noop)
    expect(result).toEqual([{ date: "2024-01-08", net: 1000 }])
  })

  it("returns results sorted ascending by week date", () => {
    const txs = [
      { date: "2024-01-22", amount: 50 }, // later week
      { date: "2024-01-08", amount: 100 }, // earlier week
    ]
    const result = computeWeeklyNet(txs, new Set(), noop)
    expect(result[0].date).toBe("2024-01-08")
    expect(result[1].date).toBe("2024-01-22")
  })

  it("rounds net to 2 decimal places", () => {
    const txs = [{ date: "2024-01-08", amount: 0.1 }, { date: "2024-01-08", amount: 0.2 }]
    const result = computeWeeklyNet(txs, new Set(), noop)
    // toBeCloseTo verifies rounding is applied without brittleness from IEEE-754 float drift
    expect(result[0].net).toBeCloseTo(0.3, 2)
  })

  it("groups Sunday transactions into previous Monday's week", () => {
    const txs = [
      { date: "2024-01-07", amount: 400 }, // Sunday → week of 2024-01-01
      { date: "2024-01-08", amount: 200 }, // Monday → new week 2024-01-08
    ]
    const result = computeWeeklyNet(txs, new Set(), noop)
    expect(result).toEqual([
      { date: "2024-01-01", net: 400 },
      { date: "2024-01-08", net: 200 },
    ])
  })
})
