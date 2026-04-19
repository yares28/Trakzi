# Domain Extractability Map

This file translates the current Trakzi database and backend shape into chart-friendly extraction guidance.

Primary schema sources:
- `/Users/yares/Trakzi/docs/CORE/NEON_DATABASE.md`
- `/Users/yares/Trakzi/docs/CORE/PROJECT_DEEP_DIVE.md`

Important:
- `docs/CORE/NEON_DATABASE.md` is the strongest current schema snapshot
- `database/schema.sql` is currently missing in this repo snapshot
- Use this file to decide what chart concepts are realistically supportable today

---

## Shared Base Signals

These signals cut across many domains and are broadly available:

- user-level ownership via `user_id`
- transaction dates and times via `transactions.tx_date` and `transactions.tx_time`
- transaction amounts via `transactions.amount`
- account balance snapshots via `transactions.balance`
- transaction classification via `transactions.tx_type`
- merchant-like grouping via `transactions.description` and `transactions.simplified_description`
- transaction categories via `transactions.category_id -> categories`
- receipt dates via `receipts.receipt_date`
- receipt stores via `receipts.store_name`
- receipt line-item costs and quantities via `receipt_transactions`
- room and split linkage via `transactions.room_transaction_id`, `transactions.room_id`, `transactions.room_item_id`

Use these as the default raw material for timing, pressure, ranking, comparison, volatility, and state charts.

---

## Analytics

### Primary support

Strongly supported by:
- `transactions`
- `categories`
- `category_budgets`
- `transaction_category_preferences`
- `user_preferences`

### Best extractable signals

- income vs expense timing
- cash-flow balance change
- category allocation
- budget usage
- merchant concentration
- weekday / week-of-month / month-of-year patterns
- balance pressure windows
- transaction size distributions
- category pressure and crowd-out
- spending frequency vs severity

### Strong chart classes

- bars
- grouped bars
- stacked bars
- split bars
- dot plots
- range plots
- boxplots
- heatmaps
- treemaps
- funnels
- sankeys
- scatter plots

### Notes

- Analytics is the strongest domain for broad category-level and transaction-level charts
- Merchant-like charts are realistic through `description` and `simplified_description`
- Budget-aware charts are realistic through `category_budgets`

---

## Fridge

### Primary support

Strongly supported by:
- `receipts`
- `receipt_transactions`
- `receipt_categories`
- `receipt_category_types`
- `receipt_item_category_preferences`
- `receipt_store_language_preferences`

### Best extractable signals

- basket size
- item count
- quantity
- unit price
- store mix
- store timing
- item repetition
- category mix
- receipt complexity
- shopping cadence
- store-level pricing spreads

### Strong chart classes

- range plots
- boxplots
- grouped bars
- split bars
- treemaps
- heatmaps
- sunbursts
- scatter plots
- pictorial bars
- funnels

### Notes

- Fridge is highly structured and supports basket/receipt/store analysis very well
- It should not dominate ideation just because it has rich structured item-level data

---

## Savings

### Primary support

Strongly supported by:
- `transactions`
- `savings_goals`
- `category_budgets`
- `user_preferences`

### Best extractable signals

- net cash by period
- balance floor / closing balance / average balance
- low-balance days
- contribution consistency
- goal funding progress
- gap between inflow and outflow
- budget-to-savings conflict
- goal realism against actual behavior

### Strong chart classes

- gauges
- bullet bars
- range plots
- boxplots
- heatmaps
- treemaps
- funnels
- pictorial bars
- dot plots
- arrow plots

### Notes

- Savings is strongly supported even without a dedicated historical “savings ledger”
- `savings_goals` now adds a real goal-oriented savings object, which opens better goal/savings cross-feature charts than before

---

## Debt

### Primary support

Debt does not currently appear to have a dedicated standalone debt table in the CORE snapshot.

Debt-like charts are still plausibly supportable through:
- `transactions`
- `categories`
- `category_budgets`
- `pockets` metadata in some cases

### Best extractable signals

- debt-payment category totals
- debt-payment timing against income timing
- debt burden vs category burden
- debt crowd-out vs savings or goals
- debt-payment volatility
- debt-payment concentration

### Confidence note

- Debt charts should be proposed carefully
- Favor debt concepts grounded in categorized transactions and payment behavior
- Avoid concepts that assume detailed loan schedules unless backed by specific `pockets.metadata` or other documented model support

### Strong chart classes

- grouped bars
- stacked bars
- split bars
- bullet bars
- range plots
- heatmaps
- scatter plots
- waterfalls

---

## Goals

### Primary support

Strongly supported by:
- `savings_goals`
- `transactions`
- `categories`

### Best extractable signals

- target vs actual funding
- allocation consistency
- goal deadline pressure
- goal realism vs actual surplus
- goal competition vs category pressure
- goal funding vs challenge participation

### Strong chart classes

- bullet bars
- gauges
- range plots
- waterfalls
- grouped bars
- arrow plots
- funnels

### Notes

- Goals now have direct schema support through `savings_goals`
- Goal charts become much stronger when compared with actual transaction-based cash behavior

---

## Pockets

### Primary support

Strongly supported by:
- `pockets`
- `pocket_transactions`
- `transactions`

### Best extractable signals

- travel spend burden
- vehicle cost burden
- housing / property cost burden
- other-pocket burden
- per-pocket spend burden
- per-pocket category burden
- per-pocket monthly load
- asset cost concentration
- vehicle vs property vs other comparisons
- financing or rent-like metadata in `pockets.metadata`
- country-linked or geography-linked views where supported

### Strong chart classes

- treemaps
- grouped bars
- stacked bars
- split bars
- dot plots
- range plots
- waterfalls
- heatmaps

### Notes

- Product reality:
  Treat Pockets as separate subdomains by default:
  - Travel
  - Vehicles
  - Housing / Properties
  - Other
- `pockets.metadata` is JSONB and can support richer charts, but any field used should be checked for documented consistency first
- Pockets are ideal for cost-of-ownership and burden-on-income charts
- Do not default to one blended "all pockets" surface unless the user explicitly asks for a cross-pocket chart

---

## Friend Rooms

### Primary support

Strongly supported by:
- `friendships`
- `friend_codes`
- `rooms`
- `room_members`
- `shared_transactions`
- `receipt_items`
- `transaction_splits`
- `transactions`

### Best extractable signals

- shared expense frequency
- room settlement pressure
- item-level split patterns
- per-room category burden
- shared vs solo behavior
- who owes / who fronts / who settles
- room-level grocery vs non-grocery mixes

### Strong chart classes

- sankeys
- grouped bars
- split bars
- treemaps
- waterfalls
- heatmaps
- funnels
- scatter plots

### Notes

- Friend Rooms has some of the strongest relational chart potential in the product
- Charts here should focus on coordination, burden-sharing, settlement pressure, and behavior distortion

---

## Challenges

### Primary support

Strongly supported by:
- `challenges`
- `challenge_participants`
- `challenge_groups`
- `challenge_group_members`
- `challenge_monthly_results`
- `users`

### Best extractable signals

- challenge participation
- leaderboard progress inside one group
- score movement by member
- challenge performance snapshots
- challenge effectiveness vs spending or saving outcomes
- consistency and competition patterns
- podium pressure
- top-3 turnover
- monthly points accumulation by member

### Strong chart classes

- grouped bars
- dot plots
- dumbbells
- heatmaps
- funnels
- radars
- parallel coordinates
- rank-style visuals

### Notes

- The challenge model supports both direct challenge participation and score-based leaderboard systems
- Product reality:
  Challenge Groups are not group-vs-group.
  They are groups of users competing inside one leaderboard for podium places based on scores.
- The schema notes say rankings expose scores rather than raw dollar amounts in some friend-facing contexts, so public/social chart ideas should respect that

---

## Cross-Domain Feasibility Summary

### Highest-confidence combinations

- Analytics × Savings
- Analytics × Goals
- Analytics × Pockets
- Fridge × Savings
- Friend Rooms × Fridge
- Friend Rooms × Analytics
- Challenges × Savings
- Challenges × Analytics
- Pockets × Debt-like transaction behavior
- Goals × Savings

### Medium-confidence combinations

- Debt × Goals
- Debt × Savings
- Pockets × Friend Rooms
- Challenges × Fridge

### Lower-confidence combinations

- Anything requiring a fully modeled debt object or amortization structure beyond categorized payment behavior
- Anything requiring undocumented historical fields inside pocket metadata

---

## Practical Rule

When in doubt:
- prefer ideas grounded in explicit tables and joins
- prefer transaction-backed debt concepts over hypothetical debt-ledger concepts
- prefer goal realism and burden charts over speculative financial-planning charts
