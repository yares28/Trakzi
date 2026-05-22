# Chart Idea Generator Prompt

Use this prompt with AI assistants or brainstorming sessions to discover new chart ideas for your financial tracking application.

---

## Context: Existing Charts — CONCEPT-LEVEL List

> [!CAUTION]
> **A chart idea is a DUPLICATE if the underlying analytical concept already exists below — regardless of chart type.**
> Changing a bar chart to a line chart, pie chart, radar chart, or any other visualization of the **same idea** is NOT a new idea.
> Example: If "spending by day of week" exists as a bar chart, do NOT suggest a heatmap/line/radar of "spending by day of week" — the concept is taken.

### Analytics Page (27 charts + 1 Advanced tab)

| # | Concept (what it answers) | Existing Chart |
|---|---------------------------|----------------|
| 1 | Cumulative income vs expenses over time | Income & Expenses Cumulative Tracking |
| 2 | Daily income vs daily expenses over time | Income & Expenses Basic/Cumulative toggle |
| 3 | AI-scored spending quality (patterns, diversity, trends) | Spending Score |
| 4 | Income-to-expenses ratio as a gauge | Cash Flow Indicator |
| 5 | Income-to-expense ratio as a donut | Income to Expense Ratio |
| 6 | Weekend vs weekday spending comparison | Weekend vs Weekday |
| 7 | Spending pace against monthly average | Monthly Budget Pace |
| 8 | Budget consumption/burndown over the month | Budget Burndown |
| 9 | Spending distributed by purchase size (small/medium/large) | Purchase Size Breakdown |
| 10 | Recurring bills vs one-time purchases split | Recurring vs One-Time |
| 11 | Category rank changes over time | Spending Category Rankings (bump) |
| 12 | Individual transactions as dots by category | Transaction History (swarm plot) |
| 13 | Money flow through stages (income → categories) | Money Flow Funnel |
| 14 | Monthly expenses by category in circular layout | Household Spend Mix (polar bar) |
| 15 | Essentials / Mandatory / Wants classification | Needs vs Wants Breakdown |
| 16 | Expense distribution across categories | Expense Breakdown (pie) |
| 17 | Hierarchical category spending breakdown | Net Worth Allocation (treemap) |
| 18 | Income flow through expenses to savings | Cash Flow Sankey |
| 19 | Category spending trends as flowing stacked areas | Category Streamgraph |
| 20 | Daily spending intensity as a calendar heatmap | Daily Transaction Activity |
| 21 | Category spending as sized/positioned bubbles | Category Bubble Map |
| 22 | Spending by day of week with category breakdown | Day of Week Spending |
| 23 | Category spending across all months | All Months Category Spending |
| 24 | Detailed category breakdown for a single month | Single Month Category Spending |
| 25 | Spending breakdown by day-of-week and category (heatmap-style) | Day of Week Category |
| 26 | Multi-axis financial health assessment | Financial Health Score (radar) |
| 27 | Category progress vs limits as concentric rings | Spending Activity Rings |
| Adv | User spending distribution vs platform average by category | Spending Pyramid |

**Also covered in Trends tab:** Per-category spending trend lines (area charts for each category individually).

### Fridge Page (18 charts)

| # | Concept (what it answers) | Existing Chart |
|---|---------------------------|----------------|
| 1 | Daily grocery totals over time | Grocery Spend Trend |
| 2 | Grocery category rank changes over time | Category Rankings (bump) |
| 3 | Grocery spending distribution across categories | Expense Breakdown (pie) |
| 4 | Protein / carbs / fats distribution | Macronutrient Breakdown |
| 5 | Percentage of purchases classified as snacks | Snack Percentage |
| 6 | Empty-calorie vs nutritious food comparison | Empty vs Nutritious Foods |
| 7 | Daily grocery spending as a calendar heatmap | Daily Grocery Activity |
| 8 | Grocery spending by category for each day of week | Day of Week Category |
| 9 | Detailed grocery category breakdown for a single month | Single Month Category |
| 10 | Grocery category spending across all months | All Months Category |
| 11 | Grocery spending grouped by day of week and category | Day of Week Spending |
| 12 | Shopping activity by hour of day | Time of Day Shopping |
| 13 | Home cooking (grocery) vs eating out (restaurant) | Grocery vs Restaurant |
| 14 | Individual receipt line items as dots | Transaction History (swarm) |
| 15 | Small vs large grocery purchase patterns | Purchase Size Comparison |
| 16 | Shopping activity by hour and day of week | Shopping Heatmap (Hours/Days) |
| 17 | Shopping activity by day and month | Shopping Heatmap (Days/Months) |
| 18 | Hierarchical grocery spending by category | Grocery TreeMap |

### Savings Page (2 charts)

| # | Concept (what it answers) | Existing Chart |
|---|---------------------------|----------------|
| 1 | Cumulative savings over time with moving averages | Savings Accumulation |
| 2 | Mortgage principal/interest/taxes breakdown over loan life | Mortgage Amortization Schedule |

### Summary of ALL Covered Concepts (47 charts total)

These analytical concepts are **OFF-LIMITS** — do not re-suggest them in any visualization form:

- Income vs expenses (cumulative, daily, ratio, gauge, flow)
- Category breakdowns (pie, treemap, polar bar, bubble, streamgraph, bump rankings, rings)
- Category spending by month (all months, single month)
- Day-of-week spending patterns (bar, heatmap, by category)
- Calendar heatmaps of daily activity
- Budget tracking (pace, burndown)
- Purchase size distribution (small/medium/large)
- Recurring vs one-time spending
- Needs vs wants classification
- Financial health radar/score
- Sankey/funnel money flow
- Transaction scatter/swarm plots
- Per-category trend lines
- User vs platform spending comparison
- Grocery category breakdowns (by time, by month, by day)
- Macronutrient / snack / empty-vs-nutritious analysis
- Time-of-day and hour/day shopping heatmaps
- Grocery vs restaurant comparison
- Savings accumulation over time
- Mortgage amortization

---

## Prompt for Discovering New Chart Ideas

**You are a financial data visualization expert and market researcher. Help me discover innovative chart ideas for a personal finance tracking application that:**

### CRITICAL REQUIREMENTS:

1. **MUST NOT DUPLICATE ANY EXISTING CONCEPT** - Ideas must NOT overlap with any of the 47 existing charts:
   - Analytics page (27 charts + 1 Advanced + Trends tab)
   - Fridge page (18 charts)
   - Savings page (2 charts)

   **Review the concept-level chart list above carefully.**

   > **"Different chart type" ≠ "new idea."** If we already track "spending by day of week," do NOT suggest a radar/line/heatmap of the same concept. The ANALYTICAL QUESTION must be novel, not just the visualization format.

2. **Quality Standards** - Ideas must be:
   - **ORIGINAL** - Unique, not generic or commonly found in finance apps
   - **NICHE** - Address specific, underserved use cases
   - **USEFUL** - Provide actionable insights that drive behavior change
   - **IN DEMAND** - Based on real user needs and sentiment research

3. **Deep Sentiment Research Required** - Before suggesting ideas:
   - Research what people actually want to see in their spending/income/grocery data
   - Analyze Reddit threads, forums, and user feedback on personal finance apps
   - Identify pain points and "I wish I could see..." statements
   - Consider what insights would genuinely surprise and help users
   - Think about what would make users say "I didn't know I needed this!"

4. **Think Outside the Box** - Ideas must be:
   - **INTERESTING** - Capture attention and curiosity
   - **EYE-CATCHING** - Visually compelling and memorable
   - **NOVEL** - Use creative visualization approaches
   - **STORYTELLING** - Tell a story about the user's financial behavior
   - **UNEXPECTED** - Reveal insights users didn't know existed

5. **Page-Specific Organization** - Separate all ideas by target page:
   - **Analytics Page** - For general spending/income analysis
   - **Savings Page** - For savings, goals, and financial planning
   - **Fridge Page** - For grocery/receipt-specific insights

6. **CROSS-FEATURE SYNTHESIS (HIGH PRIORITY)** - The best chart ideas **unite multiple features** that currently exist in isolation. The app has many powerful systems — transactions, receipts/groceries, pockets (vehicles/properties), challenges/leaderboards, shared expenses/rooms, savings, budgets, merchant intelligence — but no charts that show how they interact. **Prioritize ideas that combine 2+ feature domains into a single insight.**

   Think about connections like:
   - **Pockets × Transactions** — How does vehicle/property ownership affect overall spending patterns? What % of income goes to asset costs?
   - **Challenges × Savings** — How does participating in spending challenges correlate with savings growth?
   - **Shared Expenses × Categories** — What categories dominate group spending vs solo spending? How does splitting costs change your net category breakdown?
   - **Groceries × Budgets** — How does grocery spending interact with overall category budget utilization?
   - **Pockets × Savings** — What's the real cost of ownership vs projected savings impact?
   - **Challenges × Social** — How do leaderboard rankings relate to actual financial outcomes?
   - **Merchants × Time × Categories** — How do your top merchants shift across seasons or life events?
   - **Rooms × Receipts** — Which grocery items are most commonly split? What's the per-person cost breakdown for shared meals?
   - **Geography × Categories** — How does spending behavior differ by country?
   - **Any other non-obvious combination** that reveals an insight no single feature can show alone

   > The goal: make users realize "my car costs me X% of my income" or "I save more in months when I'm active in challenges" or "splitting groceries saves me Y/month" — insights that only emerge when features talk to each other.

### Available Data (Verified Against Database Schema):

#### **Transactions Table** (`transactions`):
- `id` - Transaction ID
- `user_id` - User identifier
- `statement_id` - Links to uploaded statement file
- `tx_date` (date) - Transaction date
- `tx_time` (time) - Transaction time (from CSV import, nullable)
- `description` (text) - Transaction description/merchant name
- `simplified_description` (varchar, nullable) - Simplified merchant/label (AI-generated)
- `amount` (numeric) - Transaction amount (positive = income, negative = expense)
- `balance` (numeric, nullable) - Account balance after transaction
- `category_id` - References categories table
- `currency` (default: 'EUR') - Currency code
- `country_name` (text, nullable) - Country for world map tracking (must match GeoJSON properties.name)
- `raw_csv_row` (jsonb, nullable) - Original CSV row data (can contain additional fields)
- `created_at`, `updated_at` - Timestamps

#### **Receipts Table** (`receipts`):
- `id` - Receipt ID
- `user_id` - User identifier
- `receipt_file_id` - Links to uploaded receipt file
- `store_name` (text, nullable) - Store name from receipt
- `receipt_date` (date, nullable) - Receipt date
- `receipt_time` (time, nullable) - Receipt time
- `total_amount` (numeric, nullable) - Total receipt amount
- `currency` (default: 'EUR') - Currency code
- `status` - processing, completed, failed
- `ai_extraction_data` (jsonb, nullable) - AI extraction metadata
- `created_at`, `updated_at` - Timestamps

#### **Receipt Transactions Table** (`receipt_transactions`):
- `id` - Line item ID
- `receipt_id` - Links to receipt
- `user_id` - User identifier (denormalized)
- `description` (text) - Item description
- `quantity` (numeric, default: 1) - Item quantity
- `price_per_unit` (numeric, nullable) - Price per unit
- `total_price` (numeric) - Total price for line item
- `category_id` - References receipt_categories
- `category_type_id` - References receipt_category_types (macronutrients)
- `receipt_date` (date, nullable) - Denormalized receipt date
- `receipt_time` (time, nullable) - Denormalized receipt time
- `created_at`, `updated_at` - Timestamps

#### **Categories** (`categories` - for transactions):
- `id`, `user_id`, `name`, `color`, `icon`, `is_default`, `broad_type` (nullable)
- User-defined transaction categories (41 defaults)

#### **Receipt Categories** (`receipt_categories` - for groceries):
- `id`, `user_id`, `type_id`, `name`, `color`, `broad_type` ('Drinks', 'Food', 'Other'), `is_default`
- Food categories (62 defaults: 38 Food, 9 Drinks, 15 Other)

#### **Receipt Category Types** (`receipt_category_types`):
- `id`, `user_id`, `name`, `color`, `is_default`
- Macronutrient types (Protein, Carbs, Fat, Mixed, None, Other)

#### **Category Budgets** (`category_budgets`):
- `id`, `user_id`, `category_id`, `scope` (default: 'analytics'), `budget` (numeric)
- User-defined budgets per category

#### **Transaction Category Preferences** (`transaction_category_preferences`):
- `id`, `user_id`, `description_key`, `example_description`, `category_id`, `use_count`, `last_used_at`
- User preferences for auto-categorizing transactions

#### **Receipt Item Category Preferences** (`receipt_item_category_preferences`):
- `id`, `user_id`, `store_key`, `description_key`, `category_id`, `use_count`
- User preferences for categorizing receipt items by store

#### **Statements** (`statements`):
- `id`, `user_id`, `file_name`, `status`, `row_count`, `imported_count`
- Tracks uploaded bank statement files

#### **Pockets** (`pockets` - vehicles, properties, other assets):
- `id`, `user_id`, `type` ('vehicle' | 'property' | 'other'), `name`, `svg_path`
- `metadata` (jsonb) - Type-specific data:
  - **Vehicle**: brand, vehicleType, year, priceBought, licensePlate, fuelType, tankSizeL, financing, nextMaintenanceDate
  - **Owned Property**: propertyType, estimatedValue, mortgage (originalAmount, interestRate, loanYears, yearsPaid)
  - **Rented Property**: propertyType, monthlyRent
- `created_at`, `updated_at`

#### **Pocket Transactions** (`pocket_transactions` - transactions linked to pockets):
- `id`, `pocket_id`, `transaction_id`, `user_id`, `tab`, `created_at`
- `tab` values: 'fuel', 'maintenance', 'insurance', 'certificate', 'financing', 'parking', 'mortgage', 'taxes', 'rent', 'utilities', 'deposit', 'fees', 'general'
- Links transactions to specific asset cost categories

#### **Friendships** (`friendships`):
- `id`, `requester_id`, `addressee_id`, `status` ('pending' | 'accepted' | 'declined' | 'blocked')
- Bidirectional friend relationships

#### **Rooms** (`rooms` - shared expense rooms):
- `id`, `name`, `created_by`, `invite_code`, `description`, `currency`, `is_archived`
- Group expense splitting rooms

#### **Shared Transactions** (`shared_transactions`):
- `id`, `room_id`, `friendship_id`, `uploaded_by`, `original_tx_id`
- `total_amount`, `currency`, `description`, `category`, `transaction_date`
- `split_type` ('equal' | 'percentage' | 'custom' | 'item_level'), `metadata` (jsonb)
- Expenses shared in rooms or between friends

#### **Transaction Splits** (`transaction_splits`):
- `id`, `shared_tx_id`, `item_id`, `user_id`, `amount`, `status` ('pending' | 'settled'), `settled_at`
- Individual split amounts owed per user per shared transaction

#### **Challenges** (`challenges` - spending challenges):
- `id`, `created_by`, `title`, `category`, `goal_type` ('individual_cap' | 'group_total')
- `target_amount`, `starts_at`, `ends_at`
- Time-boxed category spending challenges between friends

#### **Challenge Participants** (`challenge_participants`):
- `challenge_id`, `user_id`, `joined_at`, `current_spend` (cached spending aggregate)

#### **Challenge Groups** (`challenge_groups` - leaderboard groups):
- `id`, `name`, `created_by`, `invite_code`, `metrics` (text[]), `is_public`
- Score-based monthly metric competitions (e.g., savingsRate, financialHealth)

#### **Challenge Group Members** (`challenge_group_members`):
- `group_id`, `user_id`, `joined_at`, `total_points` (accumulated all-time)

#### **Challenge Monthly Results** (`challenge_monthly_results`):
- `id`, `group_id`, `user_id`, `month`, `metric`, `score`, `points` (3=1st, 2=2nd, 1=3rd)

#### **Transaction Wallet** (`transaction_wallet`):
- `user_id` (PK), `base_capacity`, `monthly_bonus_earned`, `purchased_capacity`, `monthly_used`, `monthly_period_start`
- Per-user transaction capacity tracking (wallet model)

#### **Subscriptions** (`subscriptions`):
- `id`, `user_id`, `plan` ('free' | 'pro' | 'max'), `status`, `stripe_customer_id`
- `current_period_end`, `cancel_at_period_end`, `is_lifetime`, `pending_plan`

#### **Derived/Calculable Data**:
- Day of week (from `tx_date` or `receipt_date`)
- Month, year (from dates)
- Hour (from `tx_time` or `receipt_time`)
- Time between transactions (purchase intervals)
- Spending velocity (rate of spending)
- Category relationships (through category hierarchies)
- Budget vs actual spending (using `category_budgets`)
- Unit prices (from `price_per_unit` or `total_price / quantity`)
- Store preferences (from `store_name` frequency)
- Categorization patterns (from preferences tables)
- Country-level spending geography (from `country_name`)
- Merchant normalization (from `simplified_description`)
- Asset cost breakdowns (from `pocket_transactions.tab`)
- Vehicle total cost of ownership (fuel + maintenance + insurance + financing from pocket_transactions)
- Property cost tracking (mortgage + taxes + utilities from pocket_transactions)
- Split expense balances (from `transaction_splits` settled vs pending)
- Challenge progress (participant `current_spend` vs challenge `target_amount`)
- Leaderboard rankings (from `challenge_monthly_results`)

#### **Data NOT Available** (Do NOT suggest charts requiring these):
- ❌ Precise geographic location data (no lat/long or addresses — only `country_name` text field exists)
- ❌ Payment method details (no credit card vs debit vs cash distinction)
- ❌ Merchant category codes (MCC) - only custom categories available
- ❌ Account type information (checking vs savings vs credit)
- ❌ Interest rates or investment returns (except mortgage data in pocket metadata)
- ❌ Stock prices or market data
- ❌ Receipt images (only metadata stored, images in `user_files` but not easily queryable)
- ❌ Nutritional information beyond macronutrient categories (no calories, vitamins, etc.)
- ❌ Brand names (only item descriptions available)
- ❌ Product barcodes or SKUs
- ❌ Weather data or external events
- ❌ Recurring transaction detection (no automatic subscription detection)
- ❌ Bank account numbers or account names

### Unexplored Areas to Consider:

### A. Predictive & Forecasting Charts
- What future spending patterns can we predict?
- How can we forecast savings goals?
- What seasonal trends exist that aren't visualized?
- How can we show "if current trends continue" scenarios?

### B. Comparative & Benchmarking Charts
- How does spending compare to previous periods (year-over-year, quarter-over-quarter)?
- What are spending benchmarks vs. averages or goals?
- How do categories compare to each other in growth rates?
- What's the variance/deviation from typical spending?

### C. Behavioral & Pattern Analysis
- What are spending streaks or habits?
- How can we visualize spending velocity (rate of spending)?
- What are the gaps between purchases (purchase intervals)?
- How can we show spending consistency vs. variability?

### D. Goal-Oriented & Progress Charts
- How can we visualize progress toward multiple savings goals?
- What's the burn rate toward budget limits?
- How can we show debt payoff progress?
- What are milestone achievements and celebrations?

### E. Relationship & Correlation Charts
- How do categories correlate with each other?
- What's the relationship between income and spending patterns?
- How do shopping times relate to spending amounts?
- What patterns exist between store types and purchase sizes?

### F. Efficiency & Optimization Charts
- How can we show cost per unit trends (for groceries)?
- What's the price comparison across stores?
- How can we visualize waste or unused purchases?
- What are the most/least efficient spending categories?

### G. Anomaly & Alert Charts
- How can we highlight unusual spending patterns?
- What are spending spikes or anomalies?
- How can we show budget overruns visually?
- What are the biggest changes from normal patterns?

### H. Multi-Dimensional Analysis
- How can we combine time + category + amount in new ways?
- What 3D or multi-axis visualizations would be useful?
- How can we show relationships between multiple variables?
- What parallel coordinate or radar charts would add value?

### I. Social & Contextual Charts
- How can we show spending in context of events (holidays, paydays)?
- What are spending patterns around paydays?
- How can we visualize spending before/after major purchases?
- What are the patterns during special occasions?

### J. Advanced Savings & Investment
- How can we show compound interest visualization?
- What's the savings rate trend over time?
- How can we visualize different savings buckets/goals?
- What's the opportunity cost of spending vs. saving?

### K. Merchant & Location Analysis
- What are spending patterns by merchant/store?
- How can we visualize country-level spending using `country_name`?
- What are the most frequented stores?
- How does spending vary by store type?

### L. Receipt-Specific Advanced Analysis
- How can we show unit price trends over time?
- What's the price elasticity visualization (quantity vs. price)?
- How can we visualize item description patterns?
- What are the purchase size distributions?

### M. Asset & Pocket Analysis (NEW DATA)
- How can we visualize total cost of ownership for vehicles (fuel + maintenance + insurance + financing)?
- What are property cost trends over time (mortgage + taxes + utilities)?
- How do asset costs compare across different pockets?
- What's the spending breakdown by pocket tab (fuel vs maintenance vs insurance)?
- How can we show vehicle fuel efficiency trends?
- What's the lifetime cost timeline for each owned asset?

### N. Social & Shared Expense Charts (NEW DATA)
- How can we visualize split expense balances (who owes whom)?
- What's the settlement rate for shared transactions (pending vs settled)?
- How do room expenses trend over time?
- What categories are most commonly split?
- How can we show contribution fairness across room members?

### O. Challenge & Gamification Charts (NEW DATA)
- How can we visualize challenge progress vs target?
- What's the leaderboard ranking trend over months?
- How do challenge group members compare on different metrics?
- What's the points accumulation timeline?
- How can we show spending challenge streaks?

### P. Merchant Intelligence (NEW DATA)
- How can we use `simplified_description` to group merchants?
- What are spending patterns by normalized merchant name?
- How does spending per merchant change over time?
- What merchants dominate each category?

---

## Specific Questions to Ask

1. **What insights would help users make better financial decisions that aren't currently visible?**

2. **What patterns exist in the data that require novel visualizations to reveal?**

3. **What questions do users frequently ask that current charts don't answer?**

4. **What financial metrics or KPIs are important but not visualized?**

5. **How can we make abstract financial concepts more tangible through visualization?**

6. **What comparative views would help users understand their spending better?**

7. **What predictive or "what-if" scenarios would be valuable?**

8. **How can we visualize financial health beyond just numbers?**

9. **What story-telling visualizations would help users understand their financial journey?**

10. **What interactive or drill-down visualizations would add depth?**

---

## Chart Type Suggestions to Explore

- **Gauge/Progress Charts** - For goals and budgets
- **Waterfall Charts** - For showing incremental changes
- **Candlestick Charts** - For showing spending ranges (high/low/avg)
- **Violin Plots** - For distribution analysis
- **Network Graphs** - For showing relationships between categories/merchants
- **Sunburst Charts** - For hierarchical category breakdowns
- **Radar/Spider Charts** - For multi-dimensional category comparison
- **Gantt Charts** - For timeline-based goal tracking
- **Box Plots** - For spending distribution analysis
- **Correlation Matrices** - For finding relationships
- **Slope Charts** - For showing changes between periods
- **Alluvial Diagrams** - For showing flow between categories over time
- **Marimekko Charts** - For two-dimensional category analysis
- **Bullet Charts** - For comparing performance to targets

---

## Example Prompt for AI Assistant

```
I'm building a personal finance app with comprehensive transaction and receipt data.
I already have 47 charts covering these ANALYTICAL CONCEPTS (not just chart types):

ANALYTICS PAGE (27 charts + 1 Advanced + Trends tab):
- Cumulative & daily income vs expenses tracking
- AI spending score, cash flow gauge, income-to-expense ratio donut
- Weekend vs weekday spending comparison
- Monthly budget pace & budget burndown
- Purchase size distribution (small/medium/large)
- Recurring vs one-time spending split
- Category rank changes over time (bump chart)
- Individual transactions as dots (swarm plot)
- Money flow funnel & sankey (income → categories → savings)
- Category breakdowns (pie, treemap, polar bar, bubble, streamgraph, activity rings)
- Needs/Wants/Essentials classification
- Calendar heatmap of daily spending
- Day-of-week spending by category
- All-months & single-month category spending
- Financial health radar score
- Per-category individual trend lines
- User vs platform spending comparison (pyramid)

SAVINGS PAGE (2 charts):
- Cumulative savings over time with moving averages
- Mortgage amortization schedule (principal/interest/taxes)

FRIDGE PAGE (18 charts):
- Daily grocery spend trends
- Grocery category rank changes, breakdowns (pie, treemap)
- Macronutrient (protein/carbs/fats) distribution
- Snack percentage & empty-calorie vs nutritious comparison
- Calendar heatmap of grocery spending
- Day-of-week grocery spending by category
- All-months & single-month grocery category spending
- Time-of-day shopping activity
- Hour/day & day/month shopping heatmaps
- Grocery vs restaurant comparison
- Receipt line items swarm plot
- Small vs large purchase patterns

CRITICAL REQUIREMENTS - Generate ideas that:

1. DO NOT duplicate any existing CONCEPT (changing chart type does NOT make it new — if "spending by day of week" exists as a bar chart, a radar/line/heatmap of the same concept is still a duplicate)

2. Are ORIGINAL, NICHE, USEFUL, and IN DEMAND:
   - Original: Unique, not generic finance app features
   - Niche: Address specific underserved use cases
   - Useful: Provide actionable insights that drive behavior change
   - In Demand: Based on real user needs and sentiment

3. PRIORITIZE CROSS-FEATURE IDEAS that unite 2+ systems:
   - The app has: transactions, receipts/groceries, pockets (vehicles/properties),
     challenges/leaderboards, shared expenses/rooms, savings, budgets, merchants
   - These features currently have NO charts connecting them
   - Example: "What % of income goes to asset costs (pocket transactions) vs savings?"
   - Example: "Do months with active challenges correlate with better savings?"
   - Example: "How does splitting groceries in rooms affect your food budget?"
   - The best ideas reveal insights that only emerge when features talk to each other

4. Based on DEEP SENTIMENT RESEARCH:
   - Research what people actually want to see in spending/income/grocery data
   - Analyze Reddit threads (r/personalfinance, r/Frugal, r/EatCheapAndHealthy)
   - Review user feedback on apps like Mint, YNAB, Copilot, PocketGuard
   - Identify "I wish I could see..." pain points
   - Find insights that would genuinely surprise and help users

5. Think OUTSIDE THE BOX:
   - Interesting and eye-catching visualizations
   - Novel approaches that catch attention
   - Storytelling that reveals unexpected patterns
   - Creative ways to visualize financial behavior

6. SEPARATE BY PAGE - Organize ideas into:
   - ANALYTICS PAGE ideas (general spending/income)
   - SAVINGS PAGE ideas (savings, goals, planning)
   - FRIDGE PAGE ideas (grocery/receipt-specific)

Generate 50 innovative chart ideas (spread across pages) that meet ALL requirements above.

For each idea, provide:
- Chart name and type
- Target page (Analytics/Savings/Fridge)
- **The NEW analytical question it answers** (must differ from all 47 existing concepts)
- **Features combined** — which app systems does this unite? (e.g., "Pockets × Transactions × Savings" or "Single-feature: Groceries"). Cross-feature ideas are preferred.
- Why it's original/niche/useful/in-demand
- Sentiment research backing (what users actually want)
- What makes it interesting/eye-catching
- Key insights it reveals
- **Specific data fields used** (reference the database schema above, e.g., `transactions.tx_time`, `receipt_transactions.quantity`, `category_budgets.budget`)
- **Data calculations required** (e.g., "Calculate unit price from total_price/quantity", "Derive day of week from tx_date")
- User value/actionability
- **Duplicate check** — explicitly confirm which of the 47 existing concepts this does NOT overlap with, and why
- **Data availability confirmation** - Verify all required fields exist in the schema
```

---

## Evaluation Criteria for New Chart Ideas

When evaluating new chart ideas, they MUST pass ALL criteria:

### Mandatory Requirements:

1. **Non-Duplicate** - The ANALYTICAL CONCEPT does NOT exist in Analytics (28), Savings (2), or Fridge (18) pages — regardless of chart type
2. **Original** - Unique approach not found in typical finance apps
3. **Niche** - Addresses specific, underserved use case
4. **Useful** - Provides actionable insights that drive behavior change
5. **In Demand** - Based on real user sentiment and needs (with research backing)
6. **Interesting** - Eye-catching and captures attention
7. **Page-Specific** - Clearly belongs to Analytics, Savings, or Fridge page

### Additional Considerations:

8. **Cross-Feature Synthesis** - Does it combine 2+ feature domains? (Strongly preferred — single-feature ideas should be exceptional to qualify)
9. **Actionability** - Can users take action based on the insights?
10. **Data Availability** - Do we have the necessary data to build it?
11. **User Value** - Does it solve a real user problem or answer an important question?
12. **Visual Appeal** - Is it engaging and easy to understand?
13. **Performance** - Can it be rendered efficiently with available data?
14. **Interactivity** - Does it benefit from user interaction (filtering, drilling down)?
15. **Mobile Friendly** - Will it work well on mobile devices?
16. **Storytelling** - Does it tell a compelling story about financial behavior?

---

## Research Resources for Sentiment Analysis

Before generating ideas, research these sources to understand what users actually want:

### Reddit Communities:
- r/personalfinance - "What do you wish your budget app showed?"
- r/Frugal - "What spending insights help you save money?"
- r/EatCheapAndHealthy - "What grocery data would help you budget better?"
- r/ynab - "What charts/insights do you wish YNAB had?"
- r/mintuit - "What features are missing from Mint?"

### App Store Reviews:
- Review Mint, YNAB, Copilot, PocketGuard, Goodbudget reviews
- Look for "I wish..." and "It would be great if..." statements
- Identify common feature requests and pain points

### Finance Forums & Blogs:
- Bogleheads forum discussions on budgeting tools
- Personal finance blog comments sections
- Twitter/X discussions about budgeting apps

### User Research Questions to Answer:
- What insights do people struggle to find in their spending?
- What "aha moments" do users want to discover?
- What would make someone say "I didn't know I needed this!"
- What patterns do users suspect but can't verify?
- What would help users make better financial decisions?

## Next Steps

1. **Research Phase** - Conduct sentiment research using resources above
2. **Use the enhanced prompt** with an AI assistant to generate ideas
3. **Verify non-duplication** - Cross-reference the ANALYTICAL CONCEPT against all 47 existing charts (same idea in different chart type = duplicate)
4. **Evaluate against criteria** - Ensure ideas meet all mandatory requirements
5. **Organize by page** - Separate into Analytics/Savings/Fridge categories
6. **Prioritize** - Rank ideas by originality, demand, and visual appeal
7. **Prototype** - Build promising ideas in test-charts section
8. **User Testing** - Gather feedback before adding to main pages

