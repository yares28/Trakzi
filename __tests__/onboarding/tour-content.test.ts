import { getTourPageIdFromPathname, PAGE_TOURS } from "@/components/onboarding/tour-content"

describe("getTourPageIdFromPathname", () => {
  it("maps supported top-level app routes to tour ids", () => {
    expect(getTourPageIdFromPathname("/home")).toBe("home")
    expect(getTourPageIdFromPathname("/analytics")).toBe("analytics")
    expect(getTourPageIdFromPathname("/fridge")).toBe("fridge")
    expect(getTourPageIdFromPathname("/savings")).toBe("savings")
    expect(getTourPageIdFromPathname("/pockets")).toBe("pockets")
    expect(getTourPageIdFromPathname("/friends")).toBe("friends")
    expect(getTourPageIdFromPathname("/data-library")).toBe("data-library")
  })

  it("normalizes trailing slashes", () => {
    expect(getTourPageIdFromPathname("/analytics/")).toBe("analytics")
  })

  it("does not offer tours for nested detail routes or unknown pages", () => {
    expect(getTourPageIdFromPathname("/friends/abc")).toBeNull()
    expect(getTourPageIdFromPathname("/rooms/123")).toBeNull()
    expect(getTourPageIdFromPathname("/")).toBeNull()
    expect(getTourPageIdFromPathname(null)).toBeNull()
  })

  it("attaches walkthrough media to the matching page steps when assets exist", () => {
    expect(PAGE_TOURS.home?.steps[0]?.image).toBe("/walkthrough/HOME1.jpeg")
    expect(PAGE_TOURS.home?.steps[0]?.video).toBeUndefined()
    expect(PAGE_TOURS.home?.steps[1]?.video).toBe("/walkthrough/HOME2.mp4")
    expect(PAGE_TOURS.home?.steps[2]?.video).toBe("/walkthrough/HOME3.mp4")
    expect(PAGE_TOURS.home?.steps[3]?.video).toBe("/walkthrough/HOME4.mp4")

    expect(PAGE_TOURS.analytics?.steps[0]?.video).toBe("/walkthrough/ANALYTICS1.mp4")
    expect(PAGE_TOURS.analytics?.steps[1]?.video).toBe("/walkthrough/ANALYTICS2.mp4")

    expect(PAGE_TOURS.fridge?.steps[0]?.image).toBe("/walkthrough/FRIDGE1.jpeg")
    expect(PAGE_TOURS.fridge?.steps[0]?.video).toBeUndefined()
    expect(PAGE_TOURS.fridge?.steps[1]?.image).toBe("/walkthrough/FRIDGE2.jpeg")
    expect(PAGE_TOURS.fridge?.steps[1]?.video).toBeUndefined()
    expect(PAGE_TOURS.fridge?.steps[2]?.video).toBe("/walkthrough/FRIDGE3.mp4")
  })
})
