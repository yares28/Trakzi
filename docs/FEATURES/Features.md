# Features

Overview of Trakzi (Folio) product capabilities, grouped by area. For subscription limits and the transaction economy, see [Plan & subscription overhaul](../CORE/PLAN_SUBSCRIPTION_OVERHAUL.md). For demo browsing without an account, see [Demo mode](./DEMO_MODE.md).

---

## Home

Primary workspace after sign-in: quick health view, favorites, and imports.

- **Stats & summaries**: High-level KPIs and trends for the selected date range.
- **Favorite charts**: Pin and reorder key charts; layout and sizes sync with user preferences where configured.
- **Statement import**: Drag-and-drop or dialog upload; CSV/PDF parsing, AI-assisted interpretation, and review before commit (same core pipeline as Analytics/Data Library).
- **Transaction table**: Browse and manage imported bank transactions with filtering aligned to the global date filter.
- **AI re-parse**: Optional flow to re-run parsing on problematic statements when supported.

---

## Dashboard

Central hub for financial health (distinct from Home: more “scorecard” and narrative).

- **Financial health score**: Aggregate view of stability and habits (with supporting metrics).
- **AI-powered insights**: Short, proactive observations tied to your data (availability varies by plan; see plan doc).
- **Net worth overview**: Assets versus liabilities at a glance.
- **Quick actions**: Shortcuts into common flows (e.g. uploads, key destinations).
- **Deep links**: Cards link into detailed areas (e.g. savings, analytics) for follow-up.

---

## Analytics

Full charting and analysis for bank transactions.

- **Chart grid**: Large set of visualizations (trends, categories, merchants, time patterns, comparisons). Layout: drag, resize, reorder; visibility and sizes persisted per user where enabled.
- **Date filter**: Global period selection driving bundle data across charts.
- **Category rings / budgets**: Set per-category limits for analytics rings; persists via budgets API.
- **Statement import**: Same import and review experience as Home, scoped to this page.
- **Performance**: Data loaded via cached **bundle APIs** (single round-trip per page where applicable).

---

## Pockets (assets, liabilities & travel)

Unified model for vehicles, properties, “other” pockets, and country-linked spending.

### Travel (world map)

- **Interactive world map**: Link spending to countries for trips and geography-aware views.
- **Domestic vs abroad**: Rollups that separate home-country spend from international.
- **Per-country drill-down**: Inspect transactions associated with a country.

### Garage (vehicles)

- **Fleet**: Multiple vehicles with structured metadata (brand, type, year, plate, fuel, tank size, optional financing fields).
- **Cost buckets**: Fuel, maintenance, insurance, certificate, financing, parking, and related tabs; link personal transactions to a vehicle and tab.
- **Icons / visuals**: Optional SVG paths for vehicle identity in the UI.

### Property

- **Owned vs rented**: Different metadata shapes (e.g. mortgage blocks for owned, rent for rented).
- **Mortgage fields**: Loan amount, rate, term, years paid (where captured in metadata).
- **Equity thinking**: Estimated value and liability context for owned homes (as modeled in app data).

### Other assets

- **Flexible pockets**: Catch-all for assets that are not vehicle/property with name + JSON metadata.

---

## Fridge (grocery & receipts)

Receipt-centric grocery intelligence.

- **Uploads**: Images/PDFs to OCR and store-specific parsers where available.
- **Review pipeline**: Confirm merchant, date, line items, and totals before committing.
- **Line-item categories**: Map items to receipt categories (food, drinks, other) and macronutrient-style types where used.
- **Preferences**: Learn from corrections (item/store language preferences) to speed up future scans.
- **Charts**: Fridge-specific bundle (spending, nutrition-oriented views, store patterns) with the same layout/favorites patterns as other chart pages when enabled.
- **Plan limits**: Monthly receipt scan quotas per plan (see plan doc).

---

## Savings & debt

Multi-mode page: savings view, debt focus, calculator, and goals.

- **Savings charts**: Accumulation, savings-rate trend, net-worth trend (and related KPIs) with sortable layout.
- **Debt lens**: Dedicated mode to emphasize liabilities and payoff context.
- **Mortgage calculator**: In-app calculator for scenarios and payments.
- **Goals**: Guided goal flows (e.g. wizard-style UI) and persistence for savings targets (category, target amount, deadline, monthly allocation) where enabled.
- **Savings score**: Derived score component for at-a-glance progress.

---

## Data Library

Control plane for raw data, statements, and taxonomies.

- **Transaction ledger**: Searchable, filterable list of bank transactions.
- **Statements**: List uploads, open statement detail, delete statements.
- **Statement viewer / editor**: Review transactions inside a statement; bulk category changes and deletes with save (tracked in product analytics as structured events).
- **Import**: Parse and import CSV (and supported flows) with the same AI/parse modes as Home/Analytics.
- **Categories**: Create and manage custom transaction categories; tier tags (e.g. needs vs wants) where used.
- **Receipts**: List and remove receipt records tied to Fridge.
- **Receipt taxonomy**: Manage receipt categories and macronutrient types separately from bank categories.
- **Reports / export**: Summaries and export-oriented flows where implemented in UI.

---

## AI & automation

- **AI chat**: Dedicated chat page to ask questions over your finances; streaming replies; quick prompts and anomaly-style suggestions on supported plans. Usage capped per plan (weekly/monthly windows — see plan doc).
- **Chart insights**: Per-chart “AI insight” actions that call server-side models with LLM analytics hooks.
- **Auto-categorization**: Learning from user corrections and hybrid pipelines for bank descriptions (e.g. simplified merchant labels).
- **Receipt / statement parsing**: AI-assisted extraction and categorization on upload paths.

---

## Social, rooms & challenges

Friend graph, shared expenses, and lightweight competition.

- **Friends**: Add via friend codes; pending/accepted/declined/blocked states; friend profile views.
- **Rankings**: Compare progress with friends using **score-style metrics** (not raw dollar amounts); opt-in sharing flags on the user profile.
- **Rooms**: Create/join rooms with invite codes; roles (owner/admin/member); shared transaction list per room.
- **Shared transactions**: Split types (equal, percentage, custom, item-level); optional link to personal `transactions` rows; receipt line items for item-level splits; settlement-style transaction types when settling shared balances.
- **Share from ledger**: Push an existing personal transaction into a room or friend split via API-backed flows.
- **Challenges**: Time-boxed spending challenges with participants and cached progress.
- **Challenge groups**: Leaderboard groups with invite codes, monthly metric results, and points-style scoring.
- **Plan limits**: Shared-transaction monthly caps per plan where enforced server-side.

---

## Test Charts

- **Playground** (`/testCharts`): Large catalog of experimental and advanced chart components for validation and power users.
- **Parity with production**: Many charts mirror or foreshadow Analytics/Home visuals; uses the same sizing/favorites/chart-id machinery where wired.

---

## Plans, billing & limits

- **Plans**: **Free**, **Pro**, and **Max** (no separate “Basic” tier in the current product).
- **Stripe**: Checkout, customer portal, subscription sync via webhooks; return URL handling after checkout.
- **Transaction wallet**: Permanent capacity (base gift + earned rollover + purchased packs) plus monthly bonus slots; soft enforcement with upgrade/purchase messaging (details in plan doc).
- **Transaction packs**: One-time purchases that add permanent transaction capacity.
- **Entitlements**: Different caps for transactions, receipt scans, AI chat volume, custom category counts, advanced chart access, and AI insight previews on Free.

---

## Demo mode

- **Guest exploration**: Try major app surfaces with mock data and no database writes (see [DEMO_MODE.md](./DEMO_MODE.md)).
- **Safety**: Real APIs remain auth-gated; demo uses dedicated demo data paths as implemented.

---

## Onboarding

- **Welcome & checklist**: First-run checklist items (e.g. upload statement, explore areas).
- **Product tours**: Guided tours for key pages (e.g. Home, Friends, Savings) using the onboarding provider.
- **Contextual hints**: Map-pin and similar entry points to start tours from headers where present.

---

## Personalization & layout

- **Themes**: Dark and light (and related color-scheme tooling).
- **Currency**: Global display currency for formatted amounts.
- **Chart layout persistence**: Order, sizes, and favorites for Home, Analytics, Fridge, Savings (and related chart IDs) stored in user preferences where integrated.
- **Chart visibility**: Category or scope-based visibility for chart sections when the visibility provider is used.
- **Date filter**: Shared date-range context across eligible pages.

---

## Core experience

- **Responsive shell**: Sidebar navigation, headers, and layouts tuned for desktop and mobile.
- **Transaction dialog**: Quick create/edit flows for manual adjustments where exposed.
- **Caching**: Server-side bundle responses cached (e.g. Redis) for snappy reloads after first fetch.
- **Privacy & security**: Clerk authentication, per-user data isolation in APIs, Stripe webhook verification, CSP and reverse-proxy patterns for analytics as configured.
- **Performance**: Lazy-loaded charts where used; memoized chart components in line with project standards.

---

## Marketing & locales

- **Landing & SEO pages**: Feature, pricing, comparisons, receipt scanner, CSV import, split expenses, grocery tracker, legal/privacy/cookies (English).
- **Spanish sections** (`/es/...`): Localized marketing and docs entry points where published.
- **Auth routes**: Clerk-hosted sign-in/sign-up flows.

---

## Account & settings

- **Profile**: Managed via Clerk; synced user row in the app database for subscription and features.
- **Subscription self-service**: Portal and in-app plan changes aligned with Stripe.
- **Billing return**: Post-checkout sync and redirect experience.
- **Usage & limits**: Surfaces that show remaining AI, scans, or transaction capacity depending on plan (see live UI and plan doc).

---

## Operational & analytics (product team)

- **PostHog**: Client and server instrumentation for product analytics, session replay (where enabled), error capture, and LLM usage analytics on AI routes — see [PostHog integration](../CORE/POSTHOG.md).
