import { render, screen, fireEvent } from "@testing-library/react"
import { LandingHeader } from "@/components/landing-header"

const enConfig = {
  locale: "en" as const,
  logoHref: "/",
  navLinks: [
    { label: "Features", href: "/features" },
    { label: "Pricing", href: "/pricing" },
  ],
  loginLabel: "Log In",
  loginHref: "/sign-in",
  signupLabel: "Sign Up",
  signupHref: "/sign-up",
  faqScrollId: "faq",
  faqLabel: "FAQ",
}

describe("LandingHeader", () => {
  it("renders logo and nav links", () => {
    render(<LandingHeader {...enConfig} />)
    expect(screen.getByAltText("Trakzi")).toBeInTheDocument()
    expect(screen.getByText("Features")).toBeInTheDocument()
    expect(screen.getByText("Pricing")).toBeInTheDocument()
  })

  it("opens mobile menu on hamburger click", () => {
    render(<LandingHeader {...enConfig} />)
    const hamburger = screen.getByLabelText("Toggle menu")
    fireEvent.click(hamburger)
    expect(screen.getByText("Log In")).toBeInTheDocument()
  })
})
