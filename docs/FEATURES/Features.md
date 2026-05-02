# Features

Overview of Trakzi product capabilities, grouped by area. This file is the practical feature overview for the current app surface plus a vetted shortlist of free, high-leverage additions that fit the existing product. For plan limits and the transaction economy, see [Plan & subscription overhaul](../CORE/PLAN_SUBSCRIPTION_OVERHAUL.md).

---

## Product Boundaries

These boundaries matter when evaluating new work:

- **Bank-first privacy model**: the product is built around CSV/XLS/XLSX/PDF imports and receipt uploads, not direct bank credential connections or sync marketplaces.
- **Internal-data-first intelligence**: the strongest features reuse imported transactions, receipts, accounts, pockets, goals, rooms, and existing AI hooks instead of depending on paid third-party enrichment.
- **Privacy-safe collaboration**: friends, rooms, and challenges are private and score-based where appropriate. Public spending feeds and auto-posting do not fit the product.
- **Decision value over novelty**: Trakzi already rejects decorative or gimmick-only ideas. Strong additions should improve trust, cleanup, planning, or follow-through.

---

## Home

Primary signed-in workspace for quick health checks, favorites, imports, and transaction review.

- **Stats and summaries**: high-level KPIs and short-range trends for the active date window.
- **Favorite charts**: pinned and reorderable chart cards with persisted layout where configured.
- **Account-aware statement import**: drag-and-drop import flow for CSV/XLS/XLSX/PDF statements with required account selection, parsing review, and AI-assisted repair when parses are weak.
- **Transaction table**: browse and manage imported transactions in the same workspace.
- **Onboarding entry point**: first-run tour and checklist access.

---

## Dashboard

Narrative scorecard surface for financial health rather than raw data entry.

- **Financial health summary**: stability, spending, and savings score surfaces.
- **AI-powered insights**: short proactive observations tied to real user data.
- **Comparison popovers**: contextual explanations and drill-ins from summary cards.
- **Goal-setting shortcuts**: lightweight entry points into savings and target-setting flows.
- **Usage and progress cards**: subscription state and capacity progress surfaces.

---

## Analytics

Main transaction analysis workspace.

- **Three modes**: `Analytics`, `Advanced`, and `Trends`.
- **Large chart surface**: transaction analysis across cash flow, categories, timing, budgets, needs vs wants, ranking shifts, and activity patterns.
- **Resizable and reorderable layout**: drag, resize, reorder, and save chart layouts.
- **Budget and visibility controls**: category-level limits and ring visibility settings.
- **Transfer-aware analytics**: confirmed internal transfers are excluded from spend and income totals so totals do not double-count account moves.
- **Bundle-backed performance**: analytics data loads through cached bundle endpoints instead of one request per chart.
- **Import support**: statement upload and AI reparse are available from the analytics workspace.
- **Legacy trends route support**: `/trends` now redirects into Analytics Trends instead of maintaining a separate page.

---

## Pockets

Structured asset and context tracking beyond plain transaction history.

### Travel

- **Interactive world map**: link spend to countries.
- **Domestic vs abroad rollups**: separate home-country and international spending.
- **Country drill-downs**: inspect transactions tied to a country.

### Garage

- **Vehicle pockets**: store metadata per vehicle.
- **Cost buckets**: financing, fuel, maintenance, insurance, certificate, parking, and details tabs.
- **Transaction linking**: assign imported transactions to a vehicle and cost bucket.

### Property

- **Owned vs rented models**: different metadata shapes for each housing type.
- **Mortgage-aware metadata**: loan amount, rate, term, years paid, and related property fields where captured.
- **Property transaction grouping**: property-linked expense context in a dedicated pocket surface.

### Other

- **Flexible pockets**: catch-all assets or tracked buckets that do not fit vehicle or property models.

---

## Fridge

Receipt-centric grocery intelligence.

- **Receipt upload**: images and PDFs with OCR and merchant-specific parsing where available.
- **Review pipeline**: confirm merchant, date, totals, and line items before commit.
- **Item categorization**: receipt-specific categories and type management.
- **Preference learning**: corrections feed future categorization and store-language behavior.
- **Store analysis**: compare spending patterns across stores.
- **Price-change tracking**: highlight price movement for repeated items.
- **Fridge chart grid**: grocery metrics, store behavior, category views, and dedicated trends mode.
- **Receipts table**: browse committed receipt history.

---

## Savings, Net Worth, Debt, and Goals

Multi-mode planning surface built around savings behavior and liabilities.

- **Savings mode**: accumulation and savings-rate tracking with customizable layout.
- **Net worth mode**: net worth calculator panel, trend view, and net-worth-goal entry points.
- **Debt mode**: dedicated debt manager surface for liability tracking and payoff workflows.
- **Calculator mode**: mortgage calculator and amortization schedule.
- **Goals mode**: savings goals workspace with entries, status changes, and linked workflows.
- **Goal wizard**: AI-assisted or finance-assisted goal setup with recommended pace logic.
- **Pocket and debt linking**: goal creation can connect to debts, pockets, or net worth targets.

---

## Data Library

Control plane for imported data and taxonomies.

- **Transaction ledger**: searchable and filterable transaction table.
- **Statements and reports**: import history, review, delete, and open statement detail.
- **Statement viewer/editor**: inspect a statement's transactions, bulk recategorize, and delete rows.
- **Shared import pipeline**: same parsing and review model used by Home and Analytics.
- **Categories**: manage transaction categories and tier metadata.
- **Receipt types and receipt categories**: maintain grocery taxonomy separately from bank categories.
- **Search and pagination**: table controls across library surfaces.
- **Transfer backlog prompt**: the library can surface a review banner when unresolved transfer suggestions are old enough to skew analytics.

---

## Transfers

Dedicated review queue for internal account moves.

- **Detected transfer queue**: newly imported transactions can be matched into likely internal transfers.
- **Statuses**: `pending`, `suggested`, `confirmed`, and `rejected`.
- **High-confidence quarantine**: clear transfer matches can be held out of analytics immediately as `pending_transfer`.
- **Manual review**: ambiguous matches stay visible until the user confirms or rejects them.
- **Bulk confirm**: high-confidence pending rows can be confirmed in bulk.
- **Navigation prompts**: sidebar badge and stale-review banner nudge cleanup when unresolved transfers build up.

---

## AI and Automation

- **AI chat**: ask questions over finances with suggested prompts, anomaly chips, and chat history.
- **Chart-backed answers**: responses are grounded in page bundle data where supported.
- **Per-chart insights**: chart cards can request AI-generated explanations.
- **Auto-categorization**: bank transaction categorization learns from corrections and uses simplified merchant labels where available.
- **Receipt and statement parsing**: AI-assisted extraction and repair flows across upload surfaces.

---

## Social, Rooms, and Challenges

Friend graph, shared expenses, and privacy-safe competition.

- **Friends**: add via friend codes, manage request states, open friend detail pages.
- **Rankings**: compare privacy-safe financial metrics instead of raw account balances.
- **Rooms**: create and join expense-sharing rooms with roles and invite codes.
- **Shared transactions**: equal, percentage, custom, or item-level splits with optional personal-transaction linkage.
- **Receipt-based room attribution**: assign line items across room members.
- **Settlements**: settle pending splits and record settlement-related transaction types.
- **Challenges**: time-boxed spending challenges and leaderboard groups with points-based monthly results.

---

## Plans, Billing, and Limits

- **Plans**: `Free`, `Pro`, and `Max`.
- **Stripe flows**: checkout, subscription sync, customer portal, and billing return handling.
- **Transaction wallet**: base capacity, earned monthly bonus capacity, and one-time transaction packs.
- **Entitlements**: per-plan caps for AI chat, receipt scans, custom categories, advanced charts, and account counts.
- **Upgrade prompts**: limit dialogs and recovery messaging across constrained flows.

---

## Demo Mode

- **Guest exploration**: major app surfaces can be browsed with mock data and no persistent writes.
- **Write safety**: mutations remain blocked or rerouted in demo mode while real APIs stay auth-gated.

---

## Onboarding, Settings, and Personalization

- **Product tours**: page-level onboarding tours and checklist-driven first-run guidance.
- **Preferences**: theme, color palette, currency, compact-number display, and default date filter settings.
- **Account settings**: create, edit, archive, delete, and organize bank accounts or cards from the settings panel.
- **Net worth summary**: account settings include a lightweight net worth card sourced from tracked assets and liabilities.
- **Privacy controls**: settings drive what friends and groups can see in rankings and challenge contexts.
- **Bug-report surface**: in-app bug report entry point.

---

## Core Experience

- **Responsive shell**: shared sidebar, header, and mobile-friendly layouts.
- **Quick create**: lightweight transaction entry flow from the main nav.
- **Upload routing**: the shell routes files toward the right destination surface based on type heuristics.
- **Caching and invalidation**: bundle caches are invalidated when imports or edits change analytics.
- **Security**: Clerk auth, per-user data isolation, Stripe verification, CSP, and rate-limiting patterns.

---

## Marketing and Locales

- **English acquisition pages**: landing, features, pricing, docs, comparison pages, CSV import, receipt scanner, grocery tracker, split expenses, legal pages, and auth entry.
- **Spanish acquisition pages**: localized landing, pricing, docs, comparison pages, import, receipt scanner, grocery tracker, and split-expense pages.
- **Feature storytelling**: acquisition pages explain CSV-first privacy, receipt OCR, grocery tracking, and shared-expense workflows.

---

## Operational Instrumentation

- **PostHog**: product analytics, event capture, and AI usage instrumentation where configured.
- **Debug and test surfaces**: `/testCharts` for chart and feature ideation queues, plus `/debug-chart` for chart debugging.

---

## Top 10 Features People Would Actually Want

This pass keeps the ideas that clearly create pull, moves partial fits into the right surface, and drops the ones that read more like internal tooling than reasons to use the app. All 10 fit Trakzi's current scope and can be built from Trakzi's own imported data.

1. **Subscription Kill List**

- **What it is**: a dedicated subscriptions screen that shows every recurring service, the next expected renewal, the monthly total, the yearly total, and which subscriptions have gotten more expensive.
- **What makes it worth opening**: it answers the most obvious recurring-bills question in personal finance: "what should I cancel?"
- **What it should include**: duplicate-service detection, "new this month" labels, biggest-cost-first sorting, annualized cost, and one-tap jump to matching transactions.

2. **Money Leak Alerts in Chat**

- **What it is**: a chat-first alert mode that surfaces duplicate-looking charges, creeping subscriptions, sudden merchant spikes, and grocery items that quietly got more expensive.
- **What makes it worth opening**: it makes Chat useful even before the user types anything complex.
- **What it should include**: one-tap prompts like `Check my leaks`, short alert cards, plain-English reasons each alert was triggered, and direct links into the transactions or receipts behind the alert.

3. **Safe-to-Spend This Month**

- **What it is**: one honest number that shows how much the user can still spend this month after expected bills, known pocket costs, and goal contributions.
- **What makes it worth opening**: it is simpler and more useful than asking users to mentally combine budgets, bills, and savings targets themselves.
- **What it should include**: remaining free-cash estimate, bills still likely to hit before month-end, optional goal-buffer toggle, and the categories or merchants dragging the number down the most.

4. **Net Worth Change Explainer**

- **What it is**: a plain-English breakdown of what pushed net worth up or down this month.
- **What makes it worth opening**: the user stops seeing net worth as a mysterious number and starts seeing the exact drivers behind it.
- **What it should include**: top positive movers, top negative movers, debt-paydown impact, cash buildup, and links back to the accounts, pockets, or debt entries that caused the change.

5. **Bills Due Soon**

- **What it is**: a recurring-bills calendar that predicts what is likely to hit in the next 7, 14, or 30 days based on imported history.
- **What makes it worth opening**: it gives users a practical reason to check the app before charges land instead of after the money is already gone.
- **What it should include**: expected date windows, usual amounts, price-change badges, "newly recurring" labels, and direct jumps to the transactions that established the pattern.

6. **Pocket Cost Reality Check**

- **What it is**: a brutally simple "what does this really cost me?" view for cars and properties.
- **What makes it worth opening**: people want one honest monthly cost number, not scattered maintenance, fuel, mortgage, parking, or insurance entries.
- **What it should include**: average monthly cost, biggest cost bucket, recent trend, expensive one-off events, and cost as a share of income when enough data exists.

7. **Paycheck Breakdown**

- **What it is**: after each income deposit, Trakzi shows where that paycheck actually went.
- **What makes it worth opening**: many users think in pay cycles, not monthly chart windows, so this makes spending feel immediately understandable.
- **What it should include**: fixed-cost share, flexible-spend share, savings/debt share, leftover amount, and comparison against the previous paycheck cycle.

8. **Missing or Smaller Paycheck Alert**

- **What it is**: Trakzi detects when a usually recurring income deposit fails to appear or arrives meaningfully below its normal amount.
- **What makes it worth opening**: it catches salary issues, delayed client payments, or shrinking side income before the user feels the damage later in the month.
- **What it should include**: expected date window, usual amount, actual delta, confidence based on history depth, and links to the months that established the pattern.

9. **Grocery Receipt Overrun Explainer**

- **What it is**: after a receipt is committed, Trakzi explains why this grocery trip cost more than usual.
- **What makes it worth opening**: it turns receipt scanning into an answer, not just an archive.
- **What it should include**: basket comparison against the user's usual trip, top item price jumps, quantity-change flags, store-difference callouts, and direct links to the exact receipt lines that drove the increase.

10. **Monthly Wins Recap in Chat**

- **What it is**: a chat-first recap that highlights where the user actually improved versus last month.
- **What makes it worth opening**: people come back more when the app shows progress, not only problems.
- **What it should include**: categories down the most, subscriptions canceled, cheaper grocery patterns, debt paid down, and the estimated money kept because of those improvements.

### Best First

If these were prioritized for maximum user appeal, the current order would be:

1. Subscription Kill List
2. Money Leak Alerts in Chat
3. Safe-to-Spend This Month
4. Bills Due Soon
5. Net Worth Change Explainer
6. Pocket Cost Reality Check
7. Paycheck Breakdown
8. Missing or Smaller Paycheck Alert
9. Grocery Receipt Overrun Explainer
10. Monthly Wins Recap in Chat

### Supporting Improvements From Your Notes

These are worth doing, but they read as core product quality or trust layers rather than headline features users would open the app for:

- **Automatic merchant normalization**: merchant cleanup should happen by default from learned patterns, with review only when Trakzi is unsure.
- **Chart coverage warnings**: missing-month and overlap indicators belong inside relevant charts and summaries so users can see when analytics are based on incomplete history.

### Explicitly Excluded

These were deliberately not recommended because they either collide with current strategy or already failed feature review:

- direct bank-sync marketplace or bank-credential sourcing
- public spending feeds, auto-posted money activity, or raw-amount leaderboards
- decorative AI or novelty gamification
- unchanged re-proposals of approved/rejected memory items such as Grocery Budget Guardrail, Chat Answer Evidence Drawer, Limit Forecast Banner, Room Provenance Reconciliation, Budget Breach Root Cause Stack, or Receipt Edit After Commit
