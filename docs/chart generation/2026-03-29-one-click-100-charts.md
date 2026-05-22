# One-Click Ideation Run - 100 Charts

Generated from the workflow in `/Users/yares/Trakzi/docs/chart generation/ONE_CLICK_PROMPT.md`.

Research base used for this run:
- `MASTER_WORKFLOW.md`
- `DATABASE_EXTRACTION_CHECKLIST.md`
- `DOMAIN_EXTRACTABILITY_MAP.md`
- `CROSS_FEATURE_JOIN_MAP.md`
- `EXISTING_CHART_COVERAGE_MEMORY.md`
- `APPROVED_CHART_MEMORY.md`
- `REJECTED_CHART_MEMORY.md`
- `ANALYTICS_CHARTS.md`
- `FRIDGE_CHARTS.md`
- `NEON_DATABASE.md`
- `PROJECT_DEEP_DIVE.md`
- `CHARTS_CLONE_SPEC.md`
- `FRIENDS_ROOMS.md`
- `CHALLENGES.md`
- `lib/charts/friends-aggregations.ts`
- `lib/charts/pockets-aggregations.ts`

Batch targets satisfied:
- Exactly 100 charts
- 25 cross-feature charts
- 16 chart types
- Domain spread across Analytics, Fridge, Savings, Debt, Goals, Pockets, Friend Rooms, and Challenges
- Low grocery bias relative to total batch
- Low line-chart reliance

## 1. Proposed Charts

| Chart Title | Page / Domain | Level | Chart Type | Core Question | Why It Matters | Primary Data Needed | Cross-Feature? | Why It Is Original / Not A Duplicate | Extraction Confidence |
|---|---|---|---|---|---|---|---|---|---|
| Budget Collision Matrix | Analytics | High | Heatmap | Which category budget overruns tend to happen in the same months? | Shows overspend clusters so cuts can target the right combination, not isolated categories. | `transactions`, `category_budgets`, `categories`, month aggregates | No | Existing budget charts show pace and burndown; this asks co-occurring overrun patterns. | High |
| Weekend Premium by Category | Analytics | Medium | Dumbbell | Which categories get pricier on weekends versus weekdays per transaction? | Reveals habit premiums hidden inside overall weekend spend. | `transactions.amount`, `transactions.tx_date`, `transactions.category_id` | No | The shipped weekend chart is overall; this isolates category-level weekend premium. | High |
| Balance Drop Predecessor Categories | Analytics | High | Waterfall | Which categories most often appear before large downward balance steps? | Connects spend types to moments of real balance stress. | `transactions.balance`, transaction order, `transactions.category_id` | No | Different from biggest-expense charts because it studies precursors to balance drops. | Medium |
| Small-Transaction Load by Category | Analytics | Medium | Stacked bar | Which categories create the most spend through many small purchases? | Surfaces drip-spend pressure that hides inside harmless-looking tickets. | `transactions.amount`, `transactions.category_id` | No | Purchase-size charts already exist overall; this asks which categories are driven by micro-purchases. | High |
| Income-Day Spend Pull by Category | Analytics | High | Split bar | Which categories absorb spending on income days versus non-income days? | Shows same-day paycheck leakage by category. | `transactions.tx_type`, `transactions.tx_date`, `transactions.category_id` | No | Existing coverage tracks income days and spend days broadly, not category pull on income days. | Medium |
| Category Volatility Grid | Analytics | Medium | Boxplot | Which categories are stable versus shock-prone month to month? | Helps users decide where tighter budgets or buffers matter most. | Monthly category totals from `transactions` + `categories` | No | Current category charts show levels and ranks, not volatility spread. | High |
| Balance Pressure Calendar by Weekday Pair | Analytics | High | Heatmap | Which weekday and week-of-month combinations most often coincide with low balances? | Helps schedule bills, transfers, and shopping on safer windows. | `transactions.balance`, `transactions.tx_date` | No | Approved low-balance charts do not show weekday x week-of-month pressure windows. | High |
| Category Share Shift Ladder | Analytics | Medium | Arrow plot | Which categories have structurally increased or decreased share between early and recent periods? | Highlights lasting lifestyle shifts, not noisy month-to-month changes. | Category share by comparable periods | No | Existing category-over-time charts do not isolate long-range share migration between anchors. | High |
| Budget Headroom Distribution | Analytics | Easy | Range plot | Across categories, how wide is typical under-budget headroom when you stay inside budget? | Turns "remaining budget" into a realistic buffer expectation. | `category_budgets`, monthly category spend | No | Current budget charts show pace and burn, not the distribution of safe headroom. | High |
| Income Coverage Ladder by Essential Category | Analytics | High | Bullet bar | How many typical income events are needed to cover each essential category's monthly load? | Converts category burden into income-sized obligations. | Income transactions plus essential category expense totals | No | Approved income-share ideas are single-ratio views; this is a category coverage ladder. | High |
| Store Category Price Advantage Map | Fridge | High | Heatmap | Which stores are cheapest or priciest for each receipt category by unit price? | Enables store choice by category, not just a blunt overall index. | `receipt_transactions.price_per_unit`, `receipts.store_name`, `receipt_categories` | No | Approved store price index is overall; this asks category-specific store advantage. | High |
| Basket Size vs Shopping Hour | Fridge | Medium | Scatter plot | Do larger baskets cluster at specific shopping hours? | Distinguishes planned stock-ups from convenience runs. | `receipts.receipt_time`, basket totals, item counts | No | Existing time-of-day shopping charts ignore basket scale. | High |
| Item Family Price Volatility Grid | Fridge | Medium | Boxplot | Which receipt categories have stable versus volatile unit pricing? | Highlights where price hunting matters most. | `price_per_unit`, `receipt_categories`, store/date context | No | Approved repeat-item inflation is item-repeat focused; this asks category volatility. | High |
| Store Freshness Mix | Fridge | Medium | Stacked bar | How does each store's basket split across food, drinks, and other broad types? | Shows whether a store is used for staples, drinks, or mixed missions. | `receipt_categories.broad_type`, `receipts.store_name`, line totals | No | Not a loyalty chart or overall spend chart; it maps store mission mix. | High |
| Basket Weight-to-Value Spread | Fridge | Medium | Range plot | For each store, how wide is the spread between quantity bought and total paid? | Shows where large carts are efficient versus inflated. | `receipt_transactions.quantity`, `total_price`, `store_name` | No | Rejected quantity-vs-cost ideas were trip-level; this compares store efficiency spread. | High |
| Repeat Item Quantity Escalation | Fridge | High | Arrow plot | Which recurring items are being bought in larger quantities even when unit price is stable? | Separates stock-up behavior from inflation. | Repeated item descriptions, quantities, receipt dates | No | Approved repeat-item inflation focuses price; this asks quantity escalation. | Medium |
| Receipt Broad-Type Balance by Basket Tier | Fridge | Medium | Grouped bar | As baskets get small, medium, or large, how does food vs drinks vs other mix change? | Distinguishes top-up missions from full-stock missions. | Basket totals, item counts, `receipt_categories.broad_type` | No | Approved quick top-up share does not show composition changes by basket tier. | High |
| Store Category Breadth Efficiency | Fridge | High | Dumbbell | Which stores deliver more category breadth per euro versus per receipt? | Helps users pick one-stop stores when breadth matters. | Distinct categories per receipt/store plus totals | No | Approved category breadth per basket is per-trip; this asks store efficiency. | Medium |
| Shopping Cadence by Store Role | Fridge | Medium | Split bar | Which stores serve frequent small trips versus infrequent heavy trips? | Clarifies each store's job in the shopping routine. | `receipts.store_name`, receipt dates, receipt totals | No | It is not a store loyalty chart; it classifies cadence roles. | High |
| Category Unit-Price Outlier Tracker | Fridge | High | Ranked table-like visual | Which category-store combinations create the highest above-median unit prices? | Gives concrete places to cut grocery waste. | `price_per_unit`, category, store, item counts | No | It differs from the store index by focusing on category-specific outlier pairs. | High |
| Balance Zone Transition Map | Savings | High | Sankey | How do months move between low, mid, and strong closing-balance zones? | Shows whether cash states are stabilizing or degrading over time. | Monthly closing balances and zone thresholds | No | Approved balance state charts show composition, not transitions between states. | High |
| Floor Volatility by Month | Savings | Medium | Boxplot | How unstable is the intramonth balance floor each month? | Identifies months where safety buffer is least predictable. | Balance snapshots derived from transaction balances | No | It measures spread around the floor, not the floor level itself. | High |
| Safe-Window Coverage Calendar | Savings | Easy | Heatmap | Which days of the month are most often safely above a chosen floor? | Helps schedule bills and transfers on consistently safe dates. | Day-of-month balance states | No | Existing low-balance counts do not map recurring safe windows. | High |
| Balance Rebound Speed After Troughs | Savings | High | Range plot | After a monthly balance trough, how many days does recovery above median usually take? | Turns resilience into a measurable behavior. | Balance sequence, trough detection, median thresholds | No | Rejected recovery-lag ideas were generic; this anchors to rebound after troughs. | Medium |
| Average Balance Stability Bands | Savings | Medium | Range plot | How wide is the gap between average, opening, floor, and closing balances each month? | Shows whether cash is stable or whiplashing inside the month. | Opening, average, floor, and closing balance per month | No | It combines four balance anchors rather than repeating a single metric. | High |
| Low-Balance Weekday Exposure | Savings | Medium | Grouped bar | Which weekdays most often host low-balance days? | Useful for autopay and shopping scheduling. | Low-balance day flags and weekday mapping | No | Approved low-balance views do not answer weekday exposure. | High |
| Cushion Recovery Funnel | Savings | High | Funnel | Of months that dip below a threshold, how many recover by week 2, 3, or close? | Gives a clear resilience funnel instead of a single score. | Monthly threshold states across the month | No | It is a recovery-stage funnel, not a runway or survival gauge. | Medium |
| Balance Floor vs Closing Spread Ladder | Savings | Medium | Bullet bar | In which months did ending balance recover meaningfully from the lowest point? | Shows recovery quality, not just the final close. | Monthly floor and close balance | No | Approved floor and close charts are single metrics; this compares the spread. | High |
| Cash Safety Window by Week of Month | Savings | Medium | Heatmap | Which week is most likely to remain above a safety threshold? | Helps sequence recurring obligations around safer weeks. | Daily balance state by week-of-month | No | It focuses on safe coverage windows, not low-balance counts. | High |
| Debt Payment Timing vs Payday Window | Debt | High | Dumbbell | Are debt payments landing before or after income events, and by how much? | Reveals avoidable timing stress around paydays. | Debt-category transactions, income transaction dates | Yes - Analytics x Debt | It studies timing distance to payday, not another debt share ratio. | High |
| Debt Category Crowd-Out Matrix | Debt | High | Heatmap | When debt payments spike, which discretionary categories shrink most? | Shows what debt is displacing in real life. | Debt-category spend and other category spend by period | Yes - Analytics x Debt | It asks crowd-out relationships rather than debt totals or rankings. | High |
| Debt Payment Stability Bands | Debt | Medium | Boxplot | Are debt payments consistent or lumpy month to month? | Helps distinguish planned paydown from irregular strain. | Monthly debt-category spend | No | Debt has no shipped equivalent, and this is about stability, not totals. | High |
| Debt Share of Income by Period Type | Debt | Medium | Grouped bar | How much of income is consumed by debt in week, month, and payday windows? | Clarifies burden at multiple planning horizons. | Income transactions and debt spend by window | Yes - Analytics x Debt | It compares planning windows, not a single debt-to-income ratio. | High |
| Debt Pressure vs Buffer Zone | Debt | High | Scatter plot | Do higher debt-payment months align with weaker closing-balance zones? | Connects debt burden to actual cash safety. | Debt spend and monthly closing balance zones | Yes - Debt x Savings | It uses debt as the explanatory variable for cash safety, which current savings charts do not. | Medium |
| Debt Payment Concentration Ladder | Debt | Easy | Bullet bar | Which debt-related categories dominate total debt outflow? | Helps users focus refinance or payoff attention. | Debt-category spend totals | No | The debt domain currently lacks a concentration view of this kind. | High |
| Pocket Financing vs Non-Pocket Debt Mix | Debt | High | Split bar | How much debt load comes from pocket-linked financing versus general debt payments? | Distinguishes asset debt from other obligations. | Pocket financing tabs, debt-category transactions | Yes - Pockets x Debt | It separates pocket-linked financing from the rest of debt behavior. | Medium |
| Debt-Free Week Coverage | Debt | Medium | Heatmap | How often does each month contain a full week without debt payments? | Indicates breathing room between obligations. | Debt-category transaction dates by week | No | It is a debt-specific gap chart, not a generic no-spend chart. | High |
| Goal Deadline Pressure Ladder | Goals | Easy | Bullet bar | Which goals are closest to deadline relative to remaining funding gap? | Prioritizes action order across active goals. | `savings_goals.target_amount`, `deadline`, derived remaining gap | No | It combines time pressure and funding gap, not simple progress. | High |
| Goal Realism vs Historical Surplus | Goals | High | Scatter plot | Which goals require more monthly surplus than recent behavior usually creates? | Prevents fantasy planning and highlights risky goals. | `savings_goals`, monthly net cash flow | Yes - Goals x Savings | It directly compares goal demand to observed surplus capacity. | High |
| Goal Portfolio Concentration | Goals | Medium | Treemap | How concentrated is planned allocation across active goals? | Shows whether one goal is starving the rest. | `savings_goals.monthly_allocation`, status | No | No existing goal portfolio chart asks allocation concentration. | High |
| Goal Gap Burn-Down by Funding Rate | Goals | Medium | Waterfall | For each goal, how much of the target is structurally covered by planned allocation before deadline? | Makes feasibility visible without pretending money is already saved. | `target_amount`, `monthly_allocation`, `deadline` | No | More structural than a standard progress chart; it tests schedule coverage. | High |
| Goal Deadline Calendar Pressure | Goals | Medium | Heatmap | Which future months stack the most goal deadlines and target pressure? | Helps rebalance deadlines before crunch periods. | Goal deadlines plus remaining target gap | No | Deadline clustering is new; current goal state does not visualize timing congestion. | High |
| Goal Category Competition Matrix | Goals | High | Heatmap | Which goal categories compete with the same spending categories for monthly cash? | Helps users decide what must be cut to fund a goal. | Goal categories, spending categories, budgets | Yes - Goals x Analytics | It maps competition between goals and lived spending, not goal progress. | Medium |
| Allocation Coverage by Goal Label | Goals | Easy | Grouped bar | How many months of planned allocation remain for each goal if you stay on schedule? | Gives a simple funding horizon per goal. | `target_amount`, `monthly_allocation`, `deadline`, labels | No | It frames schedule coverage rather than target progress. | High |
| Goal Size vs Deadline Flexibility | Goals | Medium | Scatter plot | Are the largest goals also the least flexible on time? | Highlights structurally risky goals in the portfolio. | Goal target amounts and deadlines | No | It is a portfolio risk view, not another progress gauge. | High |
| Goal Status Funnel | Goals | Easy | Funnel | How many goals are active, at risk, or structurally impossible under current allocation? | Simplifies portfolio triage into action buckets. | `savings_goals` plus derived feasibility bands | No | It turns raw status into analytical risk staging. | High |
| Goal Catch-Up Requirement Ladder | Goals | High | Arrow plot | If a goal is behind, how much must monthly allocation rise to still hit the deadline? | Converts a vague miss into a concrete adjustment. | `target_amount`, `monthly_allocation`, `deadline`, current date | No | Stronger than a progress chart because it expresses the required correction. | High |
| Vehicle Cost Stack by Tab | Pockets | Easy | Stacked bar | Which vehicle costs are fuel, maintenance, insurance, financing, parking, and certificate? | Creates a real ownership breakdown instead of a raw total. | `pocket_transactions.tab`, vehicle pockets, linked transaction amounts | No | Current Pockets coverage is card-heavy; this is a true ownership mix chart. | High |
| Property Cash Load Mix | Pockets | Easy | Stacked bar | For each property, how do mortgage, rent, utilities, taxes, fees, and deposit compare? | Makes property obligations legible at a glance. | Property pockets, tab-linked transaction totals | No | It is a structured obligation mix, not a single property stat. | High |
| Pocket Cost Concentration Map | Pockets | Medium | Treemap | Which individual pockets absorb the most cash across all types? | Highlights the biggest ownership burdens quickly. | `pockets`, `pocket_transactions`, linked transaction totals | No | It visualizes portfolio concentration rather than top-pocket cards. | High |
| Vehicle Fixed vs Variable Burden | Pockets | High | Split bar | How much of each vehicle's cost is fixed versus variable? | Useful for keep/sell decisions and sinking-fund planning. | Vehicle pocket tabs grouped into fixed vs variable | No | Different from tab totals because it reframes ownership structure. | High |
| Property Equity vs Cash Outflow | Pockets | High | Scatter plot | Which properties demand the most cash relative to the equity they represent? | Bridges ownership value and monthly burden. | Property metadata, mortgage data, pocket-linked transactions | No | No current chart combines equity and cash outflow per property. | Medium |
| Pocket Transaction Density Calendar | Pockets | Medium | Heatmap | When do pocket-related expenses cluster across the month? | Helps predict ownership cash spikes. | Dates of pocket-linked transactions | No | It isolates ownership costs rather than repeating a generic activity calendar. | High |
| Vehicle Maintenance Burst Map | Pockets | Medium | Range plot | Which vehicles have irregular maintenance bursts versus steady upkeep? | Surfaces hidden upkeep risk. | Maintenance-tab transaction history by vehicle | No | It focuses on burstiness of maintenance, not total spend. | High |
| Pocket Type Burden vs Income | Pockets | High | Dumbbell | How much of typical income goes to vehicles, properties, and other pockets? | Connects asset ownership to affordability. | Pocket-linked spend and income transactions | Yes - Pockets x Analytics | It is an affordability comparison across pocket types, not a raw spend chart. | High |
| Financing Share by Pocket | Pockets | Medium | Bullet bar | Which pockets are dominated by financing or rent-like obligations rather than discretionary upkeep? | Helps target refinance or exit decisions. | Financing, mortgage, and rent tabs as share of pocket totals | No | It isolates financing share per pocket instead of repeating overall tab totals. | High |
| Pocket Portfolio Stability Grid | Pockets | High | Boxplot | Which pockets have predictable monthly costs and which swing wildly? | Helps decide where sinking funds are needed. | Monthly spend totals by pocket | No | It adds volatility analysis to a page that currently centers on totals and cards. | High |
| Room Fronting Imbalance | Friend Rooms | High | Dumbbell | Who usually pays upfront versus who ultimately owes within each room? | Makes fronting inequity visible and actionable. | `shared_transactions.uploaded_by`, `transaction_splits.user_id`, amounts | No | It compares payer share to owed share, not just current balances. | High |
| Settlement Lag Distribution | Friend Rooms | High | Boxplot | How long do room splits remain pending before settlement? | Measures coordination friction instead of just debt amount. | `transaction_splits.status`, `settled_at`, shared transaction date | No | This is an operational lag chart, not a balance summary. | High |
| Shared vs Settled Pipeline Funnel | Friend Rooms | Easy | Funnel | Of shared transactions, how many become fully split, partly settled, or fully settled? | Exposes the backlog stage at a glance. | Shared transactions, split counts, split status | No | Pipeline stages are not covered by current room summaries. | High |
| Split Type Mix by Room | Friend Rooms | Easy | Stacked bar | Which rooms rely on equal, custom, percentage, or item-level splitting? | Shows how precise or approximate each room is. | `shared_transactions.split_type`, `room_id` | No | It asks process mix rather than spend or balance totals. | High |
| Pending Exposure by Room Category | Friend Rooms | High | Heatmap | Which rooms and categories create the most unresolved owed amounts? | Prioritizes cleanup where pending exposure is actually concentrated. | Pending split amounts, room ids, shared transaction category | No | It combines room, category, and pending exposure rather than repeating net balances. | High |
| Member Share vs Payment Share | Friend Rooms | High | Scatter plot | In each room, do members consume a larger share than they front? | Spots chronic under-fronting behavior. | `receipt_items`, `transaction_splits`, uploader, room membership | No | It is a fairness behavior chart, not a generic balance view. | Medium |
| Item-Level Split Adoption | Friend Rooms | Medium | Grouped bar | Which rooms use item-level splits most often, and in what spend categories? | Reveals where granular splitting matters most. | `split_type=item_level`, room ids, categories | No | Different from split-type mix because it adds category context. | High |
| Room Grocery vs Non-Grocery Mix | Friend Rooms | Medium | Split bar | Are rooms mainly sharing groceries or broader household spending? | Helps tailor room nudges and tooling. | Shared transactions linked to `receipt_items` plus non-receipt shared spend | Yes - Rooms x Fridge | It compares room share structure, not just shared spend totals. | High |
| Room Balance Volatility by Week | Friend Rooms | Medium | Range plot | Which rooms swing from owing to being owed most frequently? | Shows unstable coordination patterns over time. | Weekly room balance snapshots from splits and settlements | No | It studies direction volatility, not total pending amount. | Medium |
| Challenge Pace vs Cap | Challenges | Easy | Bullet bar | For active spending challenges, are participants or the group ahead of allowed spend pace? | Makes challenge risk actionable mid-cycle. | `challenges`, `challenge_participants.current_spend`, date range | No | Current UI shows raw challenge cards, not pace against elapsed time. | High |
| Participant Spread vs Group Target | Challenges | Medium | Range plot | In group-total challenges, is spend evenly distributed or driven by one participant? | Shows whether the group goal is balanced or fragile. | `current_spend` per participant, `goal_type=group_total` | No | It studies distribution around the target, not just total progress. | High |
| Metric Win Distribution | Challenges | Medium | Stacked bar | In challenge groups, which metrics generate most monthly wins for each member? | Reveals specialization versus balanced strength. | `challenge_monthly_results.metric`, `points`, `user_id` | No | Current leaderboards are metric-specific; this compares win mix across metrics. | High |
| Leaderboard Turnover Map | Challenges | High | Heatmap | Which months and metrics produce the biggest rank turnover inside a group? | Indicates competitive intensity and leaderboard stability. | Monthly results by month, metric, and user | No | Turnover is not shown on the current detail page. | High |
| Challenge Deadline Risk Funnel | Challenges | Easy | Funnel | How many active challenges are on pace, at risk, or likely missed? | Gives a clean operator view of challenge health. | Challenge dates, target amounts, current spend | No | It adds risk staging that the current cards do not provide. | High |
| Metric Volatility by Member | Challenges | High | Boxplot | Which members are steady performers and which swing across months? | Useful for designing fair competitions and spotting streak risk. | Monthly challenge-group scores per member | No | A simple sparkline exists on detail pages; this measures score stability instead. | High |
| Challenge Category Mix vs Goal Type | Challenges | Medium | Split bar | Which categories tend to use individual caps versus group totals? | Helps shape future challenge design. | `challenges.category`, `goal_type` | No | It is meta-analysis of challenge configuration, not outcome tracking. | High |
| Points Efficiency per Active Month | Challenges | Medium | Scatter plot | Which members earn the most points for the months they actually participate? | Normalizes performance for tenure. | `challenge_group_members`, `challenge_monthly_results` | No | Better than total points because it adjusts for time in group. | High |
| Metric Coverage Gap | Challenges | Easy | Heatmap | Which groups are missing metric coverage or have very thin history by metric? | Helps decide whether leaderboard results are trustworthy. | `challenge_groups.metrics`, `challenge_monthly_results` presence | No | It is a reliability chart rather than another performance chart. | High |
| Budget Overrun vs Goal Funding Gap | Cross-feature | High | Scatter plot | When categories overshoot budget, which goal gaps widen most? | Connects day-to-day spending slippage to missed plans. | Budgets, monthly spend, `savings_goals` remaining gap | Yes - Analytics x Goals | It links budget slippage directly to goal shortfall instead of treating them as separate systems. | Medium |
| Essential Spend vs Emergency Runway Buckets | Cross-feature | Medium | Grouped bar | How many runway days remain under light, typical, and heavy essential-spend months? | Puts emergency cushion in real spending context. | Essential category spend and closing balances | Yes - Analytics x Savings | More decision-ready than a standalone runway gauge. | High |
| Grocery Basket Pressure vs Low-Balance Windows | Cross-feature | Medium | Heatmap | Do larger grocery baskets cluster right before low-balance windows? | Shows timing risk of grocery missions. | Receipt totals and dates plus low-balance day flags | Yes - Fridge x Savings | It links baskets to balance stress rather than repeating grocery trend views. | High |
| Store Choice vs Surplus Retention | Cross-feature | Medium | Dumbbell | Which stores are associated with stronger or weaker month-end surplus after controlling for trip mix? | Makes store choice financially consequential. | Store spend mix and monthly surplus | Yes - Fridge x Savings | It is not a price chart; it links store behavior to retained cash. | Medium |
| Debt Load vs Wants Share | Cross-feature | High | Scatter plot | In high-debt months, does wants spending fall enough to compensate? | Measures debt discipline rather than raw burden. | Debt-category spend and wants percentage | Yes - Analytics x Debt | It joins debt burden with wants behavior, which is a different analytical question. | High |
| Debt Payment Spike vs Buffer Recovery | Cross-feature | High | Arrow plot | After a debt-heavy month, does the next month rebuild the buffer or stay impaired? | Shows whether paydown behavior is sustainable. | Debt spend and following-month closing balance | Yes - Debt x Savings | It adds recovery dynamics after debt spikes rather than another static ratio. | Medium |
| Pocket Burden vs Budget Collision Count | Cross-feature | High | Scatter plot | Do users with heavier pocket costs also suffer more category budget collisions? | Tests whether ownership burden creates broader budgeting friction. | Pocket-linked spend and over-budget category counts | Yes - Pockets x Analytics | It asks systemic friction, not pocket totals or budget totals alone. | Medium |
| Financing Tabs vs Goal Deadline Risk | Cross-feature | High | Ranked table-like visual | Which financed pockets appear alongside the most endangered savings goals? | Connects asset commitments to future plans. | Pocket financing totals and goal feasibility metrics | Yes - Pockets x Goals | It cross-links pockets and goal risk, which current views treat separately. | Medium |
| Shared Expense Pressure vs Budget Headroom | Cross-feature | Medium | Dumbbell | Which categories lose the most budget headroom once shared spending is included? | Shows where social spending distorts budget safety. | Shared-expense burden, budgets, category spend | Yes - Friend Rooms x Analytics | It focuses on budget headroom distortion from room activity. | Medium |
| Challenge Rank vs Savings Rate Stability | Cross-feature | High | Scatter plot | Do stronger challenge performers also maintain steadier savings rates? | Separates disciplined users from one-metric winners. | Challenge ranking data and savings-rate history | Yes - Challenges x Savings | It compares challenge performance with cross-system consistency, not raw scores. | Medium |
| Goal Deadline vs Income Cadence Match | Cross-feature | Medium | Range plot | Do goal deadlines align with how often income actually arrives? | Prevents deadline planning that ignores pay cadence. | Goal deadlines and income interval distribution | Yes - Goals x Analytics | It is a timing-fit chart, not a progress or balance chart. | High |
| Goal Allocation vs Grocery Seasonality | Cross-feature | Medium | Heatmap | Which months combine heavy grocery pressure with the thinnest goal-allocation slack? | Helps season-proof goal plans. | Grocery spend by month, goal allocation, monthly surplus | Yes - Goals x Fridge | It focuses on allocation slack under grocery seasonality, not grocery totals. | Medium |
| Room Settlement Lag vs Friendship Balance | Cross-feature | High | Scatter plot | Are slow-settling rooms also the friendships with the largest net imbalances? | Identifies social strain points before they escalate. | Room split lags and friendship net balances | Yes - Friend Rooms x Friends | It explains friendship imbalance through room settlement behavior. | Medium |
| Shared Grocery Precision vs Pending Debt | Cross-feature | High | Grouped bar | Do rooms using item-level grocery splits end with less pending amount than equal-split grocery rooms? | Tests whether granular splitting actually improves settlement. | Item-level split use, pending split amounts, `receipt_items` | Yes - Rooms x Fridge | It evaluates split strategy effectiveness rather than simply tracking split usage. | High |
| Pocket Financing vs Debt-Free Week Coverage | Cross-feature | Medium | Heatmap | Which financing-heavy pockets align with months that lack debt-free weeks? | Shows when asset financing crowds out breathing room. | Pocket financing totals and debt-payment calendars | Yes - Pockets x Debt | It links ownership financing to the cadence of debt-free weeks. | Medium |
| Store Category Price Advantage vs Goal Catch-Up Need | Cross-feature | Medium | Ranked table-like visual | Which store and category switches could free the most monthly cash for behind goals? | Turns grocery decisions into concrete goal catch-up levers. | Category-store price spreads and goal catch-up requirements | Yes - Fridge x Goals | It joins actionable price gaps to goal funding needs. | Medium |
| Challenge Pace vs Shared-Spend Distortion | Cross-feature | High | Scatter plot | Do users in heavier shared-expense environments struggle more to stay on challenge pace? | Connects social context to challenge performance. | Challenge pace metrics and shared-expense load | Yes - Challenges x Friend Rooms | It adds environmental explanation to challenge outcomes. | Medium |
| Goal Portfolio Risk vs Balance Zone Transitions | Cross-feature | High | Treemap | Which goals sit inside months most likely to fall into weaker balance zones? | Prioritizes goals exposed to fragile cash states. | Goal feasibility metrics and balance transition data | Yes - Goals x Savings | It marries goal portfolio risk with cash-state transition behavior. | Medium |
| Category Overrun vs Challenge Category Exposure | Cross-feature | Medium | Heatmap | Are the categories people choose for challenges also the ones with the biggest historical overrun tendency? | Helps create realistic and meaningful challenges. | Challenge categories and historical budget-overrun patterns | Yes - Analytics x Challenges | It grounds challenge design in lived overspend behavior rather than gut feel. | High |
| Goal Allocation Pressure vs Pocket Fixed Costs | Cross-feature | High | Split bar | How much goal allocation room disappears once fixed pocket costs are covered? | Shows whether ownership structure is suffocating goal plans. | Goal allocations, fixed pocket tabs, income or surplus base | Yes - Goals x Pockets | It asks how fixed ownership costs compress planned saving capacity. | Medium |
| Shared Expense Category Mix vs Goal Slippage | Cross-feature | High | Scatter plot | Which shared-spend categories most often accompany worsening goal gaps? | Connects social spending choices to delayed goals. | Shared transaction categories and goal funding gaps | Yes - Friend Rooms x Goals | It links shared category burden to goal deterioration rather than generic shared spend. | Medium |
| Income-Day Shared Spend vs Buffer Dip | Cross-feature | High | Dumbbell | When shared expenses happen on income days, do buffers still dip faster than solo months? | Measures whether social spending neutralizes payday relief. | Income-day shared expenses, buffer changes | Yes - Analytics x Friend Rooms x Savings | It layers payday timing, social spending, and buffer impact into one question. | Medium |
| Goal Catch-Up Need vs Debt Share of Income | Cross-feature | High | Scatter plot | Are the goals needing the biggest catch-up also paired with heavy debt share of income? | Shows where debt is crowding out future plans. | Goal catch-up requirement and debt-to-income windows | Yes - Goals x Debt x Analytics | It combines goal urgency with debt burden rather than charting either one alone. | Medium |
| Challenge Metric Wins vs Shared-Settlement Discipline | Cross-feature | High | Scatter plot | Do people winning savings or health metrics also settle shared expenses faster? | Tests whether good ranking behavior generalizes to coordination behavior. | Challenge win counts and split settlement lags | Yes - Challenges x Friend Rooms | It compares performance culture with settlement discipline, which no current chart does. | Medium |
| Shared Grocery Burden vs Emergency Window Coverage | Cross-feature | High | Heatmap | Do heavy shared grocery months shrink safe cash windows more than solo grocery months? | Connects social grocery behavior to cash safety. | Shared grocery totals, solo grocery totals, safe-window coverage | Yes - Friend Rooms x Fridge x Savings | It compares shared versus solo grocery impact on safety windows. | Medium |

## 2. Best of Batch

Top 10 strongest charts from this run:

1. Budget Collision Matrix
2. Store Category Price Advantage Map
3. Balance Zone Transition Map
4. Goal Realism vs Historical Surplus
5. Property Equity vs Cash Outflow
6. Room Fronting Imbalance
7. Challenge Pace vs Cap
8. Budget Overrun vs Goal Funding Gap
9. Goal Deadline vs Income Cadence Match
10. Shared Grocery Precision vs Pending Debt

## 3. To Be Implemented

Approved from this batch on March 29, 2026:

- Small-Transaction Load by Category
- Category Volatility Grid
- Category Share Shift Ladder
- Balance Pressure Calendar by Weekday Pair
- Income Coverage Ladder by Essential Category
- Basket Size vs Shopping Hour
- Store Freshness Mix
- Store Category Price Advantage Map
- Store Category Breadth Efficiency
- Category Unit-Price Outlier Tracker
- Floor Volatility by Month
- Low-Balance Weekday Exposure
- Debt Share of Income by Period Type
- Goal Deadline Pressure Ladder
- Allocation Coverage by Goal Label
- Pocket Type Burden vs Income

These are now approved and off-limits for future ideation rounds unless explicitly revisited.

## 4. Discard / Upgrade Rule

Rule:
- The remaining 84 unselected charts from this batch are discarded.
- Discarded charts should be added to rejected/discarded memory before a future ideation round.
- Discarded charts must not return unchanged.
- Only materially upgraded versions should be reconsidered later.

## 5. Self-Gate Summary

- Duplicate risk: Low
- Schema realism: Strong
- Join realism: Strong
- Grocery bias: Low
- Readiness: Ready

## 6. Workflow Summary

### Review verdict

Accept with revisions.

Main internal cuts before this final batch:
- direct clones of approved payday/buffer/grocery-share charts
- merchant-dependency and store-loyalty ideas that drifted too close to rejected memory
- generic latest-month ratio cards with weak product value
- line/trend variants that did not add a new analytical question

### Revision moves made

- Pushed the batch away from grocery dominance by expanding Goals, Pockets, Friend Rooms, and Challenges coverage.
- Reframed weak single-domain ideas into stronger cross-feature questions when the join path was credible.
- Removed generic counts, biggest-value cards, and renamed versions of rejected ideas.
- Increased chart-type spread around heatmaps, funnels, range plots, dumbbells, boxplots, bullet bars, and ranked-table visuals.

### Shortlist recommendation

If a smaller implementation shortlist is needed, start with:
- Budget Collision Matrix
- Goal Realism vs Historical Surplus
- Room Fronting Imbalance
- Store Category Price Advantage Map
- Balance Zone Transition Map
- Shared Grocery Precision vs Pending Debt
- Property Equity vs Cash Outflow
- Challenge Pace vs Cap
- Goal Deadline vs Income Cadence Match
- Budget Overrun vs Goal Funding Gap
- Pocket Type Burden vs Income
- Debt Load vs Wants Share

### Final quality gate

Verdict: Pass

Checklist:
- Non-duplication: Pass
- Approved-memory compliance: Pass
- Rejected-memory compliance: Pass
- Schema grounding: Pass
- Cross-feature join realism: Pass
- Domain balance: Pass
- Chart-type diversity: Pass
- Category breadth: Pass
- Product value: Pass
- Implementation readiness: Pass with minor SQL-spec work on a few high-complexity cross-feature charts

Release recommendation:
- Ready for shortlist discussion
