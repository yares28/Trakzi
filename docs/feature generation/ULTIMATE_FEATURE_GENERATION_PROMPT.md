You are a principal product strategist, senior fintech product designer, systems thinker, and implementation-minded ideation reviewer working on **Trakzi**.

Your task is to generate exactly **{X} new feature concepts** for the app.

This is a **maximum-quality, slow-thinking ideation pass**.
You must optimize for:

- usefulness
- product leverage
- implementation value
- clarity
- non-duplication
- feature cohesion
- decision quality

This is not a quantity exercise.
Only produce features that are strong enough to realistically deserve implementation discussion or prototype work.

For large requests, use a funnel:

- generate the full requested pool
- rank the full pool by strength
- materialize only the strongest shortlist in `/testCharts` using **Features** mode

---

# Phase 0: Required research before ideation

Before generating anything, you must inspect Trakzi’s current product surface, feature memory, and workflow rules.

## Required files to read first

You must review:

- `/Users/yares/Trakzi/docs/feature generation/PRODUCT_SURFACE_MEMORY.md`
- `/Users/yares/Trakzi/docs/feature generation/APPROVED_FEATURE_MEMORY.md`
- `/Users/yares/Trakzi/docs/feature generation/REJECTED_FEATURE_MEMORY.md`
- `/Users/yares/Trakzi/docs/feature generation/FEATURE_SHORTLIST_REVIEW_PROMPT.md`
- `/Users/yares/Trakzi/docs/feature generation/FEATURE_SCORING_RUBRIC_PROMPT.md`
- `/Users/yares/Trakzi/docs/CORE/PROJECT_DEEP_DIVE.md`
- `/Users/yares/Trakzi/docs/CORE/NEON_DATABASE.md`
- `/Users/yares/Trakzi/docs/PAGES/TEST_CHARTS.md`
- `/Users/yares/Trakzi/components/app-sidebar.tsx`
- `/Users/yares/Trakzi/app/(landing)/features/page.tsx`
- `/Users/yares/Trakzi/app/home/_page/HomePage.tsx`
- `/Users/yares/Trakzi/app/dashboard/_page/DashboardPage.tsx`
- `/Users/yares/Trakzi/app/analytics/_page/AnalyticsPage.tsx`
- `/Users/yares/Trakzi/app/fridge/_client/FridgePageClient.tsx`
- `/Users/yares/Trakzi/app/savings/page.tsx`
- `/Users/yares/Trakzi/app/pockets/_page/WorldMapPage.tsx`
- `/Users/yares/Trakzi/app/friends/page.tsx`
- `/Users/yares/Trakzi/app/friends/[friendId]/page.tsx`
- `/Users/yares/Trakzi/app/rooms/[roomId]/page.tsx`
- `/Users/yares/Trakzi/app/challenges/[groupId]/page.tsx`
- `/Users/yares/Trakzi/app/data-library/_page/DataLibraryPage.tsx`
- `/Users/yares/Trakzi/components/chat/chat-interface.tsx`

Also inspect any other relevant docs or files inside `/docs`, `/app`, or `/components` that clarify:

- current product features
- onboarding and activation paths
- data constraints
- plan gates
- AI flows
- collaborative workflows
- current unfinished surfaces

Do not skip this step.

## Whole-app scope rule

This workflow is **whole-app scope**, not only sidebar scope.

You must consider:

- acquisition and marketing pages
- auth and account-transition pages
- home
- dashboard
- analytics
- fridge
- savings
- pockets
- chat
- friends
- rooms
- challenges
- data library
- test and debug surfaces
- plan, billing, onboarding, and shared system layers

If you ignore major surfaces and still claim “full app coverage”, your output is wrong.

## Exact current page coverage

You must explicitly account for all current routes:

- `/`
- `/features`
- `/pricing`
- `/csv-import`
- `/receipt-scanner`
- `/grocery-tracker`
- `/split-expenses`
- `/docs`
- `/docs/[slug]`
- `/compare/trakzi-vs-monarch`
- `/compare/trakzi-vs-ynab`
- `/compare/trakzi-vs-splitwise`
- `/legal`
- `/privacy`
- `/cookies`
- `/terms`
- `/sign-in/[[...sign-in]]`
- `/sign-up/[[...sign-up]]`
- `/es`
- `/es/features`
- `/es/precios`
- `/es/importar-csv`
- `/es/escaner-tickets`
- `/es/gastos-supermercado`
- `/es/dividir-gastos`
- `/es/docs`
- `/es/docs/[slug]`
- `/es/compare/trakzi-vs-monarch`
- `/es/compare/trakzi-vs-ynab`
- `/es/compare/trakzi-vs-splitwise`
- `/billing/return`
- `/sso-callback`
- `/home`
- `/dashboard`
- `/analytics`
- `/fridge`
- `/savings`
- `/pockets`
- `/chat`
- `/friends`
- `/friends/[friendId]`
- `/rooms/[roomId]`
- `/challenges/[groupId]`
- `/data-library`
- `/testCharts`
- `/debug-chart`

## Concrete page-family coverage

At minimum, think across these current page families:

- marketing and docs: `/`, `/features`, `/pricing`, `/docs`, feature pages, comparison pages, legal pages, and their Spanish equivalents
- entry and account pages: `/sign-in`, `/sign-up`, `/billing/return`, `/sso-callback`
- main app pages: `/home`, `/dashboard`, `/analytics`, `/fridge`, `/savings`, `/pockets`, `/chat`, `/friends`, `/data-library`, `/testCharts`
- detail pages: `/friends/[friendId]`, `/rooms/[roomId]`, `/challenges/[groupId]`
- utility pages: `/debug-chart`

## Playground rule

Unless the user explicitly requests text-only ideation, the final active candidate batch should be materialized in `/testCharts` using **Features** mode.

- Treat `/testCharts` feature mode as the default feature-idea playground
- Keep chart ideation in chart mode and feature ideation in feature mode
- Bias toward concepts that can become testable product surfaces, not only abstract docs
- If the run is large, only materialize the strongest shortlist, not the full raw pool

## Data realism rule

Before ideating, determine what Trakzi can realistically support from the current app and data model.

- Use `/Users/yares/Trakzi/docs/CORE/NEON_DATABASE.md` as the authoritative schema snapshot
- Use `/Users/yares/Trakzi/docs/CORE/PROJECT_DEEP_DIVE.md` as supporting architecture context
- Reuse current capture and workflow primitives where possible
- If a feature requires new data, new tables, or new background logic, say so explicitly
- Do not pretend unsupported features are ready-to-ship without additional infrastructure

---

# Phase 1: Hard exclusions

You must reject:

1. Features that are really just chart ideas
2. Cosmetic-only ideas that do not improve behavior or outcomes
3. Generic fintech filler that could belong to any budgeting app
4. Duplicate ideas that only rename an existing flow
5. Features that ignore Trakzi’s actual product surface
6. Features that require implausible data capture without acknowledging it
7. Features that only sound strategic but do not define a real user workflow

## Non-duplication rule

A feature is a duplicate if the **underlying user job** is already handled.

Changing:

- page placement
- wording
- visual treatment
- minor implementation details

does **not** make it a new feature if the same user problem is already solved.

You must also avoid all approved and rejected concepts listed in feature memory.

---

# Phase 2: Current Trakzi product surface

You must reason from the current app, including at minimum these existing surface families:

## Acquisition and entry

- feature landing pages for CSV import, receipt scanning, grocery tracking, and split expenses
- pricing, comparisons, docs, legal, privacy, cookies, and terms
- English and Spanish acquisition paths
- sign-in and sign-up flows
- docs detail pages and translated comparison pages
- billing return and SSO callback transitions

## Capture and intake

- CSV bank-statement import with review before commit
- AI reparse when parsing quality is weak
- receipt OCR and receipt-based grocery extraction
- bank-first positioning without direct bank connections
- manual review before transaction or receipt commit
- shared import flows reachable from home, analytics, fridge, and data library

## Home and dashboard

- home dashboard with stats, favorites, and transaction table
- dashboard AI scorecards and recommendation-style summaries
- onboarding tour entry points
- statement upload and weak-parse repair access
- score drill-ins, comparisons, and subscription/progress cards

## Analytics

- analytics workspace with `Analytics`, `Advanced`, and `Trends` modes
- reorderable and resizable chart layouts
- plan-gated advanced charts
- budgets and category visibility controls

## Fridge

- grocery-focused receipt intelligence
- store, category, timing, basket-size, macro, and snack-share analysis
- receipt review and receipts table
- fridge-specific trends mode

## Savings

- savings accumulation
- savings rate and net worth tools
- debt manager and mortgage calculator
- goals workspace and AI-assisted goal wizard

## Pockets

- travel
- garage
- property
- other assets
- transaction-link dialogs by pocket type
- garage detail tabs for financing, fuel, maintenance, insurance, parking, certificate, and details
- property surfaces for owned and rented property transaction groupings

## Friends, rooms, and challenges

- rankings
- rooms / shared expenses
- challenges
- balances, settlement, activity feed, members, and leaderboard flows
- friend comparison detail
- room tabs for expenses, insight, and about
- challenge tabs for leaderboard, all-time, and about
- group creation, join, leave, admin description edit, and privacy-aware behavior

## AI

- AI chat
- anomaly chips
- suggested prompts
- chart-backed finance answers
- saved chat history
- usage caps, reset messaging, and demo-mode chat handling

## Data Library and system layer

- transaction archive
- category and receipt taxonomy management
- statements and reports
- onboarding tours
- plan limits for advanced charts, AI insights, and chat usage
- billing and subscription flows
- test and debug surfaces
- receipt types, receipt categories, limits dialogs, search, and pagination
- `/testCharts` chart and feature queues plus prompt walkthroughs
- `/debug-chart` validation workflow for chart work

Do not ideate as if Trakzi were a blank-slate budgeting app.

---

# Phase 3: Opportunity types

Your pool should include a deliberate mix of:

1. **Strengthening features**
   - improve an existing Trakzi surface
   - increase clarity, retention, usefulness, activation, or follow-through

2. **Cross-feature features**
   - connect two or more current surfaces
   - make the product feel more unified and compounding

3. **Net-new features**
   - create a genuinely new surface or workflow
   - still feel native to Trakzi’s brand, data model, and product direction

## Bias rule

Default preference order:

1. strengthen a strong existing surface
2. connect existing surfaces
3. invent a new one

Do not jump to net-new ideas when a better answer is to make the current product stronger.

---

# Phase 4: Product standard

Every feature must be:

- important
- concrete
- clearly understandable
- implementation-worthy
- high-leverage
- native to Trakzi
- distinct from current coverage
- useful enough to justify build discussion

Reject ideas that are:

- shallow
- decorative
- repetitive
- vague
- too far from current product reality
- hard to explain as a real workflow

If the feature is not important enough to matter in planning, do not include it.

---

# Phase 5: Feature categories to cover

Spread ideas across the product rather than overfocusing on one area.

Potential directions include:

- capture quality
- onboarding
- budgeting control
- grocery behavior
- savings resilience
- debt management
- goals and planning
- shared finances
- competitive habit loops
- asset tracking
- AI assistance
- automation
- cross-surface recommendation systems
- premium feature differentiation
- growth and activation handoffs

The final set should not feel dominated by only charts, groceries, or AI chat.

---

# Phase 6: Difficulty balance

The output must include a balanced mix of:

- `Easy`
- `Medium`
- `High`

Definitions:

- `Easy`: straightforward extensions to current flows
- `Medium`: multi-step or cross-surface features that still fit the current model
- `High`: strategic or system-level features that require new coordination, data, or product shape

Do not put everything into one difficulty band.

---

# Phase 7: Output format

Return the full requested pool in a ranked table with these columns:

| Rank | Feature Name | Type | Difficulty | Primary Surface | Existing Surface(s) Used | User Problem Solved | What It Does | Why It Matters | MVP Shape | New Data / Infra Needed | Confidence |

Where:

- `Type` must be one of `Strengthen Existing`, `Cross-Feature`, or `Net-New`
- `Existing Surface(s) Used` must explicitly name what current Trakzi surface the feature builds on
- `MVP Shape` must describe the first credible testable version
- `New Data / Infra Needed` must say `None`, `Light`, `Medium`, or `Heavy`, plus one sentence of detail

After the full table, add:

## Best of Batch

Select the strongest shortlist and provide for each:

- feature name
- why it survives
- what makes it stronger than nearby alternatives
- what surface in `/testCharts` feature mode it should be materialized into

## Portfolio readout

Summarize:

- how many ideas strengthen existing surfaces
- how many are cross-feature
- how many are net-new
- how well the batch covers the full app
- where the strongest leverage is concentrated
- what product gap appears most worth attacking next

---

# Phase 8: Materialization rule

If you are operating inside the Trakzi repo and the user did not ask for text-only output:

- materialize the strongest shortlist in `/testCharts` feature mode
- do not dump raw low-quality backlog items into the visible surface
- keep the feature shortlist focused, reviewable, and implementation-minded
- update supporting docs if the playground structure changes

For large runs:

- if **{X}** is `50` or more, materialize only the top `12` to `20` ideas
- keep the full ranked batch in the text output or docs, not all in the visible playground

---

# Final instruction

Now generate the final batch of exactly **{X}** new Trakzi features using the standards above.
