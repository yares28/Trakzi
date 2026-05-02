import { render, screen } from "@testing-library/react"
import SpanishLandingPage from "@/app/es/page"

jest.mock("@/landing/hero", () => ({ __esModule: true, default: () => <div data-testid="hero" /> }))
jest.mock("@/components/features", () => ({ __esModule: true, default: () => <div data-testid="features" /> }))
jest.mock("@/components/faq-section", () => ({
  FAQSection: ({ items }: { items?: Array<{ question: string; answer: string }> }) => (
    <div data-testid="faq">{items?.[0]?.question}</div>
  ),
}))
jest.mock("@/components/sticky-footer", () => ({
  StickyFooter: () => <div data-testid="sticky-footer" />,
}))
jest.mock("@/components/charts-showcase", () => ({
  ChartsShowcase: () => <div data-testid="charts-showcase" />,
}))
jest.mock("@/components/image-comparison-section", () => ({
  ImageComparisonSection: () => <div data-testid="image-comparison" />,
}))
jest.mock("@/components/new-release-promo", () => ({
  NewReleasePromo: () => <div data-testid="new-release-promo" />,
}))
jest.mock("@/components/landing-header", () => ({
  LandingHeader: () => <div data-testid="landing-header" />,
}))

describe("SpanishLandingPage", () => {
  it("renders all 8 main sections", () => {
    render(<SpanishLandingPage />)
    expect(screen.getByTestId("landing-header")).toBeInTheDocument()
    expect(screen.getByTestId("image-comparison")).toBeInTheDocument()
    expect(screen.getByTestId("features")).toBeInTheDocument()
    expect(screen.getByTestId("charts-showcase")).toBeInTheDocument()
    expect(screen.getByTestId("new-release-promo")).toBeInTheDocument()
    expect(screen.getByTestId("faq")).toBeInTheDocument()
    expect(screen.getByTestId("sticky-footer")).toBeInTheDocument()
  })

  it("passes Spanish FAQ items to FAQSection", () => {
    render(<SpanishLandingPage />)
    expect(screen.getByText("¿Qué es Trakzi y cómo me ayuda a presupuestar?")).toBeInTheDocument()
  })
})
