import { render, screen } from "@testing-library/react"
import { FAQSection } from "@/components/faq-section"

describe("FAQSection", () => {
  it("renders default English FAQs when no items prop", () => {
    render(<FAQSection />)
    expect(screen.getByText(/Questions\? We've got/i)).toBeInTheDocument()
  })

  it("renders custom items when provided", () => {
    const items = [
      { question: "¿Qué es Trakzi?", answer: "Una app de finanzas." },
    ]
    render(
      <FAQSection
        items={items}
        title={<>Preguntas <span>frecuentes</span></>}
        badgeLabel="FAQs"
      />
    )
    expect(screen.getByText("¿Qué es Trakzi?")).toBeInTheDocument()
  })
})
