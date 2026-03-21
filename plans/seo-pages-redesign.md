# Trakzi Landing Pages — Full Redesign Plan

> Goal: Make all new pages match the original landing page design system, restructure docs with sidebar layout, rebuild /features with alternating sections, add /pricing page.

## Design System Reference

### Colors
- Brand orange (primary): #e78a53 — interactive elements, accents
- Brand orange (buttons): #fe985b — CTAs, fills
- Background: #000000
- Card bg: bg-white/5
- Card border: border-white/10
- Text primary: text-white
- Text secondary: text-muted-foreground

### Background — Pearl Mist (ALL pages must have this)
radial-gradient(ellipse 50% 35% at 50% 0%, rgba(226, 232, 240, 0.12), transparent 60%), #000000

### Buttons
- Primary: rounded-full, bg-gradient-to-b from-[#fe985b] to-[#fe985b]/80, inner shadow, hover:-translate-y-0.5
- Secondary: rounded-full, border-white/20, bg-white/10, hover:bg-white/20

### Cards
rounded-2xl, border-white/10, bg-white/5, backdrop-blur-sm, p-6
Hover: scale 1.02, borderColor rgba(231,138,83,0.6), glow

### Header (Pill shape)
sticky top-4, z-[9999], max-w-5xl, rounded-full, bg-background/80, backdrop-blur-sm, border-border/50, shadow-lg

### Section Spacing
py-48 px-4, container mx-auto or max-w-6xl

### Headings
Inter font (geist.className), gradient: bg-gradient-to-b from-zinc-800 to-zinc-700 bg-clip-text text-transparent

---

## Assets Inventory

### Available
- /Trakzi/TrakzilogoB.png — logo
- /Trakzi/Trakziicon.png — icon
- /Trakzi/fulleticonB.svg — hero bg
- /orangeBackground.png — feature card bg
- /window.svg — layout visual
- /Trakzi/subs/freeiconB.png — starter plan
- /Trakzi/subs/TrakziProIconB.png — pro plan
- /Trakzi/subs/TrakziMaxIconB.png — max plan
- AnimatedCharts — 5 programmatic charts
- ReceiptFridgeAnimation — receipt/fridge/charts
- Globe — 3D WebGL globe

### Need to Create (4 animation components)
- CsvUploadAnimation — file drop, column detection, charts
- RoomSplitAnimation — create room, add friends, balance
- GroceryTrackAnimation — scan receipt, extract, charts
- AiChatDemo — question, AI response with chart

---

## Docs Redesign — Sidebar Layout

### Use Existing shadcn Components
- Sidebar (components/ui/sidebar.tsx) — GPU-accelerated, 781 lines
- ScrollArea, Breadcrumb, Separator, Sheet (mobile)

### Sidebar Navigation Structure
Getting Started: Introduction, Quick Start
Guides: Budget, Track Expenses, Split Bills, Grocery Budget
Comparisons: vs YNAB, vs Splitwise, vs Monarch

### Layout Architecture
SidebarProvider > DocsSidebar (left, 280px) > SidebarInset (content, max-w-3xl)
Mobile: Sheet slide-over on <768px

---

## Features Page — Alternating Sections

6 sections, alternating visual left/right:
1. Receipt Scanner — ReceiptFridgeAnimation (existing) — /receipt-scanner
2. CSV Import — CsvUploadAnimation (NEW) — /csv-import
3. Split Expenses — RoomSplitAnimation (NEW) — /split-expenses
4. Grocery Tracker — GroceryTrackAnimation (NEW) — /grocery-tracker
5. AI Analytics — AiChatDemo (NEW) —
6. Savings — AnimatedCharts subset — 

Each: badge + title + description + bullets + See More + animation

---

## Pricing Page (New)

Route: /pricing
Plans: Starter (Free), PRO (4.99/mo, 49.99/yr), MAX (19.99/mo, 199.99/yr)
Packs: 500/10EUR, 1500/20EUR, 5000/50EUR
Sections: Hero, Toggle, 3 Cards, Comparison Table, Packs, FAQ, CTA

---

## Implementation Order

A: Shared components (feature-page, comparison-page, DocPostContent)
B: 4 new animation components
C: Docs sidebar redesign
D: Features alternating sections
E: Pricing page
F: Polish + build

---

## Open Questions
1. Pricing: UI (100/3000/15000) vs backend (300/1500/5000)?
2. Spanish pricing page (/es/precios)?
3. Remove inline #pricing from landing?
4. Demos in feature detail pages too?

---

## Decisions Made

1. **Pricing numbers:** Use backend limits (Starter 300tx, PRO 1,500tx, MAX 5,000tx)
2. **Spanish pricing:** Create /es/precios
3. **Landing pricing:** Remove inline #pricing section, link to /pricing only
4. **Feature demos:** Add animation demos to BOTH /features hub AND individual feature detail pages
