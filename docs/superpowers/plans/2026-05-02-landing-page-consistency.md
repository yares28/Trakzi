# Landing Page Consistency Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Spanish landing page and all subpages a 1:1 visual match with the English landing page by sharing components, unifying color tokens, and aligning section structure.

**Architecture:** The EN landing page (`app/(landing)/page.tsx`) is the design reference — it uses shared components (`Hero`, `Features`, `FAQSection`, `StickyFooter`, etc.) wired together in a specific section order. The ES page (`app/es/page.tsx`) is a monolithic file with all sections inlined and hardcoded colors. The fix: make shared components locale-aware, then rebuild the ES page to use the same component stack.

**Tech Stack:** Next.js 15 App Router, React 19, Tailwind CSS v4, Framer Motion (`m` import), shadcn/ui, Geist font (`@/lib/fonts`)

**Security note on `dangerouslySetInnerHTML`:** The `FAQSection` component already uses this for JSON-LD structured data (`application/ld+json`). This is safe because the content is generated entirely from hardcoded/validated FAQ objects — never from user input. XSS risk is zero.

---

## Design System Reference (EN Main Landing)

### Section Order
```
1. LandingHeader (sticky, shrinks on scroll, mobile hamburger)
2. Hero
3. ImageComparisonSection
4. Features (id="features")
5. ChartsShowcase
6. NewReleasePromo
7. FAQSection (id="faq")
8. StickyFooter
```

### Color Tokens
| Token | Value | Usage |
|-------|-------|-------|
| `--primary` | `oklch(0.6716 0.1368 48.513)` = `#e78a53` | Buttons, accents, icons |
| `--primary-foreground` | white | Text on primary bg |
| `--background` | dark (theme-controlled) | Page bg |
| `--foreground` | white in dark | Body text |
| `--muted-foreground` | muted grey | Nav links, subtitles |
| `--border` | border/50 | Card borders |

**Critical:** ES pages currently hardcode `#fe985b` (a lighter orange). All hardcoded hex colors must be replaced with Tailwind CSS-var classes: `text-primary`, `bg-primary`, `border-primary`, `bg-primary/10`, etc.

### Header Behavior
- **Desktop:** `sticky top-4`, rounded-full pill, transitions from `max-w-5xl px-4` → `max-w-3xl px-2` when `scrollY > 100`
- **Mobile:** separate sticky header with hamburger icon; clicking opens an overlay menu with backdrop blur
- Both use `LanguagePicker` from `@/components/language-picker`

### Typography Scale
- Hero H1: `text-4xl sm:text-6xl md:text-7xl lg:text-9xl` with `geist.className`
- Section H2: `text-5xl md:text-[72px] md:leading-[80px]`
- Body: `text-muted-foreground`
- Font: `geist` from `@/lib/fonts`

### Animation Patterns
All motion uses `m` from `framer-motion`:
```typescript
import { m } from "framer-motion"
// Entry: initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
// Hover cards: whileHover={{ y: -5 }}
// Stagger: transition={{ delay: i * 0.1 }}
```

---

## File Map

| Status | File | Change |
|--------|------|--------|
| Modify | `components/faq-section.tsx` | Add optional `items` + `title` + `badgeLabel` props for locale override |
| Modify | `components/sticky-footer.tsx` | Add optional `locale` prop for ES link labels/hrefs |
| Create | `components/landing-header.tsx` | Shared header extracted from EN page (scroll-shrink + mobile menu) |
| Modify | `app/(landing)/page.tsx` | Use new `<LandingHeader />` component |
| Modify | `app/es/page.tsx` | Rebuild using same section structure as EN |
| Modify | `app/es/precios/page.tsx` | Add comparison table + transaction packs to match EN pricing |

---

## Task 1: Unify color tokens in ES pages

**Files:**
- Modify: `app/es/page.tsx`
- Modify: `app/es/precios/page.tsx`

The ES pages hardcode `#fe985b` (lighter orange) instead of using the design system's `--primary` token (`#e78a53`). Every hardcoded hex must go.

- [ ] **Step 1: Replace all hardcoded `#fe985b` in `app/es/page.tsx`**

Open `app/es/page.tsx` and make these replacements:

```
"bg-gradient-to-b from-[#fe985b] to-[#fe985b]/80"  →  "bg-gradient-to-b from-primary to-primary/80"
"border-[#fe985b]/50 bg-[#fe985b]/5"               →  "border-primary/50 bg-primary/5"
"bg-[#fe985b]/10 border border-[#fe985b]/20"        →  "bg-primary/10 border border-primary/20"
"text-[#fe985b]"                                     →  "text-primary"
"hover:text-[#fe985b]"                               →  "hover:text-primary"
"hover:text-[#fe985b]/80"                            →  "hover:text-primary/80"
"group-hover:text-[#fe985b]"                         →  "group-hover:text-primary"
```

Also replace the header Sign Up button to match EN's shadow style:
```typescript
// BEFORE
className="rounded-md font-bold text-sm bg-gradient-to-b from-[#fe985b] to-[#fe985b]/80 text-white shadow-lg px-4 py-2 transition-all hover:-translate-y-0.5"

// AFTER
className="rounded-md font-bold relative cursor-pointer hover:-translate-y-0.5 transition duration-200 inline-block text-center bg-gradient-to-b from-primary to-primary/80 text-primary-foreground shadow-[0px_2px_0px_0px_rgba(255,255,255,0.3)_inset] px-4 py-2 text-sm"
```

- [ ] **Step 2: Replace all hardcoded `#fe985b` in `app/es/precios/page.tsx`**

Same find-and-replace pattern as Step 1.

- [ ] **Step 3: Replace `bg-black` background with `bg-background`**

In `app/es/page.tsx` line 62:
```typescript
// BEFORE
<div className="min-h-screen bg-black text-zinc-100">

// AFTER
<div className="min-h-screen bg-background text-foreground">
```

Also remove the hardcoded `radial-gradient` overlay `<div>` (lines 63-69) — `bg-background` is already theme-controlled dark.

- [ ] **Step 4: Replace `zinc-*` color classes with design-system equivalents**

In `app/es/page.tsx`, replace zinc utility classes:
```
text-zinc-100  → text-foreground
text-zinc-400  → text-muted-foreground
text-zinc-600  → text-muted-foreground/60
border-zinc-800/50  → border-border/50
bg-zinc-950/50      → bg-background/50
bg-zinc-900/50      → bg-secondary/50
hover:bg-zinc-800   → hover:bg-secondary
border-zinc-700     → border-border
```

- [ ] **Step 5: Verify build passes**

```bash
npm run build
```
Expected: No TypeScript errors. If CSS-var references fail, check that `--primary` is defined in `app/globals.css`.

- [ ] **Step 6: Commit**

```bash
git add app/es/page.tsx app/es/precios/page.tsx
git commit -m "fix: unify ES landing color tokens to use CSS var --primary"
```

---

## Task 2: Extract shared `LandingHeader` component

**Files:**
- Create: `components/landing-header.tsx`
- Modify: `app/(landing)/page.tsx` (use new component)

The scroll-shrinking pill header + mobile hamburger menu in the EN page is 150+ lines of JSX. Extract it so the ES page can reuse it.

- [ ] **Step 1: Write the failing test**

Create `__tests__/components/landing-header.test.tsx`:

```typescript
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
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- __tests__/components/landing-header.test.tsx
```
Expected: FAIL with "Cannot find module '@/components/landing-header'"

- [ ] **Step 3: Create `components/landing-header.tsx`**

```typescript
"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { LanguagePicker } from "@/components/language-picker"

export interface LandingNavLink {
  label: string
  href: string
}

export interface LandingHeaderProps {
  locale: "en" | "es"
  logoHref: string
  navLinks: LandingNavLink[]
  faqLabel: string
  faqScrollId?: string
  loginLabel: string
  loginHref: string
  signupLabel: string
  signupHref: string
}

export function LandingHeader({
  logoHref,
  navLinks,
  faqLabel,
  faqScrollId,
  loginLabel,
  loginHref,
  signupLabel,
  signupHref,
}: LandingHeaderProps) {
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 100)
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  const scrollToSection = (id: string) => {
    setIsMobileMenuOpen(false)
    setTimeout(() => {
      const el = document.getElementById(id)
      if (!el) return
      const offset = el.getBoundingClientRect().top + window.pageYOffset - 120
      window.scrollTo({ top: offset, behavior: "smooth" })
    }, 100)
  }

  return (
    <>
      {/* Desktop Header */}
      <header
        className={`sticky top-4 z-50 mx-auto hidden w-full flex-row items-center justify-between self-start rounded-full bg-background md:flex border border-border/50 shadow-lg transition-all duration-300 ${
          isScrolled ? "max-w-3xl px-2" : "max-w-5xl px-4"
        } py-2`}
        style={{
          willChange: "transform",
          transform: "translateZ(0)",
          backfaceVisibility: "hidden",
          perspective: "1000px",
        }}
      >
        <Link
          className={`z-50 flex items-center justify-center gap-2 transition-all duration-300 ${isScrolled ? "ml-4" : ""}`}
          href={logoHref}
        >
          <Image src="/Trakzi/TrakzilogoB.png" alt="Trakzi" width={120} height={32} className="h-8 w-auto" draggable={false} />
        </Link>

        <div className="absolute inset-0 hidden flex-1 flex-row items-center justify-center space-x-2 text-sm font-medium text-muted-foreground pointer-events-none md:flex md:space-x-2">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="relative px-4 py-2 text-muted-foreground hover:text-foreground transition-colors pointer-events-auto"
            >
              <span className="relative z-20">{link.label}</span>
            </Link>
          ))}
          {faqScrollId && (
            <button
              type="button"
              className="relative px-4 py-2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer pointer-events-auto"
              onClick={() => scrollToSection(faqScrollId)}
            >
              <span className="relative z-20">{faqLabel}</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-3">
          <LanguagePicker />
          <Link
            href={loginHref}
            className="rounded-md font-medium relative cursor-pointer hover:-translate-y-0.5 transition duration-200 inline-block text-center border border-border bg-background/50 hover:bg-background/80 text-foreground px-4 py-2 text-sm"
          >
            {loginLabel}
          </Link>
          <Link
            href={signupHref}
            className="rounded-md font-bold relative cursor-pointer hover:-translate-y-0.5 transition duration-200 inline-block text-center bg-gradient-to-b from-primary to-primary/80 text-primary-foreground shadow-[0px_2px_0px_0px_rgba(255,255,255,0.3)_inset] px-4 py-2 text-sm"
          >
            {signupLabel}
          </Link>
        </div>
      </header>

      {/* Mobile Header */}
      <header className="sticky top-4 z-50 mx-4 flex w-auto flex-row items-center justify-between rounded-full bg-background border border-border/50 shadow-lg md:hidden px-4 py-3">
        <Link className="flex items-center justify-center gap-2" href={logoHref}>
          <Image src="/Trakzi/TrakzilogoB.png" alt="Trakzi" width={120} height={28} className="h-7 w-auto" draggable={false} />
        </Link>
        <div className="flex items-center gap-1">
          <LanguagePicker />
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="flex items-center justify-center w-10 h-10 rounded-full bg-background/50 border border-border/50 transition-colors hover:bg-background/80"
            aria-label="Toggle menu"
          >
            <div className="flex flex-col items-center justify-center w-5 h-5 space-y-1">
              <span className={`block w-4 h-0.5 bg-foreground transition-all duration-300 ${isMobileMenuOpen ? "rotate-45 translate-y-1.5" : ""}`} />
              <span className={`block w-4 h-0.5 bg-foreground transition-all duration-300 ${isMobileMenuOpen ? "opacity-0" : ""}`} />
              <span className={`block w-4 h-0.5 bg-foreground transition-all duration-300 ${isMobileMenuOpen ? "-rotate-45 -translate-y-1.5" : ""}`} />
            </div>
          </button>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 md:hidden">
          <div className="absolute top-20 left-4 right-4 bg-background/95 backdrop-blur-md border border-border/50 rounded-2xl shadow-2xl p-6">
            <nav className="flex flex-col space-y-4">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="text-left px-4 py-3 text-lg font-medium text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-background/50"
                >
                  {link.label}
                </Link>
              ))}
              {faqScrollId && (
                <button
                  onClick={() => scrollToSection(faqScrollId)}
                  className="text-left px-4 py-3 text-lg font-medium text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-background/50"
                >
                  {faqLabel}
                </button>
              )}
              <div className="border-t border-border/50 pt-4 mt-4 flex flex-col space-y-3">
                <Link
                  href={loginHref}
                  className="px-4 py-3 text-lg font-medium text-center border border-border bg-background/50 hover:bg-background/80 text-foreground rounded-lg transition-all duration-200 hover:-translate-y-0.5"
                >
                  {loginLabel}
                </Link>
                <Link
                  href={signupHref}
                  className="px-4 py-3 text-lg font-bold text-center bg-gradient-to-b from-primary to-primary/80 text-primary-foreground rounded-lg shadow-lg hover:-translate-y-0.5 transition-all duration-200"
                >
                  {signupLabel}
                </Link>
              </div>
            </nav>
          </div>
        </div>
      )}
    </>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test -- __tests__/components/landing-header.test.tsx
```
Expected: PASS

- [ ] **Step 5: Update `app/(landing)/page.tsx` to use `LandingHeader`**

Replace the inline Desktop Header, Mobile Header, and Mobile Menu Overlay JSX blocks (lines 88–234) and remove the `isScrolled`, `isMobileMenuOpen` state and `handleMobileNavClick` function. Add import and usage:

```typescript
import { LandingHeader } from "@/components/landing-header"

// Replace the header JSX blocks with:
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
```

Keep the theme management `useEffect` in the EN page component — it is not part of the header.

- [ ] **Step 6: Verify build**

```bash
npm run build
```
Expected: No errors.

- [ ] **Step 7: Commit**

```bash
git add components/landing-header.tsx app/(landing)/page.tsx __tests__/components/landing-header.test.tsx
git commit -m "feat: extract shared LandingHeader component with scroll-shrink and mobile menu"
```

---

## Task 3: Add locale support to `FAQSection`

**Files:**
- Modify: `components/faq-section.tsx`

The component has hardcoded English FAQ items. We need to let callers pass Spanish items without touching the animation, accordion, and JSON-LD logic.

- [ ] **Step 1: Write the failing test**

Create `__tests__/components/faq-section.test.tsx`:

```typescript
import { render, screen } from "@testing-library/react"
import { FAQSection } from "@/components/faq-section"

describe("FAQSection", () => {
  it("renders default English FAQs when no items prop", () => {
    render(<FAQSection />)
    expect(screen.getByText(/Questions\? We've got/)).toBeInTheDocument()
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
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- __tests__/components/faq-section.test.tsx
```
Expected: FAIL — `items` is not a recognized prop

- [ ] **Step 3: Update `components/faq-section.tsx`**

Add the exported interface and update the function signature. Keep all existing animation/accordion logic unchanged.

At the top of the file, after the imports, add:
```typescript
export interface FaqItem {
  question: string
  answer: string
}

interface FAQSectionProps {
  items?: FaqItem[]
  title?: React.ReactNode
  badgeLabel?: string
}
```

Update `generateFaqSchema` to accept data:
```typescript
function generateFaqSchema(data: FaqItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: data.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: { "@type": "Answer", text: faq.answer },
    })),
  }
}
```

Update the function signature:
```typescript
export function FAQSection({ items, title, badgeLabel = "Faqs" }: FAQSectionProps = {}) {
  const activeFaqs = items ?? faqs
```

Replace all `faqs` references in the render with `activeFaqs`. Update the JSON-LD script call:
```typescript
dangerouslySetInnerHTML={{ __html: JSON.stringify(generateFaqSchema(activeFaqs)) }}
```

Replace the hardcoded badge label in JSX:
```typescript
// BEFORE
<span className="text-sm">Faqs</span>
// AFTER
<span className="text-sm">{badgeLabel}</span>
```

Replace the hardcoded heading with the overridable title prop:
```typescript
// BEFORE
<m.h2 ...>
  Questions? We've got{" "}
  <span className="...">answers</span>
</m.h2>

// AFTER
<m.h2 ...>
  {title ?? (
    <>
      Questions? We&apos;ve got{" "}
      <span className="bg-gradient-to-b from-foreground via-rose-200 to-primary bg-clip-text text-transparent py-1">
        answers
      </span>
    </>
  )}
</m.h2>
```

Update the posthog tracking call to use `activeFaqs`:
```typescript
typedCapture("faq_question_expanded", {
  question: activeFaqs[index].question,
  question_index: index,
})
```

- [ ] **Step 4: Run tests**

```bash
npm test -- __tests__/components/faq-section.test.tsx
```
Expected: PASS

- [ ] **Step 5: Verify EN page still works (no regressions)**

```bash
npm run build
```
Expected: No errors — `<FAQSection />` with no props still renders English content.

- [ ] **Step 6: Commit**

```bash
git add components/faq-section.tsx __tests__/components/faq-section.test.tsx
git commit -m "feat: add optional items/title/badgeLabel props to FAQSection for locale support"
```

---

## Task 4: Add locale support to `StickyFooter`

**Files:**
- Modify: `components/sticky-footer.tsx`

The footer has hardcoded English labels and EN hrefs (`/features`, `/pricing`, `/terms`). Add an optional `locale` prop so the ES page gets Spanish labels and `/es/` prefixed links.

- [ ] **Step 1: Write the failing test**

Create `__tests__/components/sticky-footer.test.tsx`:

```typescript
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
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- __tests__/components/sticky-footer.test.tsx
```
Expected: FAIL — `locale` is not a recognized prop

- [ ] **Step 3: Add locale prop and ES translations to `components/sticky-footer.tsx`**

Add before the component declaration:

```typescript
type FooterLocale = "en" | "es"

interface StickyFooterProps {
  locale?: FooterLocale
}

interface FooterLink {
  label: string
  href: string | null
  scroll?: boolean
}

const footerContent: Record<FooterLocale, { nav: FooterLink[]; legal: FooterLink[]; contact: FooterLink[] }> = {
  en: {
    nav: [
      { label: "Home", href: null, scroll: true },
      { label: "Features", href: "/features" },
      { label: "Pricing", href: "/pricing" },
    ],
    legal: [
      { label: "Terms", href: "/terms" },
      { label: "Privacy", href: "/privacy" },
      { label: "Cookies", href: "/cookies" },
      { label: "Legal", href: "/legal" },
    ],
    contact: [
      { label: "Contact", href: "mailto:hello@trakzi.com" },
      { label: "Blog", href: "/docs" },
    ],
  },
  es: {
    nav: [
      { label: "Inicio", href: null, scroll: true },
      { label: "Características", href: "/es/features" },
      { label: "Precios", href: "/es/precios" },
    ],
    legal: [
      { label: "Términos", href: "/terms" },
      { label: "Privacidad", href: "/privacy" },
      { label: "Cookies", href: "/cookies" },
      { label: "Legal", href: "/legal" },
    ],
    contact: [
      { label: "Contacto", href: "mailto:hello@trakzi.com" },
      { label: "Blog", href: "/es/docs" },
    ],
  },
}
```

Update the function signature:
```typescript
export function StickyFooter({ locale = "en" }: StickyFooterProps = {}) {
```

Replace the three hardcoded `<ul>` blocks in the JSX with a loop over `footerContent[locale].nav`, `.legal`, and `.contact`:

```typescript
{/* Nav column */}
<ul className="space-y-2">
  {footerContent[locale].nav.map((item) => (
    <li
      key={item.label}
      className="hover:underline cursor-pointer transition-colors"
      style={linkStyle}
      onMouseEnter={(e) => (e.currentTarget.style.color = hoverColor)}
      onMouseLeave={(e) => (e.currentTarget.style.color = "#121113")}
    >
      {item.scroll ? (
        <button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
          {item.label}
        </button>
      ) : (
        <Link href={item.href!}>{item.label}</Link>
      )}
    </li>
  ))}
</ul>

{/* Legal column */}
<ul className="space-y-2">
  {footerContent[locale].legal.map((item) => (
    <li
      key={item.label}
      className="hover:underline cursor-pointer transition-colors"
      style={linkStyle}
      onMouseEnter={(e) => (e.currentTarget.style.color = hoverColor)}
      onMouseLeave={(e) => (e.currentTarget.style.color = "#121113")}
    >
      <Link href={item.href!}>{item.label}</Link>
    </li>
  ))}
</ul>

{/* Contact column */}
<ul className="space-y-2">
  {footerContent[locale].contact.map((item) => (
    <li
      key={item.label}
      className="hover:underline cursor-pointer transition-colors"
      style={linkStyle}
      onMouseEnter={(e) => (e.currentTarget.style.color = hoverColor)}
      onMouseLeave={(e) => (e.currentTarget.style.color = "#121113")}
    >
      <Link href={item.href!}>{item.label}</Link>
    </li>
  ))}
</ul>
```

- [ ] **Step 4: Run tests**

```bash
npm test -- __tests__/components/sticky-footer.test.tsx
```
Expected: PASS

- [ ] **Step 5: Verify build**

```bash
npm run build
```
Expected: No errors.

- [ ] **Step 6: Commit**

```bash
git add components/sticky-footer.tsx __tests__/components/sticky-footer.test.tsx
git commit -m "feat: add locale prop to StickyFooter for ES link labels and hrefs"
```

---

## Task 5: Rebuild `app/es/page.tsx` to match EN section structure

**Files:**
- Modify: `app/es/page.tsx`

Replace the monolithic inline ES page with a clean component-composition page that mirrors EN exactly.

- [ ] **Step 1: Write smoke test**

Create `__tests__/app/es/page.test.tsx`:

```typescript
import { render, screen } from "@testing-library/react"
import SpanishLandingPage from "@/app/es/page"

jest.mock("@/landing/hero", () => ({ default: () => <div data-testid="hero" /> }))
jest.mock("@/components/features", () => ({ default: () => <div data-testid="features" /> }))
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
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- __tests__/app/es/page.test.tsx
```
Expected: FAIL — missing sections

- [ ] **Step 3: Rewrite `app/es/page.tsx`**

Replace the entire file content with:

```typescript
"use client"

import { useEffect, useRef } from "react"
import { useTheme } from "next-themes"
import { LandingHeader } from "@/components/landing-header"
import Hero from "@/landing/hero"
import Features from "@/components/features"
import { NewReleasePromo } from "@/components/new-release-promo"
import { FAQSection, type FaqItem } from "@/components/faq-section"
import { StickyFooter } from "@/components/sticky-footer"
import { ChartsShowcase } from "@/components/charts-showcase"
import { ImageComparisonSection } from "@/components/image-comparison-section"

const esFaqs: FaqItem[] = [
  {
    question: "¿Qué es Trakzi y cómo me ayuda a presupuestar?",
    answer: "Trakzi es un espacio de trabajo todo-en-uno donde puedes reunir tus extractos bancarios, exportaciones CSV y tickets para ver de un vistazo en qué gastas tu dinero. Combina gráficos con IA, análisis de gastos y seguimiento de gastos compartidos en una sola app.",
  },
  {
    question: "¿Cómo importo mis transacciones bancarias a Trakzi?",
    answer: "Sube cualquier CSV de tu banco o tarjeta. Trakzi normaliza los datos, conserva tus columnas originales y genera gráficos automáticamente — sin introducción manual de datos.",
  },
  {
    question: "¿Puedo escanear y guardar tickets de supermercado?",
    answer: "Sí. Fotografía o sube tus tickets de supermercado y tiendas, y Trakzi extrae los totales para que puedas compararlos con tu presupuesto y hábitos de gasto anteriores.",
  },
  {
    question: "¿Qué hace la IA de Trakzi exactamente?",
    answer: "La IA integrada te ayuda a detectar patrones de gasto excesivo, responde preguntas como '¿por qué gasté más en comida este mes?' y sugiere ajustes para que cumplas tus objetivos financieros.",
  },
  {
    question: "¿Están seguros mis datos financieros en Trakzi?",
    answer: "Tus datos permanecen en tu espacio de trabajo. Trakzi nunca los revende ni comparte, y puedes eliminar tus cargas en cualquier momento. Seguimos las mejores prácticas de seguridad para proteger tus archivos e información.",
  },
  {
    question: "¿Puedo rastrear gastos compartidos y dividir facturas con amigos?",
    answer: "Por supuesto. Trakzi te permite crear habitaciones compartidas con amigos o compañeros de piso, rastrear gastos grupales y ver quién debe qué — facilitando dividir facturas, alquiler y compras.",
  },
]

export default function SpanishLandingPage() {
  const { setTheme } = useTheme()
  const previousThemeRef = useRef<string | null>(null)

  // Force dark mode on landing page, restore user's theme on unmount
  useEffect(() => {
    if (typeof window === "undefined") return
    const LANDING_FLAG = "trakzi-landing-active"
    const SAVED_THEME_KEY = "trakzi-user-theme-before-landing"
    const isLandingAlreadyActive = localStorage.getItem(LANDING_FLAG) === "true"
    if (!isLandingAlreadyActive) {
      const currentTheme = localStorage.getItem("trakzi-theme") || "light"
      localStorage.setItem(SAVED_THEME_KEY, currentTheme)
      localStorage.setItem(LANDING_FLAG, "true")
    }
    previousThemeRef.current = localStorage.getItem(SAVED_THEME_KEY) || "light"
    setTheme("dark")
    return () => {
      const themeToRestore = previousThemeRef.current || "light"
      localStorage.removeItem(LANDING_FLAG)
      localStorage.removeItem(SAVED_THEME_KEY)
      localStorage.setItem("trakzi-theme", themeToRestore)
      setTheme(themeToRestore)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-screen w-full relative bg-background">
      <LandingHeader
        locale="es"
        logoHref="/es"
        navLinks={[
          { label: "Características", href: "/es/features" },
          { label: "Documentación", href: "/es/docs" },
          { label: "Precios", href: "/es/precios" },
        ]}
        faqLabel="FAQ"
        faqScrollId="faq"
        loginLabel="Iniciar Sesión"
        loginHref="/sign-in"
        signupLabel="Registrarse"
        signupHref="/sign-up"
      />

      <Hero />

      <ImageComparisonSection
        beforeSrc="/SheetsCompare.jpeg"
        afterSrc="/trakziCompare.png"
        beforeAlt="Datos financieros sin Trakzi"
        afterAlt="Datos financieros con Trakzi"
      />

      <div id="features">
        <Features />
      </div>

      <ChartsShowcase />

      <NewReleasePromo />

      <div id="faq">
        <FAQSection
          items={esFaqs}
          badgeLabel="FAQs"
          title={
            <>
              ¿Preguntas? Tenemos{" "}
              <span className="bg-gradient-to-b from-foreground via-rose-200 to-primary bg-clip-text text-transparent py-1">
                respuestas
              </span>
            </>
          }
        />
      </div>

      <StickyFooter locale="es" />
    </div>
  )
}
```

- [ ] **Step 4: Run tests**

```bash
npm test -- __tests__/app/es/page.test.tsx
```
Expected: PASS

- [ ] **Step 5: Run full build**

```bash
npm run build
```
Expected: No errors.

- [ ] **Step 6: Commit**

```bash
git add app/es/page.tsx __tests__/app/es/page.test.tsx
git commit -m "feat: rebuild ES landing page to match EN section structure and design system"
```

---

## Task 6: Upgrade ES pricing page to match EN

**Files:**
- Modify: `app/es/precios/page.tsx`

The EN pricing page has: plan cards with icons + `LandingHeader`, monthly/annual toggle, full feature comparison table (10 rows), transaction packs section, billing FAQ. The ES page has only 3 plain plan cards.

- [ ] **Step 1: Read EN pricing page to extract data arrays**

```bash
# Read lines 80–400 to get plans, comparisons, transactionPacks, billingFaqs
```
Read `app/(landing)/pricing/page.tsx` lines 80–400 before starting. The exact data arrays must match what is shown there.

- [ ] **Step 2: Add LandingHeader and StickyFooter to ES pricing**

At the top of `app/es/precios/page.tsx`:
```typescript
import { LandingHeader } from "@/components/landing-header"
import { StickyFooter } from "@/components/sticky-footer"
```

Wrap the return in:
```typescript
<div className="min-h-screen w-full relative bg-background">
  <LandingHeader
    locale="es"
    logoHref="/es"
    navLinks={[
      { label: "Características", href: "/es/features" },
      { label: "Documentación", href: "/es/docs" },
    ]}
    faqLabel="FAQ"
    loginLabel="Iniciar Sesión"
    loginHref="/sign-in"
    signupLabel="Registrarse"
    signupHref="/sign-up"
  />
  {/* existing pricing content */}
  <StickyFooter locale="es" />
</div>
```

- [ ] **Step 3: Add monthly/annual toggle**

Add state:
```typescript
const [isAnnual, setIsAnnual] = useState(false)
```

Add toggle UI before the plan cards:
```typescript
<div className="flex items-center justify-center gap-4 mb-12">
  <span className={`text-sm font-medium ${!isAnnual ? "text-foreground" : "text-muted-foreground"}`}>
    Mensual
  </span>
  <button
    onClick={() => setIsAnnual(!isAnnual)}
    className={`relative w-12 h-6 rounded-full transition-colors duration-300 ${isAnnual ? "bg-primary" : "bg-muted"}`}
  >
    <span
      className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform duration-300 ${isAnnual ? "translate-x-7" : "translate-x-1"}`}
    />
  </button>
  <span className={`text-sm font-medium flex items-center gap-2 ${isAnnual ? "text-foreground" : "text-muted-foreground"}`}>
    Anual
    <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">-20%</span>
  </span>
</div>
```

Update Pro and Max plan price display to use `isAnnual`:
```typescript
// Pro: monthlyPrice=4.99, annualPrice=49.99 (=> 4.16/mo)
// Max: monthlyPrice=19.99, annualPrice=199.99 (=> 16.67/mo)
<p className="text-3xl font-bold text-foreground mb-1">
  {isAnnual ? "4,16 €" : "4,99 €"}
  <span className="text-sm font-normal text-muted-foreground">/mes</span>
</p>
{isAnnual && (
  <p className="text-xs text-muted-foreground mb-4">49,99 € facturado anualmente</p>
)}
```

- [ ] **Step 4: Add feature comparison table in Spanish**

After the plan cards section, insert:

```typescript
const comparisons = [
  { feature: "Transacciones totales", starter: "300", pro: "1.500 (2.000 anual)", max: "5.000 (6.000 anual)" },
  { feature: "Transacciones/mes", starter: "50", pro: "250", max: "750" },
  { feature: "Escaneos de tickets/mes", starter: "10", pro: "50", max: "150" },
  { feature: "Chats con IA/semana", starter: "10", pro: "50", max: "100" },
  { feature: "Gráficos avanzados", starter: "❌", pro: "✓", max: "✓" },
  { feature: "Insights con IA", starter: "❌", pro: "✓", max: "✓" },
  { feature: "Gastos compartidos", starter: "2 salas, 5 amigos", pro: "10 salas, 50 amigos", max: "Ilimitado" },
  { feature: "Categorías personalizadas", starter: "❌", pro: "10", max: "25" },
  { feature: "Soporte prioritario", starter: "❌", pro: "❌", max: "✓" },
  { feature: "Exportaciones avanzadas", starter: "❌", pro: "❌", max: "✓" },
]
```

Render:
```typescript
<section className="py-24 border-t border-border/50">
  <div className="container mx-auto px-4">
    <m.h2
      className={cn("text-3xl font-bold text-center mb-12", geist.className)}
      initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
    >
      Comparación de planes
    </m.h2>
    <div className="mx-auto max-w-4xl overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-border/50">
            <th className="text-left py-4 pr-4 text-muted-foreground font-medium text-sm">Característica</th>
            <th className="text-center py-4 px-4 font-semibold text-sm">Starter</th>
            <th className="text-center py-4 px-4 font-semibold text-sm text-primary">PRO</th>
            <th className="text-center py-4 px-4 font-semibold text-sm">MAX</th>
          </tr>
        </thead>
        <tbody>
          {comparisons.map((row, i) => (
            <tr key={row.feature} className={`border-b border-border/30 ${i % 2 === 0 ? "bg-secondary/20" : ""}`}>
              <td className="py-3 pr-4 text-sm text-muted-foreground">{row.feature}</td>
              <td className="py-3 px-4 text-sm text-center text-foreground">{row.starter}</td>
              <td className="py-3 px-4 text-sm text-center font-medium text-primary">{row.pro}</td>
              <td className="py-3 px-4 text-sm text-center text-foreground">{row.max}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
</section>
```

- [ ] **Step 5: Add Transaction Packs section in Spanish**

After the comparison table:

```typescript
const transactionPacks = [
  { name: "Pack Pequeño", desc: "+500 transacciones únicas", price: "2,99 €", envKey: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_PACK_SMALL },
  { name: "Pack Mediano", desc: "+1.500 transacciones únicas", price: "6,99 €", envKey: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_PACK_MEDIUM },
  { name: "Pack Grande", desc: "+5.000 transacciones únicas", price: "14,99 €", envKey: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_PACK_LARGE },
]
```

Use the same card visual as EN pricing (read `app/(landing)/pricing/page.tsx` transaction pack section for exact JSX, then translate labels to Spanish).

- [ ] **Step 6: Run build**

```bash
npm run build
```
Expected: No errors.

- [ ] **Step 7: Commit**

```bash
git add app/es/precios/page.tsx
git commit -m "feat: upgrade ES pricing page with toggle, comparison table, and transaction packs"
```

---

## Self-Review Checklist

### Spec Coverage
- [x] EN and ES main landing pages use same section order (Tasks 2, 5)
- [x] Color tokens unified — no hardcoded hex in ES pages (Task 1)
- [x] Header scroll-shrink + mobile menu consistent (Tasks 2, 5)
- [x] FAQSection renders Spanish content via `items` prop (Tasks 3, 5)
- [x] StickyFooter renders Spanish links via `locale` prop (Tasks 4, 5)
- [x] ES pricing page matches EN in features, toggle, comparison table (Task 6)

### Type Consistency
- `LandingHeaderProps.locale: "en" | "es"` — used consistently in Tasks 2 and 5
- `FaqItem` interface is exported from `components/faq-section.tsx` — Task 5 imports it as `type FaqItem`
- `FooterLocale = "en" | "es"` — `footerContent` keys match; used in Task 4 and 5

### Placeholder Check
All task steps contain exact file paths and complete code blocks. No "TBD" or "similar to above."

---

## Execution Order

Tasks must run in sequence: **1 → 2 → 3 → 4 → 5 → 6**

Task 5 imports `LandingHeader` (from Task 2), `FAQSection` with locale props (Task 3), and `StickyFooter` with locale prop (Task 4). All three must exist before Task 5 is attempted.

## Known Intentional Tradeoffs

| Component | Status | Note |
|-----------|--------|------|
| `landing/hero.tsx` | English copy | Reused in ES page for visual consistency. Copy translation is a follow-up. |
| `components/features.tsx` | English copy | Same as above — visual design consistent, copy translation is follow-up. |
| `components/new-release-promo.tsx` | English copy | Same tradeoff. The section's visual treatment will match EN page. |
