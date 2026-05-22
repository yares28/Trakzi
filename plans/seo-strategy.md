# Trakzi SEO Strategy — Spain & Global English

> **Goal:** Rank top of Google for budgeting/expense tracker keywords in English (worldwide) and Spanish (Spain).
> **Last updated:** 2026-03-20

---

## Table of Contents

1. [Current State Audit](#1-current-state-audit)
2. [English Keyword Strategy (Global)](#2-english-keyword-strategy-global)
3. [Spanish Keyword Strategy (Spain)](#3-spanish-keyword-strategy-spain)
4. [Technical SEO Fixes](#4-technical-seo-fixes)
5. [Internationalization (i18n)](#5-internationalization-i18n)
6. [Content Strategy](#6-content-strategy)
7. [Competitive Advantages](#7-competitive-advantages)
8. [YMYL / E-E-A-T](#8-ymyl--e-e-at)
9. [Implementation Phases](#9-implementation-phases)
10. [Testing Checklist](#10-testing-checklist)

---

## 1. Current State Audit

### What's Working
- OG/Twitter meta tags configured in root layout with image
- FAQ JSON-LD schema on landing page (6 items)
- robots.txt blocks authenticated routes + AI bots
- `llms.txt` for AI/LLM discovery
- PWA manifest configured
- `metadataBase` set to `https://trakzi.com`
- 15 relevant keywords in root metadata
- Security headers (CSP, HSTS, X-Frame-Options)

### Critical Gaps
| Gap | Impact | Details |
|---|---|---|
| No per-page metadata on ANY page | HIGH | Only root `layout.tsx` has metadata. Legal pages, landing page — nothing. |
| Sitemap only has 3 URLs | HIGH | Missing `/terms`, `/privacy`, `/cookies`, `/legal` |
| No `WebSite` / `Organization` JSON-LD | MEDIUM | No sitelinks search box, no knowledge panel |
| No `SoftwareApplication` JSON-LD | MEDIUM | No rich results for app listings |
| Landing page is `"use client"` | MEDIUM | Cannot export metadata from client components |
| Legal pages are client components | MEDIUM | Content not server-rendered for crawlers |
| No i18n / hreflang tags | MEDIUM | Cannot rank in Spain for Spanish queries |
| No blog/content pages | HIGH | No pages targeting informational keywords |
| No Google Search Console verification | LOW | Missing verification file |

---

## 2. English Keyword Strategy (Global)

### Tier 1 — High-Intent Transactional Keywords

| Keyword | Est. Monthly Volume | Difficulty | Target Page | Placement |
|---|---|---|---|---|
| budgeting app | 40K+ | High | Landing H1, title tag | Title, H1, meta desc |
| expense tracker | 33K+ | High | Landing feature section | H2, body copy |
| personal finance app | 22K+ | Medium | Landing subtitle | H2, meta desc |
| receipt scanner app | 12K+ | Medium | `/receipt-scanner` (new) | Page title, H1 |
| split bills app | 8K+ | Medium | `/split-expenses` (new) | Page title, H1 |
| grocery budget tracker | 3K+ | Low | `/grocery-tracker` (new) | Page title, H1 |
| savings tracker app | 4K+ | Medium | `/savings` feature page | Page title, H1 |
| CSV bank import finance | 1K+ | Low | `/csv-import` (new) | Page title, H1 |
| free budgeting app | 15K+ | Medium | Landing pricing section | H2, body copy |
| money management app | 6K+ | Medium | Landing features | H2, body copy |

### Tier 2 — Informational Keywords (Blog Content)

| Keyword Cluster | Est. Volume | Content Type | URL |
|---|---|---|---|
| how to track expenses | 5K+ | Blog post | `/blog/how-to-track-expenses` |
| how to budget your money | 12K+ | Pillar post | `/blog/how-to-budget-your-money` |
| best way to split bills with roommates | 3K+ | Blog post | `/blog/split-bills-roommates` |
| how to read bank statement CSV | 500+ | Blog post (unique) | `/blog/read-bank-statement-csv` |
| AI spending analysis | 1K+ | Blog post | `/blog/ai-spending-analysis` |
| grocery budget tips | 4K+ | Blog post | `/blog/grocery-budget-tips` |
| expense tracking for freelancers | 2K+ | Blog post | `/blog/expense-tracking-freelancers` |
| money management tips 2026 | 6K+ | Blog post | `/blog/money-management-tips-2026` |
| envelope budgeting method | 2K+ | Blog post | `/blog/envelope-budgeting-method` |
| zero-based budgeting explained | 1.5K+ | Blog post | `/blog/zero-based-budgeting` |

### Tier 3 — Comparison Pages

| Keyword | Target URL | Strategy |
|---|---|---|
| Trakzi vs YNAB | `/compare/trakzi-vs-ynab` | Feature comparison table |
| Trakzi vs Splitwise | `/compare/trakzi-vs-splitwise` | Feature comparison table |
| Trakzi vs Monarch Money | `/compare/trakzi-vs-monarch` | Feature comparison table |
| free budgeting app no bank connection | `/features/no-bank-connection` | Privacy-first angle |
| budgeting app for roommates | `/features/roommate-budgeting` | Shared expenses angle |

---

## 3. Spanish Keyword Strategy (Spain)

### Tier 1 — High-Intent Transactional Keywords

| Keyword (Spanish) | English Translation | Target URL | Placement |
|---|---|---|---|
| app para controlar gastos | expense control app | `/es/` landing H1 | Title, H1 |
| app de presupuesto personal | personal budget app | `/es/` subtitle | H2, meta desc |
| escáner de tickets supermercado | supermarket receipt scanner | `/es/escaner-tickets` | Page title, H1 |
| app para dividir gastos con amigos | split expenses with friends | `/es/dividir-gastos` | Page title, H1 |
| app finanzas personales España | personal finance app Spain | `/es/` Spain section | H2, body copy |
| control gastos autónomos | freelancer expense tracking | `/es/gastos-autonomos` | Page title, H1 |
| app gastos compartidos piso | shared apartment expenses | `/es/gastos-piso` | Page title, H1 |
| importar extracto bancario CSV | import bank CSV statement | `/es/importar-csv` | Page title, H1 |
| app para ahorrar dinero | money saving app | `/es/ahorrar` | Page title, H1 |
| gestor de gastos gratis | free expense manager | `/es/` pricing section | H2, body copy |

### Tier 2 — Informational Keywords (Spanish Blog)

| Keyword Cluster | Content Type | URL |
|---|---|---|
| cómo organizar gastos del mes | Blog post | `/es/blog/organizar-gastos-mes` |
| cómo hacer un presupuesto personal | Blog post | `/es/blog/hacer-presupuesto-personal` |
| apps para controlar gastos supermercado | Blog post | `/es/blog/controlar-gastos-supermercado` |
| cómo dividir gastos piso | Blog post | `/es/blog/dividir-gastos-piso` |
| trucos para ahorrar dinero en España | Blog post | `/es/blog/trucos-ahorrar-dinero` |
| cómo leer extracto bancario | Blog post | `/es/blog/leer-extracto-bancario` |
| control gastos Mercadona Consum | Blog post | `/es/blog/control-gastos-mercadona` |
| finanzas personales para jóvenes | Blog post | `/es/blog/finanzas-jovenes` |
| mejor app gastos compartidos 2026 | Blog post | `/es/blog/mejor-app-gastos-compartidos` |
| presupuesto mensual ejemplo | Blog post | `/es/blog/presupuesto-mensual-ejemplo` |

### Spain-Specific Differentiators
- Spanish retailer receipt support (Mercadona, Consum, Lidl, Carrefour, DIA, Eroski)
- EUR currency native
- GDPR/EU compliance
- Works with any Spanish bank CSV export (CaixaBank, BBVA, Santander, ING España)
- No bank connection required (privacy-first, important in EU)

---

## 4. Technical SEO Fixes

### 4A. Landing Page Metadata

**Problem:** Landing page is `"use client"` — cannot export `metadata`.

**Fix:** Create a server-component `layout.tsx` inside `app/(landing)/` that exports metadata. The page itself stays as client component.

```
app/(landing)/
  layout.tsx    ← NEW: server component, exports metadata
  page.tsx      ← existing client component
```

**Metadata to export:**
```typescript
export const metadata: Metadata = {
  title: "Trakzi — The All-in-One Budgeting Workspace",
  description: "Import bank CSVs, scan receipts, track expenses, visualize spending with AI-powered charts, and manage shared costs with friends. Free budgeting app.",
  openGraph: {
    title: "Trakzi — The All-in-One Budgeting Workspace",
    description: "Import bank CSVs, scan receipts, track expenses...",
    url: "https://trakzi.com",
  },
};
```

### 4B. Per-Page Metadata on All Public Pages

Every public page must export its own metadata:

| Page | Title | Description |
|---|---|---|
| `/terms` | Terms and Conditions | Read Trakzi's terms of service for using our budgeting and expense tracking platform. |
| `/privacy` | Privacy Policy | Learn how Trakzi protects your financial data. GDPR-compliant, no bank connection required. |
| `/cookies` | Cookie Policy | Understand how Trakzi uses cookies to improve your experience. |
| `/legal` | Legal Notice | Legal information and company details for Trakzi. |

### 4C. Expand Sitemap

**File:** `app/sitemap.ts`

Add:
- `https://trakzi.com/terms`
- `https://trakzi.com/privacy`
- `https://trakzi.com/cookies`
- `https://trakzi.com/legal`

Future additions (when created):
- All feature pages (`/receipt-scanner`, `/split-expenses`, etc.)
- All blog posts (`/blog/*`)
- Spanish pages (`/es/*`)

### 4D. JSON-LD Structured Data

Add these schemas:

**`WebSite` schema** (root layout):
```json
{
  "@context": "https://schema.org",
  "@type": "WebSite",
  "name": "Trakzi",
  "url": "https://trakzi.com",
  "potentialAction": {
    "@type": "SearchAction",
    "target": "https://trakzi.com/search?q={search_term_string}",
    "query-input": "required name=search_term_string"
  }
}
```

**`Organization` schema** (root layout):
```json
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "Trakzi",
  "url": "https://trakzi.com",
  "logo": "https://trakzi.com/Trakzi/TrakzilogoB.png",
  "sameAs": []
}
```

**`SoftwareApplication` schema** (landing page):
```json
{
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "Trakzi",
  "applicationCategory": "FinanceApplication",
  "operatingSystem": "Web",
  "offers": {
    "@type": "Offer",
    "price": "0",
    "priceCurrency": "EUR"
  },
  "description": "All-in-one budgeting workspace for tracking income, expenses, savings, and shared costs."
}
```

**`Article` schema** (blog posts — when created):
```json
{
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": "...",
  "author": { "@type": "Person", "name": "..." },
  "datePublished": "...",
  "dateModified": "..."
}
```

### 4E. Google Search Console Verification

Add verification file or meta tag. Options:
- `public/google[verification-id].html` file
- `<meta name="google-site-verification" content="..." />` in root layout

---

## 5. Internationalization (i18n)

### Recommended Approach: Subdirectory

`trakzi.com/es/` for Spanish — keeps single domain authority.

### Implementation Steps

1. **Create `[lang]` route structure** or use middleware for locale detection
2. **Add hreflang tags** to root layout:
```html
<link rel="alternate" hreflang="en" href="https://trakzi.com/" />
<link rel="alternate" hreflang="es" href="https://trakzi.com/es/" />
<link rel="alternate" hreflang="x-default" href="https://trakzi.com/" />
```
3. **Create translation files** — `lib/i18n/en.ts`, `lib/i18n/es.ts` (or use `next-intl`)
4. **Set `<html lang="es">`** on Spanish pages
5. **Separate sitemap entries** for Spanish URLs

### Middleware Approach (Recommended)

```
middleware.ts — detect Accept-Language header or cookie
  → redirect to /es/ if Spanish detected
  → add hreflang Link headers
```

### Spanish Landing Page Structure

```
app/es/
  layout.tsx       ← Spanish metadata, <html lang="es">
  page.tsx         ← Spanish landing page (translated content)
  escaner-tickets/ ← Receipt scanner feature page
  dividir-gastos/  ← Split expenses feature page
  gastos-piso/     ← Shared apartment expenses
  importar-csv/    ← CSV import feature page
  ahorrar/         ← Savings feature page
  gastos-autonomos/← Freelancer expenses
  blog/            ← Spanish blog posts
    organizar-gastos-mes/
    hacer-presupuesto-personal/
    ...
```

---

## 6. Content Strategy

### Blog Infrastructure

**Route:** `app/blog/[slug]/page.tsx`

Requirements:
- Static generation (`generateStaticParams`)
- Per-post metadata export (title, description, OG image)
- `Article` JSON-LD schema
- Internal linking to feature pages
- Reading time estimate
- Author bio (E-E-A-T)
- Related posts section

### Pillar Content Plan

**English Pillars (Phase 1):**
1. "How to Budget Your Money: Complete Guide 2026" — targets `how to budget your money` (12K+ vol)
2. "How to Track Expenses: 7 Methods That Actually Work" — targets `how to track expenses` (5K+ vol)
3. "The Best Way to Split Bills With Roommates" — targets `split bills roommates` (3K+ vol)
4. "Grocery Budget Tips: How to Cut Your Food Spending by 30%" — targets `grocery budget tips` (4K+ vol)

**Spanish Pillars (Phase 2):**
1. "Cómo Hacer un Presupuesto Personal: Guía Completa 2026"
2. "Cómo Organizar los Gastos del Mes Paso a Paso"
3. "Las Mejores Apps para Controlar Gastos del Supermercado"
4. "Cómo Dividir los Gastos en una Piso Compartido"

### Publishing Cadence
- **Months 1-2:** 4 pillar posts (EN), 4 pillar posts (ES)
- **Month 3+:** 2 posts/month per language (4 total/month)
- **Ongoing:** Update top-performing posts quarterly

---

## 7. Competitive Advantages

These unique angles differentiate Trakzi and should be emphasized in all content:

| Advantage | Competitors Lack | Content Angle |
|---|---|---|
| No bank connection required | Most apps require Plaid/bank linking | Privacy-first budgeting, CSV import |
| AI receipt scanning | Few apps combine receipt + budgeting | "Scan, don't type" |
| 20+ chart types | Most apps have 3-5 basic charts | Visual analytics depth |
| Shared expenses + personal finance | Splitwise = only splits; YNAB = only personal | All-in-one workspace |
| Free tier (100 txns) | Many competitors are paid-only | "Free budgeting app" |
| Spanish retailer support | Most competitors are US-focused | Spain-specific market |
| Works with any bank worldwide | Competitors require specific bank support | "Globally usable" |

---

## 8. YMYL / E-E-A-T

Google holds financial content to higher standards. Requirements:

### E-E-A-T Checklist
- [ ] Author bios on all blog posts (name, credentials, photo)
- [ ] "Reviewed by" financial expert callouts on advice content
- [ ] Disclaimers on financial advice (not professional financial advice)
- [ ] About page with company information (`/about`)
- [ ] Contact information visible
- [ ] HTTPS everywhere (already done)
- [ ] Privacy policy linked from footer (already done)

### Backlink Strategy
- Get listed on "best budgeting app" roundup articles (NerdWallet, PCMag, CNBC)
- Guest posts on personal finance blogs
- Product Hunt / Product Hunt alternatives
- Finance subreddits (r/personalfinance, r/budgeting)
- Spanish finance blogs and forums

---

## 9. Implementation Phases

### Phase 1 — Technical SEO (Week 1) ⚡ Highest Impact
| Task | File(s) | Effort |
|---|---|---|
| Create landing page metadata in `(landing)/layout.tsx` | `app/(landing)/layout.tsx` | 30 min |
| Add metadata to terms, privacy, cookies, legal pages | `app/(landing)/*/page.tsx` | 30 min |
| Expand sitemap with all public URLs | `app/sitemap.ts` | 10 min |
| Add WebSite + Organization JSON-LD | `app/layout.tsx` | 20 min |
| Add SoftwareApplication JSON-LD | `app/(landing)/layout.tsx` | 15 min |
| Add Google Search Console verification | `app/layout.tsx` or `public/` | 10 min |

### Phase 2 — Feature Landing Pages (Week 2)
| Task | URL | Effort |
|---|---|---|
| Receipt scanner feature page | `/receipt-scanner` | 2 hrs |
| Split expenses feature page | `/split-expenses` | 2 hrs |
| Grocery tracker feature page | `/grocery-tracker` | 2 hrs |
| CSV import feature page | `/csv-import` | 2 hrs |

### Phase 3 — Spain i18n (Week 2-3)
| Task | Effort |
|---|---|
| Set up i18n infrastructure (middleware, `[lang]` routes) | 4 hrs |
| Create Spanish landing page | 3 hrs |
| Add hreflang tags to root layout | 30 min |
| Create Spanish feature pages | 4 hrs |
| Spanish sitemap entries | 30 min |

### Phase 4 — Blog Infrastructure (Week 3)
| Task | Effort |
|---|---|
| Create `/blog/[slug]` route with static generation | 3 hrs |
| Article JSON-LD schema component | 1 hr |
| Blog index page `/blog` | 2 hrs |
| Author bio component (E-E-A-T) | 1 hr |

### Phase 5 — English Blog Posts (Week 3-4)
| Task | Effort |
|---|---|
| "How to Budget Your Money: Complete Guide 2026" | 3 hrs |
| "How to Track Expenses: 7 Methods" | 2 hrs |
| "Split Bills With Roommates" | 2 hrs |
| "Grocery Budget Tips" | 2 hrs |

### Phase 6 — Spanish Blog Posts (Week 4-5)
| Task | Effort |
|---|---|
| "Cómo Hacer un Presupuesto Personal" | 3 hrs |
| "Cómo Organizar los Gastos del Mes" | 2 hrs |
| "Apps para Controlar Gastos Supermercado" | 2 hrs |
| "Cómo Dividir los Gastos en un Piso" | 2 hrs |

### Phase 7 — Comparison Pages (Week 5)
| Task | Effort |
|---|---|
| Trakzi vs YNAB | 2 hrs |
| Trakzi vs Splitwise | 2 hrs |
| Trakzi vs Monarch Money | 2 hrs |

### Phase 8 — Ongoing
- 2 blog posts/month per language
- Quarterly content updates on top performers
- Monitor rankings in Google Search Console
- Build backlinks continuously

---

## 10. Testing Checklist

### 10A. Technical SEO Testing

#### 1. Landing Page Metadata
```bash
# Start dev server
npm run dev

# Visit http://localhost:3000 and check:
# - Page title in browser tab should be "Trakzi — The All-in-One Budgeting Workspace"
# - View source: <title> tag present
# - View source: <meta name="description"> present
# - View source: OG tags present with correct values
```
**Verify:** Open DevTools → Elements → search for `<title>`, `<meta name="description">`, `<meta property="og:`

#### 2. Per-Page Metadata
```bash
# Visit each page and check browser tab title:
# http://localhost:3000/terms → "Terms and Conditions | Trakzi"
# http://localhost:3000/privacy → "Privacy Policy | Trakzi"
# http://localhost:3000/cookies → "Cookie Policy | Trakzi"
# http://localhost:3000/legal → "Legal Notice | Trakzi"
```
**Verify:** Each page has unique `<title>` and `<meta name="description">` in view source

#### 3. Sitemap
```bash
# Visit http://localhost:3000/sitemap.xml
# Verify all URLs present:
# - https://trakzi.com (priority 1.0, weekly)
# - https://trakzi.com/sign-in (priority 0.5, monthly)
# - https://trakzi.com/sign-up (priority 0.5, monthly)
# - https://trakzi.com/terms (priority 0.3, yearly)
# - https://trakzi.com/privacy (priority 0.3, yearly)
# - https://trakzi.com/cookies (priority 0.3, yearly)
# - https://trakzi.com/legal (priority 0.3, yearly)
```
**Verify:** XML is well-formed, all URLs return 200

#### 4. JSON-LD Structured Data
```bash
# Visit http://localhost:3000
# View source and search for "application/ld+json"
# Verify these schemas exist:
# - WebSite (with SearchAction)
# - Organization (with name, url, logo)
# - SoftwareApplication (with offers)
# - FAQPage (existing, 6 items)
```
**Verify:** Paste each JSON-LD block into https://validator.schema.org/ — must show no errors

#### 5. robots.txt
```bash
# Visit http://localhost:3000/robots.txt
# Verify sitemap URL is correct
# Verify public pages are allowed
# Verify /api/, /home/, /dashboard/ etc. are disallowed
```

#### 6. Build Test
```bash
npm run build
# Must complete with 0 errors
# Check for any metadata-related warnings
```

### 10B. Feature Landing Pages Testing

For each new feature page (`/receipt-scanner`, `/split-expenses`, `/grocery-tracker`, `/csv-import`):

```bash
# 1. Page loads at correct URL
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/receipt-scanner
# Expected: 200

# 2. Metadata is correct
# View source → <title>, <meta name="description">, OG tags present

# 3. Page is in sitemap
# Visit /sitemap.xml → URL listed

# 4. Page is indexable (not blocked by robots.txt)
# Visit /robots.txt → page not in disallow list

# 5. JSON-LD present if applicable
# View source → "application/ld+json" block

# 6. Internal links work
# Check that feature page links back to landing page and vice versa

# 7. Mobile responsive
# Chrome DevTools → Toggle device toolbar → test at 375px, 768px, 1024px

# 8. Page speed
# Run Lighthouse audit → Performance > 90, SEO = 100
```

### 10C. i18n / Spanish Pages Testing

```bash
# 1. Spanish landing page loads
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/es/
# Expected: 200

# 2. HTML lang attribute is "es"
# View source of /es/ → <html lang="es">

# 3. Spanish metadata is correct
# <title> in Spanish
# <meta name="description"> in Spanish

# 4. Hreflang tags present on ALL pages
# Root layout should have:
# <link rel="alternate" hreflang="en" href="https://trakzi.com/" />
# <link rel="alternate" hreflang="es" href="https://trakzi.com/es/" />
# <link rel="alternate" hreflang="x-default" href="https://trakzi.com/" />

# 5. Spanish sitemap entries
# Visit /sitemap.xml → /es/ URLs present with hreflang annotations

# 6. Language detection (middleware)
# Set browser language to Spanish → should redirect to /es/
# Set browser language to English → should stay on /

# 7. Cross-language navigation
# English page links to Spanish equivalent
# Spanish page links to English equivalent

# 8. Build test
npm run build
# Must complete with 0 errors including Spanish pages
```

### 10D. Blog Infrastructure Testing

```bash
# 1. Blog index loads
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/blog
# Expected: 200

# 2. Individual blog post loads
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/blog/how-to-budget-your-money
# Expected: 200

# 3. Article JSON-LD schema present
# View source of blog post → "application/ld+json" with @type: Article

# 4. Blog post metadata correct
# <title> = post title
# <meta name="description"> = post excerpt
# OG tags with post-specific image

# 5. Internal links present
# Blog post links to relevant feature pages
# Feature pages link to relevant blog posts

# 6. Static generation works
# Check .next/server/app/blog/ → HTML files generated

# 7. Build test
npm run build
# Must complete with 0 errors
```

### 10E. Google Search Console Testing

```bash
# 1. Verification works
# Submit site to Google Search Console
# Verification file at /public/google[verification-id].html → 200

# 2. Sitemap submitted
# In GSC → Sitemaps → submit https://trakzi.com/sitemap.xml
# Status should show "Success"

# 3. URL Inspection
# In GSC → URL Inspection → test landing page
# Should show: "URL is on Google" (after indexing)
# Coverage: Submitted and indexed
# Enhancement: Structured data detected

# 4. Rich Results Test
# Visit https://search.google.com/test/rich-results
# Test https://trakzi.com
# Should detect: FAQ, WebSite, Organization, SoftwareApplication schemas
```

### 10F. Performance & Lighthouse Testing

```bash
# Run on all new pages:
npx lighthouse http://localhost:3000/receipt-scanner --only-categories=seo,performance --output=json --output-path=./lighthouse-report.json

# Target scores:
# SEO: 100
# Performance: > 90
# Accessibility: > 90

# Or use Chrome DevTools:
# F12 → Lighthouse → Analyze page load
# Check all categories, Mode: Navigation
```

### 10G. Full Build Verification (After All Phases)

```bash
# 1. Clean build
npm run build
# Must complete with 0 errors, 0 warnings

# 2. All routes return 200
# Test each URL from sitemap:
for url in "/" "/sign-in" "/sign-up" "/terms" "/privacy" "/cookies" "/legal" "/receipt-scanner" "/split-expenses" "/grocery-tracker" "/csv-import" "/blog" "/es/"; do
  code=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:3000$url")
  echo "$url → $code"
done

# 3. Lint passes
npm run lint

# 4. No broken internal links
# Use a crawler or manually check all internal links

# 5. Validate all structured data
# Visit https://validator.schema.org/ and test each page
```

---

## Summary: Priority Order

| Phase | What | When | Impact |
|---|---|---|---|
| 1 | Technical SEO fixes | Week 1 | Immediate ranking signal improvements |
| 2 | Feature landing pages | Week 2 | Capture high-intent keywords |
| 3 | Spain i18n | Week 2-3 | Enter Spain market |
| 4 | Blog infrastructure | Week 3 | Foundation for content strategy |
| 5 | English blog posts | Week 3-4 | Informational traffic |
| 6 | Spanish blog posts | Week 4-5 | Spain informational traffic |
| 7 | Comparison pages | Week 5 | Competitor traffic capture |
| 8 | Ongoing (2 posts/mo/language) | Monthly | Long-tail keyword growth |
