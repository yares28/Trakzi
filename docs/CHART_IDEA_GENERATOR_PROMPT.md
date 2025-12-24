# Chart Idea Generator Prompt

Use this prompt with AI assistants or brainstorming sessions to discover new chart ideas for your financial tracking application.

---

## Context: Existing Charts

### Analytics Page (17 charts)
- Income/Expenses tracking (area charts)
- Category rankings over time (area bump)
- Transaction history (swarm plot)
- Money flow (funnel, sankey)
- Category breakdowns (pie, treemap, polar bar)
- Needs vs Wants classification
- Time-based analysis (day of week, monthly, daily calendar)
- Streamgraph, bubble maps

### Fridge Page (23 charts)
- Grocery spend trends
- Category rankings and breakdowns
- Time analysis (day of week, time of day, heatmaps)
- Shopping patterns (frequency, size comparisons)
- Nutritional analysis (macronutrients, snacks, empty vs nutritious)
- Store comparisons (grocery vs restaurant)

### Savings Page (1 chart)
- Savings accumulation over time

---

## Prompt for Discovering New Chart Ideas

**You are a financial data visualization expert and market researcher. Help me discover innovative chart ideas for a personal finance tracking application that:**

### CRITICAL REQUIREMENTS:

1. **MUST NOT EXIST** - Ideas must NOT already be implemented in:
   - Analytics page (17 existing charts)
   - Savings page (1 existing chart)
   - Fridge page (23 existing charts)
   
   **Review the existing charts above carefully to avoid duplicates.**

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

### Available Data (Verified Against Database Schema):

#### **Transactions Table** (`transactions`):
- `id` - Transaction ID
- `user_id` - User identifier
- `statement_id` - Links to uploaded statement file
- `tx_date` (date) - Transaction date
- `tx_time` (time) - Transaction time (from CSV import, nullable)
- `description` (text) - Transaction description/merchant name
- `amount` (numeric) - Transaction amount (positive = income, negative = expense)
- `balance` (numeric, nullable) - Account balance after transaction
- `category_id` - References categories table
- `currency` (default: 'EUR') - Currency code
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
- `id`, `user_id`, `name`, `color`, `icon`, `is_default`
- User-defined transaction categories

#### **Receipt Categories** (`receipt_categories` - for groceries):
- `id`, `user_id`, `type_id`, `name`, `color`, `broad_type` ('Drinks', 'Food', 'Other'), `is_default`
- Food categories (Fruits, Vegetables, Meat, Dairy, etc.)

#### **Receipt Category Types** (`receipt_category_types`):
- `id`, `user_id`, `name`, `color`, `is_default`
- Macronutrient types (Protein, Carbs, Fat, Fiber, Vitamins/Minerals)

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

#### **Data NOT Available** (Do NOT suggest charts requiring these):
- ❌ Geographic location data (no lat/long, addresses, or location fields)
- ❌ Payment method details (no credit card vs debit vs cash distinction)
- ❌ Merchant category codes (MCC) - only custom categories available
- ❌ Account type information (checking vs savings vs credit)
- ❌ Interest rates or investment returns
- ❌ Stock prices or market data
- ❌ Receipt images (only metadata stored, images in `user_files` but not easily queryable)
- ❌ Nutritional information beyond macronutrient categories (no calories, vitamins, etc.)
- ❌ Brand names (only item descriptions available)
- ❌ Product barcodes or SKUs
- ❌ Weather data or external events
- ❌ Social media or sharing features
- ❌ Multi-user/household data (single user_id per transaction)
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
- How can we visualize geographic spending (if location data exists)?
- What are the most frequented stores?
- How does spending vary by store type?

### L. Receipt-Specific Advanced Analysis
- How can we show unit price trends over time?
- What's the price elasticity visualization (quantity vs. price)?
- How can we visualize brand preferences?
- What are the purchase size distributions?

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
I already have 41 charts covering:

ANALYTICS PAGE (17 charts):
- Income/Expenses tracking, category rankings, transaction history, money flow, 
  category breakdowns, needs vs wants, time-based analysis, streamgraph, bubble maps

SAVINGS PAGE (1 chart):
- Savings accumulation over time

FRIDGE PAGE (23 charts):
- Grocery spend trends, category rankings, time analysis, shopping patterns, 
  nutritional analysis, store comparisons

CRITICAL REQUIREMENTS - Generate ideas that:

1. DO NOT already exist in any of the above pages (carefully review to avoid duplicates)

2. Are ORIGINAL, NICHE, USEFUL, and IN DEMAND:
   - Original: Unique, not generic finance app features
   - Niche: Address specific underserved use cases
   - Useful: Provide actionable insights that drive behavior change
   - In Demand: Based on real user needs and sentiment

3. Based on DEEP SENTIMENT RESEARCH:
   - Research what people actually want to see in spending/income/grocery data
   - Analyze Reddit threads (r/personalfinance, r/Frugal, r/EatCheapAndHealthy)
   - Review user feedback on apps like Mint, YNAB, Copilot, PocketGuard
   - Identify "I wish I could see..." pain points
   - Find insights that would genuinely surprise and help users

4. Think OUTSIDE THE BOX:
   - Interesting and eye-catching visualizations
   - Novel approaches that catch attention
   - Storytelling that reveals unexpected patterns
   - Creative ways to visualize financial behavior

5. SEPARATE BY PAGE - Organize ideas into:
   - ANALYTICS PAGE ideas (general spending/income)
   - SAVINGS PAGE ideas (savings, goals, planning)
   - FRIDGE PAGE ideas (grocery/receipt-specific)

Generate 50 innovative chart ideas (5-7 per page) that meet ALL requirements above.

For each idea, provide:
- Chart name and type
- Target page (Analytics/Savings/Fridge)
- Why it's original/niche/useful/in-demand
- Sentiment research backing (what users actually want)
- What makes it interesting/eye-catching
- Key insights it reveals
- **Specific data fields used** (reference the database schema above, e.g., `transactions.tx_time`, `receipt_transactions.quantity`, `category_budgets.budget`)
- **Data calculations required** (e.g., "Calculate unit price from total_price/quantity", "Derive day of week from tx_date")
- User value/actionability
- Why it doesn't duplicate existing charts
- **Data availability confirmation** - Verify all required fields exist in the schema
```

---

## Evaluation Criteria for New Chart Ideas

When evaluating new chart ideas, they MUST pass ALL criteria:

### Mandatory Requirements:

1. **Non-Duplicate** - Does NOT exist in Analytics (17), Savings (1), or Fridge (23) pages
2. **Original** - Unique approach not found in typical finance apps
3. **Niche** - Addresses specific, underserved use case
4. **Useful** - Provides actionable insights that drive behavior change
5. **In Demand** - Based on real user sentiment and needs (with research backing)
6. **Interesting** - Eye-catching and captures attention
7. **Page-Specific** - Clearly belongs to Analytics, Savings, or Fridge page

### Additional Considerations:

8. **Actionability** - Can users take action based on the insights?
9. **Data Availability** - Do we have the necessary data to build it?
10. **User Value** - Does it solve a real user problem or answer an important question?
11. **Visual Appeal** - Is it engaging and easy to understand?
12. **Performance** - Can it be rendered efficiently with available data?
13. **Interactivity** - Does it benefit from user interaction (filtering, drilling down)?
14. **Mobile Friendly** - Will it work well on mobile devices?
15. **Storytelling** - Does it tell a compelling story about financial behavior?

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
3. **Verify non-duplication** - Cross-reference against existing 41 charts
4. **Evaluate against criteria** - Ensure ideas meet all mandatory requirements
5. **Organize by page** - Separate into Analytics/Savings/Fridge categories
6. **Prioritize** - Rank ideas by originality, demand, and visual appeal
7. **Prototype** - Build promising ideas in test-charts section
8. **User Testing** - Gather feedback before adding to main pages

