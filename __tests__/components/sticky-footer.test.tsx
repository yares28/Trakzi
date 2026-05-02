import { render } from "@testing-library/react"
import { StickyFooter } from "@/components/sticky-footer"

describe("StickyFooter", () => {
  it("renders without crashing with no props (EN default)", () => {
    render(<StickyFooter />)
    expect(document.body).toBeInTheDocument()
  })

  it("accepts locale='es' without crashing", () => {
    render(<StickyFooter locale="es" />)
    expect(document.body).toBeInTheDocument()
  })
})
