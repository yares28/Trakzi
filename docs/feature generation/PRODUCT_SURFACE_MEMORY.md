# Product Surface Memory

This file is the source-of-truth inventory for **all major Trakzi pages and feature surfaces**.

Use it before generating, reviewing, scoring, approving, or rejecting feature ideas.

If a new page or meaningful product surface is added, update this file.

---

## 0. Exact Current Route Inventory

These are the current page routes in the app and marketing site.

### English marketing and entry routes

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

### Spanish marketing routes

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

### App and system routes

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
- `/billing/return`
- `/sso-callback`
- `/testCharts`
- `/debug-chart`

If a feature ideation pass claims full-app coverage, it must account for every route above.

---

## 1. Acquisition, Marketing, And Entry Pages

### English marketing pages

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

### Spanish marketing pages

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

### Entry and account-transition pages

- `/billing/return`
- `/sso-callback`

### Marketing and entry features

- feature-detail storytelling for CSV import, receipt scanner, grocery tracker, and split expenses
- comparison pages against Monarch, YNAB, and Splitwise
- docs browsing
- English and Spanish acquisition coverage
- auth entry points
- pricing and plan explanation

---

## 2. Core In-App Pages

### `/home`

Core features:

- stats cards
- favorites grid
- transactions table
- statement upload
- statement review before import
- AI reparse for weak parses
- onboarding tour entry point

### `/dashboard`

Core features:

- AI-powered scorecard summary
- analytics, fridge, and savings score surfaces
- tips and comparison popovers
- goal-setting modal
- subscription and transaction-progress cards

### `/analytics`

Core features:

- `Analytics` mode
- `Advanced` mode
- `Trends` mode
- reorderable and resizable chart layout
- advanced chart plan gating
- budgets and category-level visibility controls
- statement import and AI reparse support
- analytics bundle-backed chart rendering

### `/fridge`

Core features:

- `Fridge` mode
- `Advanced` mode
- `Trends` mode
- receipt upload
- receipt review and commit
- receipt category creation
- grocery metrics cards
- grocery chart grid
- receipts table

### `/savings`

Core features:

- `Savings` mode
- `Net Worth` mode
- `Debt` mode
- `Calculator` mode
- `Goals` mode
- savings accumulation and savings-rate charts
- debt manager
- mortgage calculator
- goals panel
- AI-assisted goal wizard
- goal-entry tracking

### `/pockets`

Core features:

- `Travel` pocket
- `Garage` pocket
- `Property` pocket
- `Other` pocket
- card grids and stats cards per pocket type
- transaction-link dialogs per pocket type
- vehicle detail tabs for financing, fuel, maintenance, insurance, certificate, parking, and details
- property transaction tabs mapped by owned/rented property type

### `/chat`

Core features:

- AI chat
- suggested questions
- anomaly chips
- chat history
- usage limits and reset messaging
- chart-backed answers
- finance-derived goal suggestions
- demo-mode chat experience

### `/data-library`

Core features:

- transactions table
- statements / reports table
- categories table
- receipt types table
- receipt categories table
- statement upload and review
- receipt upload into the library
- category and receipt taxonomy management
- search and pagination controls
- limits dialogs

### `/friends`

Core features:

- `Rankings` tab
- `Rooms` tab
- `Challenges` tab
- create and join flows
- privacy-aware friend and challenge behaviors

### `/testCharts`

Core features:

- `Charts` mode
- `Features` mode
- chart review queue
- chart implementation queue
- feature review queue
- feature implementation queue
- prompt walkthroughs

### `/debug-chart`

Core features:

- debug and validation surface for chart work

---

## 3. Detail Pages And Subsurfaces

### `/friends/[friendId]`

Core features:

- friend profile summary
- score comparison
- balance summary
- metric-by-metric comparison against the current user

### `/rooms/[roomId]`

Core features:

- `Expenses` tab
- `Insight` tab
- `About` tab
- room header and invite handling
- balances and unattributed-spend handling
- room transaction attribution list
- add-to-room flow
- settle-up flow
- room insights
- member management
- activity feed
- danger-zone delete flow for owners

### `/challenges/[groupId]`

Core features:

- leaderboard tab
- all-time tab
- about tab
- challenge header
- score chart
- challenge members
- editable description for admins
- leave-group flow

---

## 4. Shared Product Capabilities Across Pages

### Capture and import

- CSV statement parsing
- statement review before commit
- AI reparse
- receipt OCR upload
- manual receipt and statement flows

### Visualization

- chart bundles for home, analytics, fridge, savings, trends, friends, pockets, and data library
- chart gating by plan
- chart favorites
- reorderable and resizable card layouts

### Collaboration

- friends
- rooms
- splits
- settlement
- challenge groups
- challenge participation

### Planning

- budgets
- goals
- debt tracking
- mortgage modeling
- pockets as asset or reserve containers

### AI layer

- AI chat
- chart insight generation
- anomaly prompts
- finance-derived suggestions

### System

- onboarding tours
- subscription gating
- demo mode
- billing flows
- user preferences
- privacy and sharing preferences

---

## 5. Feature Generation Coverage Rule

Any feature-ideation workflow that claims full Trakzi scope must consider:

- acquisition and marketing pages
- auth and transition pages
- all primary in-app pages
- detail pages
- cross-surface system features

Do not ideate only for the sidebar pages and call it “full app coverage”.
