"use client"
import { useEffect, useRef } from "react"
import { useTheme } from "next-themes"
import Hero from "@/landing/hero"
import Features from "@/components/features"
import { NewReleasePromo } from "@/components/new-release-promo"
import { FAQSection } from "@/components/faq-section"
import { StickyFooter } from "@/components/sticky-footer"
import { ChartsShowcase } from "@/components/charts-showcase"
import { ImageComparisonSection } from "@/components/image-comparison-section"
import { LandingHeader } from "@/components/landing-header"

export default function Home() {
  const { setTheme } = useTheme()
  const previousThemeRef = useRef<string | null>(null)

  // Force dark mode on landing page, restore user's theme on unmount.
  // Stored in a ref (not localStorage) to avoid race conditions when navigating
  // between EN/ES landing pages or doing a quick back-navigation.
  useEffect(() => {
    const saved = localStorage.getItem('trakzi-theme') || 'light'
    previousThemeRef.current = saved
    setTheme("dark")
    return () => {
      setTheme(previousThemeRef.current || 'light')
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-screen w-full relative bg-background">

      <LandingHeader
        locale="en"
        logoHref="/"
        navLinks={[
          { label: "Features", href: "/features" },
          { label: "Docs", href: "/docs" },
          { label: "Pricing", href: "/pricing" },
        ]}
        faqLabel="FAQ"
        faqScrollId="faq"
        loginLabel="Log In"
        loginHref="/sign-in"
        signupLabel="Sign Up"
        signupHref="/sign-up"
      />

      {/* Hero Section */}
      <Hero />

      {/* Image Comparison Section */}
      <ImageComparisonSection
        beforeSrc="/SheetsCompare.jpeg"
        afterSrc="/trakziCompare.png"
        beforeAlt="Financial data without Trakzi"
        afterAlt="Financial data with Trakzi"
      />

      {/* Features Section */}
      <div id="features">
        <Features />
      </div>

      {/* Charts Showcase Section */}
      <ChartsShowcase />

      {/* Pricing - links to /pricing */}

      <NewReleasePromo />

      {/* FAQ Section */}
      <div id="faq">
        <FAQSection />
      </div>

      {/* Sticky Footer */}
      <StickyFooter />
    </div>
  )
}
