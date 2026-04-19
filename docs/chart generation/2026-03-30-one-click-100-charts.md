# One-Click Ideation Run - 100 Charts - March 30, 2026

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
- `FRIENDS_ROOMS.md`
- `CHALLENGES.md`
- `SAVINGS_CHARTS.md`
- `NEON_DATABASE.md`
- `PROJECT_DEEP_DIVE.md`
- `CHARTS_CLONE_SPEC.md`
- `TESTCHARTS_PLAYGROUND_PROTOCOL.md`
- `READY_TO_IMPORT_DELIVERY_STANDARD.md`
- `MOCK_DATA_IDEATION_STANDARD.md`

Batch targets satisfied:
- Exactly 100 ranked ideas
- Existing, approved, and rejected memory respected
- Strong domain spread across Analytics, Fridge, Savings, Debt, Goals, Pockets, Friend Rooms, Challenges, and Cross-Feature
- Low grocery bias relative to the full pool
- Low line-chart reliance
- Full ranking preserved in this manifest
- Only the top 20 ideas are intended for `/testCharts` materialization in this round

## 1. Proposed Charts

| Chart Title | Page / Domain | Level | Chart Type | Core Question | Why It Matters | Primary Data Needed | Cross-Feature? | Why It Is Original / Not A Duplicate | Extraction Confidence |
|---|---|---|---|---|---|---|---|---|---|
| Merchant Budget Miss Map | Analytics | High | Heatmap | Which merchants show up most often inside category-month budget misses? | It turns vague overspending into merchant-level action. | `transactions.simplified_description`, `transactions.category_id`, `category_budgets`, month buckets | No | Existing budget cards stop at category pace; this maps the merchant sources of repeat misses. | High |
| Store Price Dispersion Index | Fridge | High | Boxplot | Which stores have the widest spread between cheap and expensive lines inside the same basket? | It separates stable stores from stores that feel unpredictable. | `receipts.store_name`, `receipt_transactions.price_per_unit`, `receipt_transactions.total_price` | No | Approved store charts cover averages and breadth, not within-store price spread. | High |
| Fixed-Bill Retention Rate | Savings | High | Bullet bar | After recurring and essential bills land, how much of the month still survives to close? | It shows whether fixed obligations leave any meaningful cushion. | Recurring and essential transaction grouping, monthly closing balance, monthly spend | No | Savings cards track outcomes, but not post-bill survival quality. | Medium |
| Minimum-Like Payment Pattern | Debt | High | Dot plot | Which debt-payment streams look stuck at repeated minimum-style amounts instead of real paydown? | It surfaces the likely minimum-payment trap without needing a full loan ledger. | Debt-tagged transactions by description, amount repeats, monthly series | No | Debt memory covers burden and timing, not stagnant payment behavior. | Medium |
| Vehicle Fuel vs Maintenance Rhythm | Pockets | High | Dumbbell | For each vehicle, is money leaving steadily through fuel or in irregular maintenance bursts? | It makes cost-of-ownership rhythm visible instead of flattening all vehicle spend. | Vehicle pockets, `pocket_transactions.tab`, linked transaction totals by month | No | Pocket ideas cover burden; this compares operating rhythm inside vehicles. | High |
| Room Settlement Queue Age | Friend Rooms | High | Range plot | How old is the unresolved settlement queue in each room? | It identifies which rooms have turned into stale coordination backlogs. | `transaction_splits.status`, `shared_transactions.transaction_date`, `room_id` | No | Room ideas covered balances broadly; this ranks unresolved queue age by room. | High |
| Metric Podium Concentration | Challenges | High | Stacked bar | Are the same members taking most podium finishes across metrics and months inside a group? | It shows whether a group is truly competitive or dominated by a tiny core. | `challenge_monthly_results`, `challenge_group_members`, metric history by month | No | Challenge charts tracked wins and points; this asks how concentrated the podium really is. | High |
| Recurring Bills vs Goal Slack | Cross-Feature | High | Scatter plot | Do heavier recurring-bill months leave meaningfully less slack for active savings-goal plans? | It connects autopilot spending structure to goal pressure. | Recurring spend totals, `savings_goals.monthly_allocation`, monthly surplus | Yes - Analytics x Goals | Budget and goal ideas existed separately; this tests recurring-bill pressure specifically. | High |
| Goal Deadline Order vs Target Size | Goals | High | Scatter plot | Are the biggest goals due earliest or latest inside the current portfolio? | It reveals whether the goal stack is front-loaded or sensibly staged. | `savings_goals.target_amount`, `deadline`, `label`, `category` | No | Goal memory focuses pressure and coverage, not sequence against target size. | High |
| Category Timing Skew Ladder | Analytics | High | Arrow plot | Which categories consistently hit early in the month and which arrive late? | It helps users schedule around categories that front-load pressure. | `transactions.tx_date`, `transactions.category_id`, month-position indexing | No | Existing weekday and month charts show distribution, not structural early-vs-late skew. | High |
| Quantity Discount Failure Map | Fridge | High | Heatmap | In which stores and categories do bigger quantities fail to produce lower unit prices? | It flags where bulk-looking baskets are not actually efficient. | `receipt_transactions.quantity`, `price_per_unit`, `receipts.store_name`, category joins | No | Rejected bulk-buy concepts were broad; this isolates failure points by store and category. | High |
| Transfer Rescue Frequency | Savings | High | Grouped bar | How often do transfers in or refund-like inflows appear in months that would otherwise finish weak? | It separates real income resilience from months rescued by non-core inflows. | Positive transaction types, monthly close, monthly balance bands | No | Savings coverage does not currently separate core earning strength from rescue inflows. | Medium |
| Debt Date Regularity Score | Debt | High | Range plot | How predictable are debt-payment dates from month to month? | Predictable debt is much easier to plan around than chaotic debt timing. | Debt-tagged transactions, date regularity by stream, monthly comparisons | No | This is a calendar-regularity question, not another debt burden chart. | High |
| Travel Spend Density by Country | Pockets | High | Treemap | Which travel countries absorb the densest share of pocket-linked spend? | It makes the travel surface useful for concentration, not just raw totals. | Travel pockets, country metadata, linked pocket transactions | No | Pocket coverage is light on travel-country concentration. | Medium |
| Room Split Precision Score | Friend Rooms | High | Grouped bar | Which rooms rely on precise item-level or custom splits versus rough equal splits? | It shows where the group values precision enough to justify detailed workflows. | `shared_transactions.split_type`, room linkage, shared totals | No | Earlier room ideas listed split mix; this frames split precision as a room-level score. | High |
| Rank Recovery After Bad Month | Challenges | High | Dumbbell | When a member has a poor month, how often do they recover their rank in the next scored month? | It captures competitive resilience rather than raw points alone. | Ranked `challenge_monthly_results` by user, metric, and month | No | Existing challenge ideas tracked turnover and podiums, not one-step recovery behavior. | High |
| Shared Expense Nights vs Wants Control | Cross-Feature | High | Scatter plot | Do months with more evening shared-expense activity also show weaker wants control? | It connects social spending context to discretionary discipline. | Evening shared-transaction counts, wants share from transactions | Yes - Friend Rooms x Analytics | This is not generic shared-spend pressure; it focuses night-time activity versus wants control. | Medium |
| Goal Horizon Balance Index | Goals | High | Bullet bar | Is the portfolio balanced across short, medium, and long-horizon goals or tilted too hard to one horizon? | It gives a portfolio-design view without inventing a funding ledger. | Goal deadlines, target amounts, monthly allocations | No | Goal charts do not summarize horizon balance across the portfolio. | High |
| Pocket Calendar Collision Map | Pockets | High | Heatmap | Which weeks of the month collect the most pocket-linked obligations across pocket types? | It makes ownership timing visible before cash flow gets squeezed. | `pocket_transactions`, linked transaction dates, `pockets.type` | No | Pocket burden exists, but not calendar collisions across pocket surfaces. | High |
| Overspend Streak by Category | Analytics | High | Dot plot | Which categories string together the longest runs of over-budget or above-typical months? | It shows persistent problem categories instead of one-off misses. | Monthly category spend, `category_budgets`, category baselines | No | Budget charts focus a single window; this asks for repeated overspend streak behavior. | High |
| Receipt Cost Concentration by Line | Fridge | High | Funnel | Are expensive baskets usually driven by one or two lines or by broad medium-cost accumulation? | It tells users whether to cut a hero item or a general basket pattern. | Basket totals, receipt line totals, line concentration per receipt | No | Existing basket charts cover size and ranges, not line concentration inside costly receipts. | High |
| Multi-Income Cushion Advantage | Savings | High | Grouped bar | Do months with multiple income events finish safer than months with one major income event? | It tests whether cash safety depends on income frequency as much as income size. | Positive transaction dates, monthly closing balance, floor and close states | No | Income charts cover delay and counts, not safety outcomes by income frequency. | Medium |
| Debt Burst Month Share | Debt | High | Stacked bar | How much debt payment happens in burst months versus steady-payment months? | It distinguishes structured paydown from sporadic strain. | Debt-tagged payments, monthly counts, monthly totals | No | This is about burstiness of debt burden, not debt totals or payday timing. | High |
| Housing Obligation Mix by Property | Pockets | High | Stacked bar | For each property, what share of burden is mortgage, rent, tax, utility, fee, or deposit related? | It clarifies what kind of property obligation is actually driving cash load. | Property pockets, `pocket_transactions.tab`, linked transaction totals | No | It stays inside housing and breaks down obligation mix without repeating equity views. | High |
| Room Category Concentration of Pending Balance | Friend Rooms | High | Heatmap | Which categories create the biggest unresolved balance concentration inside each room? | It helps target the kinds of shared spending that keep getting stuck. | Pending split amounts, shared categories, room linkage | No | Similar backlog ideas existed, but this isolates category concentration of pending balances. | High |
| Challenge Spend Pace Variance | Challenges | High | Boxplot | Across active spending challenges, how volatile is each participant's pace versus the target path? | It distinguishes steady challengers from members who lurch between safe and risky pace. | Challenge participants, current spend, elapsed challenge ratio | No | Pace was covered as a snapshot before; variance adds stability of behavior. | High |
| Weekend Spillover by Category | Analytics | High | Grouped bar | After a heavy weekend, which categories stay elevated into Monday and Tuesday? | It exposes the hangover effect of weekend behavior on the next workweek. | Transaction dates, category totals, weekend-to-weekday windows | No | Existing weekend charts stop at the weekend itself; this measures spillover. | High |
| Fresh vs Pantry Timing Calendar | Fridge | High | Heatmap | On which days of the month do fresh-heavy baskets appear versus pantry-heavy baskets? | It reveals whether users shop fresh early, late, or evenly through the cycle. | Receipt categories, broad-type mix, basket date composition | No | Approved freshness charts are store-level mixes; this asks for timing of fresh versus pantry baskets. | High |
| Bill Week Recovery Lag | Savings | High | Range plot | After the heaviest bill week each month, how long does it take balances to recover above the monthly median? | It turns the monthly bill hit into a measurable resilience lag. | Daily balance history, recurring-bill week detection, recovery windows | No | Savings memory focuses low points and closes, not recovery lag after bill week. | Medium |
| Goal Funding Shape Mix | Goals | High | Stacked bar | Are goal plans mostly built from many small monthly allocations or a few heavy commitments? | It helps the user understand whether the portfolio is broad-and-light or narrow-and-heavy. | Goal monthly allocations, target amounts, categories | No | Current goal charts do not summarize the shape of planned commitment sizes. | High |
| Grocery Store Mix vs Challenge Fridge Score | Cross-Feature | High | Scatter plot | Do healthier grocery challenge scores line up with a different store mix than weaker scores? | It connects real store behavior to the fridge-score competition surface. | Receipt store mix and `challenge_monthly_results` for `fridgeScore` | Yes - Fridge x Challenges | This links store mix to a score metric rather than repeating store cost or rank charts. | Medium |
| Pocket Fixed-Cost Start-of-Month Load | Pockets | Medium | Split bar | How much of each month opens with fixed pocket obligations before flexible spending even starts? | It shows which ownership surfaces consume cash right at the start of the cycle. | Pocket tabs, linked transaction dates, fixed-cost grouping | No | Pocket burden exists, but not a start-of-month fixed-load cut. | High |
| Metric Breadth by Member | Challenges | Medium | Parallel coordinates | Are strong members winning across many metrics or only excelling in one or two? | It separates all-round discipline from single-metric specialists. | Challenge monthly results by metric and member | No | Win-distribution ideas covered totals; this asks for breadth of strength. | High |
| Subscription Load vs Flex Spend | Analytics | Medium | Split bar | How much room is left for flexible categories after subscriptions and other recurring bills land? | It makes recurring load tangible in the rest of the budget. | Recurring classification, subscription-like spend, discretionary totals | No | Existing recurring charts show share; this shows remaining flex after the recurring stack. | High |
| Category Price Season Window | Fridge | Medium | Range plot | Which grocery categories reliably hit their cheapest and priciest months? | It gives the user a simple seasonal pricing lens without forecasting. | Category-level unit prices by month | No | The fridge page shows totals and trends, not seasonal price windows by category. | High |
| Safe Spend Pace by Pay Cycle | Savings | Medium | Bullet bar | Between one payday and the next, how fast can spending rise before buffer safety usually breaks? | It gives a usable pacing rule instead of a single closing number. | Income-event detection, daily spend, daily balance states | No | Savings memory is rich on outcomes; this turns them into pay-cycle guidance. | Medium |
| Debt vs Essentials Burden Split | Debt | Medium | Split bar | In heavy debt months, how does debt burden compare with housing, groceries, and utilities together? | It shows whether debt is a side burden or a main structural cost. | Debt-tagged spend plus essential category totals | No | The debt backlog lacked a direct debt-versus-essentials framing. | High |
| Fronted Category Mix by Room | Friend Rooms | Medium | Stacked bar | What kinds of categories are most often fronted by one person before the group settles up? | It reveals whether room fronting is mostly rent-like, grocery-like, or social-spend heavy. | Shared transaction categories, uploader, split totals, room linkage | No | Earlier room ideas emphasized balances and lag; this asks what kinds of costs get fronted. | High |
| Vehicle Maintenance Month vs Buffer Drop | Cross-Feature | Medium | Scatter plot | Do maintenance-heavy vehicle months also suffer sharper buffer drops? | It connects vehicle upkeep to savings fragility without flattening pockets into generic spend. | Vehicle maintenance totals and monthly balance drop signals | Yes - Pockets x Savings | It uses vehicle maintenance as the explanatory signal for savings pressure. | Medium |
| Subscription Load vs Challenge Wants Score | Cross-Feature | Medium | Scatter plot | Do heavier subscription months coincide with weaker wants-control performance? | It tests whether passive recurring spend undermines discipline metrics. | Subscription-like spend and `wantsPercent` challenge results | Yes - Analytics x Challenges | This links recurring spend to privacy-safe wants scoring rather than raw spend totals. | Medium |
| Income-Day Delay Distribution | Analytics | Medium | Range plot | How long after income hits does each category usually react? | It helps users see which categories immediately absorb fresh cash. | Positive transaction dates and subsequent category-spend timing | No | Payday charts exist, but this distributes delay by category instead of one before-after split. | Medium |
| Broad-Type Value Density | Fridge | Medium | Grouped bar | Which broad grocery types generate the most spend per unique item in a basket? | It distinguishes pricey basket types from simply large ones. | Receipt broad type, unique-item counts, basket totals | No | Existing fridge charts show share and totals, not spend density per unique item. | High |
| Opening Balance Reliance Share | Savings | Medium | Bullet bar | How much of a safe month came from money already sitting in the account before fresh income arrived? | It reveals whether good months are earned by current cash flow or inherited from the prior close. | Opening balance, income totals, monthly close and floor states | No | Approved charts include opening-to-floor movement, not reliance on opening balance. | Medium |
| Lender Concentration Map | Debt | Medium | Treemap | Is debt-like outflow spread across many lenders or concentrated in a few obligations? | Concentration helps separate one major burden from a fragmented debt stack. | Debt-tagged descriptions, amount totals, monthly grouping | No | This asks concentration of debt counterparties, which current debt memory does not cover. | Medium |
| Vehicle Expense Concentration by Tab | Pockets | Medium | Treemap | Which vehicles are dominated by one ownership tab such as fuel, maintenance, or insurance? | It shows whether each vehicle has a single cost driver or a balanced burden. | Vehicle pockets, tab totals, linked spend | No | Pocket charts do not isolate tab concentration inside each vehicle. | High |
| Equal vs Item-Level Gap by Amount Size | Friend Rooms | Medium | Dumbbell | For larger shared transactions, do rooms fall back to rough equal splits instead of item-level precision? | It shows where precision breaks down when the money gets bigger. | Shared totals, split type, room linkage | No | This is not another split-type mix chart; it tests precision against amount size. | High |
| Best-Rank vs Total-Points Gap | Challenges | Medium | Dumbbell | Which members flash high best ranks without converting that into strong all-time points? | It separates brief spikes from reliable long-run performance. | Challenge monthly ranks and accumulated points | No | Rank and points exist, but not the gap between peak rank and long-run output. | High |
| Goal Allocation Weight by Category | Goals | Medium | Treemap | Which goal categories consume the biggest share of total planned monthly allocation? | It makes the goal portfolio easier to reason about by category. | Goal categories and monthly allocations | No | Concentration was previously framed by goal, not by category share of planned allocation. | High |
| Shared Grocery Precision vs Budget Variance | Cross-Feature | Medium | Grouped bar | Do months with more precise shared grocery splits show lower grocery-budget variance afterward? | It tests whether room-level receipt precision improves budgeting discipline. | Shared grocery split types, grocery budgets, month-level variance | Yes - Friend Rooms x Fridge x Analytics | Prior room-grocery ideas focused pending debt; this asks budgeting variance after precise splitting. | Medium |
| Weekend vs Weeknight Basket Complexity | Fridge | Medium | Split bar | Are weekend baskets structurally more complex than weeknight baskets? | It helps explain whether weekend shopping is a stock-up mission or just higher frequency. | Basket line counts, category counts, receipt dates and times | No | Existing time and size charts do not compare basket complexity by weekend versus weeknight. | High |
| Spend Burst Density by Merchant | Analytics | Medium | Boxplot | Which merchants appear in dense spending clusters instead of smooth repeat patterns? | It helps spot impulsive merchant bursts that distort the month. | Merchant-normalized transactions, daily clusters, burst density | No | Merchant charts focus totals and tickets, not burst density across the calendar. | Medium |
| Store Daypart Mission Split | Fridge | Medium | Stacked bar | Does each store behave like a morning top-up stop, afternoon refill, or evening full-basket destination? | It turns simple store usage into a mission profile. | Store names, receipt times, basket totals and basket types | No | This is a behavioral mission split, not a plain timing chart. | High |
| Threshold Recovery Count | Savings | Medium | Dot plot | How many times per month does the balance recover above a safety threshold after dipping below it? | It captures resilience in repeated recoveries, not just the final close. | Daily balance states and safety-threshold crossings | No | Recovery funnels were rejected; this is a cleaner count of rebounds. | Medium |
| Debt Payment Stack by Half-Month | Debt | Medium | Stacked bar | Is debt pressure concentrated in the first half or second half of the month? | It gives a practical scheduling view for debt without depending on payday logic. | Debt-tagged transaction dates, half-month totals | No | This is a cadence cut, not another payday distance chart. | High |
| Other Pocket Spend Volatility | Pockets | Medium | Boxplot | Which non-travel, non-vehicle, non-property pockets swing the most month to month? | It makes the Other pocket surface actionable instead of vague. | Other pockets, monthly linked spend totals | No | Pocket memory has little coverage for the Other surface, so this fills a gap. | High |
| Shared Expense Wave by Week | Friend Rooms | Medium | Heatmap | Which rooms accumulate shared-expense waves early or late within a typical month? | It helps spot rooms whose sharing behavior creates predictable pressure points. | Shared transaction dates, room linkage, week-of-month buckets | No | This is about wave timing per room, not just room balance or lag. | High |
| Podium Stability by Metric | Challenges | Medium | Heatmap | Which metrics produce stable podiums and which reshuffle constantly? | It helps judge whether the metric set rewards consistency or volatility. | Ranked monthly results by metric and month | No | Turnover ideas existed overall; this isolates stability by metric. | High |
| Travel Pocket Timing vs Goal Deadline Quarter | Cross-Feature | Medium | Heatmap | Do travel-pocket spikes bunch into the same quarters where more goal deadlines arrive? | It shows whether travel timing collides with planning-heavy periods. | Travel pocket months and goal deadline quarters | Yes - Pockets x Goals | This is a timing-collision chart between travel and goal quarters, not a generic burden view. | Medium |
| Balance Stability by Income Count | Savings | Medium | Range plot | How much tighter are opening, floor, and close spreads in one-income versus many-income months? | It translates income fragmentation into balance stability. | Income-event counts and monthly balance snapshots | No | This is about stability bands by income count, not raw income frequency. | Medium |
| Debt Pressure on Small-Ticket Wants | Cross-Feature | Medium | Grouped bar | When debt outflow rises, do small discretionary purchases shrink or stay sticky? | It measures whether debt pressure changes day-to-day wants behavior. | Debt-tagged spend plus small-ticket wants transactions | Yes - Analytics x Debt | Older debt crowd-out ideas worked at category level; this drills into small-ticket wants. | Medium |
| Room Fronting Recurrence by Member | Friend Rooms | Medium | Dot plot | Which members repeatedly end up fronting shared costs across rooms? | It identifies the people who become the default float providers. | Shared uploader data, room linkage, fronting frequency | No | It studies recurrence of fronting by person, not just a room balance snapshot. | High |
| Goal Required Pace Dispersion | Goals | Medium | Boxplot | How widely do required monthly paces vary across active goals? | It shows whether the portfolio is smooth to fund or full of conflicting pace requirements. | Goal targets, deadlines, allocations, required monthly pace | No | Feasibility charts existed before; dispersion focuses internal spread between goals. | High |
| Challenge Participation Retention by Month | Challenges | Medium | Funnel | Across active challenges, how many participants stay engaged from start to middle to close? | It measures challenge stickiness instead of only spend results. | Challenge participant joins, challenge dates, active participation windows | No | Current challenge ideas focus scores and pace, not participation retention. | Medium |
| Travel Country Spikes vs Cushion Reliance | Cross-Feature | Medium | Scatter plot | Do months with concentrated travel-country spikes lean more heavily on opening cushion? | It turns travel concentration into a buffer-reliance question. | Travel country totals and opening-balance reliance signals | Yes - Pockets x Savings | This compares country-level travel spikes to cushion reliance, which is new. | Medium |
| Budget Miss Days by Category | Analytics | Medium | Heatmap | On how many days does a category run above its expected daily burn inside the month? | It gives an operational budget view instead of waiting for monthly totals. | Daily category spend, expected burn, category budgets | No | Existing budget charts show month pace; this marks miss-days by category. | High |
| Basket Category Depth vs Spend | Fridge | Medium | Scatter plot | Does spending more usually buy a wider category mix or just more of the same basket? | It helps users understand whether big receipts are broad stock-ups or narrow splurges. | Basket totals and unique category counts | No | Existing basket charts show size, not category depth against spend. | High |
| Debt Load Variance by Income Count | Debt | Medium | Grouped bar | Do months with more income events carry steadier debt burden or just more debt activity? | It tests whether more frequent inflow smooths debt pressure. | Debt-tagged spend and income-event counts by month | No | It links income frequency to debt variance, not debt share to income alone. | Medium |
| Vehicle Upkeep Gap by Month | Pockets | Medium | Range plot | Which vehicles go longest between upkeep-related spend and then get hit by large service months? | It surfaces deferred-maintenance risk from timing gaps. | Vehicle maintenance tabs and month-to-month gap timing | No | This is a gap-and-burst view, not a total-maintenance chart. | Medium |
| Shared Expense Category Seasonality by Room | Friend Rooms | Medium | Heatmap | Which rooms have category patterns that reliably reappear in certain months? | It helps distinguish seasonal room behavior from random bursts. | Shared categories, transaction dates, room linkage | No | Current room ideas are operational; this adds seasonal pattern recognition by room. | Medium |
| Challenge Deadline Compression Map | Challenges | Medium | Heatmap | Which challenge windows overlap so tightly that members face many simultaneous caps at once? | It helps avoid overloading the social accountability layer. | Challenge start dates, end dates, category labels | No | This is a scheduling-density chart for challenge windows, not a performance chart. | High |
| Property Fee Peaks vs Debt Payment Regularity | Cross-Feature | Medium | Scatter plot | Do months with property-fee peaks also disrupt otherwise regular debt-payment timing? | It connects housing spikes to debt-payment rhythm. | Property fee totals and debt payment date-regularity signals | Yes - Pockets x Debt | It compares property spikes to debt regularity, which is not in current debt memory. | Medium |
| Goal Portfolio Deadline Gaps | Goals | Medium | Range plot | Are there long quiet gaps between goal deadlines or constant compression? | It helps the user understand the cadence of the portfolio. | Goal deadlines and labels | No | This is a cadence-gap view rather than deadline pressure or feasibility. | High |
| Budget Breach Merchant Pair Map | Analytics | Medium | Heatmap | Which merchant pairings most often show up on the same over-budget days? | It spots repeat merchant combinations behind painful spike days. | Merchant-normalized transactions, day-level totals, over-budget day flags | No | Merchant charts today do not map co-occurring merchants on breach days. | Medium |
| Store Price Floor Reliability | Fridge | Medium | Heatmap | Which stores most consistently deliver the lowest observed unit prices for specific categories over time? | It helps users see where price leadership is stable rather than occasional. | Store names, unit prices, categories, month buckets | No | Approved store advantage charts compare levels; this asks whether price floors repeat reliably. | Medium |
| Cushion Depth vs Essential Median | Savings | Medium | Bullet bar | How many median essential-spend days could the usual monthly cushion absorb? | It keeps safety grounded in essentials instead of all expenses. | Essential-spend medians and monthly cushion values | No | Existing safety charts use grocery or overall ratios, not essential-day cushion depth. | Medium |
| Debt Payment Gap Range | Debt | Medium | Range plot | Which debt-like payment streams have the widest shortest-to-longest gap range? | It makes irregular debt easier to spot and plan around. | Debt-tagged descriptions and payment intervals by stream | No | Gap spread differs from payment share, timing, or ticket size. | High |
| Pocket Tab Volatility by Type | Pockets | Medium | Grouped bar | Which pocket tabs are most volatile inside vehicles, housing, travel, or other? | It helps the user know where sinking funds are most needed. | Pocket tabs, pocket types, monthly totals | No | This compares volatility by tab and surface, not just totals by pocket. | High |
| Settlement Weekend Bias | Friend Rooms | Medium | Split bar | Are settlements more likely to happen on weekends or weekdays? | It reveals whether room cleanup is routine admin or weekend catch-up behavior. | `transaction_splits.settled_at`, settlement status history | No | Room concepts focus pending age and fronting, not settlement weekday bias. | High |
| Metric Comeback Frequency | Challenges | Medium | Dot plot | Which members rebound into the podium most often after missing it? | It shows sustained competitiveness beyond total points. | Ranked challenge results by month and metric | No | This differs from bad-month recovery by focusing on podium re-entry itself. | High |
| Room Fronting vs Low-Balance Exposure | Cross-Feature | Medium | Scatter plot | Do months with heavier fronting responsibility coincide with more low-balance exposure for the payer? | It connects social burden-sharing to real cash safety. | Fronted shared totals and low-balance day exposure | Yes - Friend Rooms x Savings | It ties fronting load directly to balance exposure rather than generic shared spend. | Medium |
| Goal Allocation Range by Goal Size | Goals | Medium | Scatter plot | Do large goals receive proportionally bigger monthly allocations or stay underweighted? | It spots visually impressive goals that are not backed by real commitment. | Goal target amounts and monthly allocations | No | Allocation coverage is approved; this focuses proportional weighting by goal size instead. | High |
| Merchant Cluster Shock Map | Analytics | Medium | Heatmap | Which merchant clusters most often appear inside unusually expensive days? | It helps users see the merchant combinations behind shock spending. | Merchant-normalized transactions and expensive-day clustering | No | Top-merchant rankings do not explain spike-day combinations. | Medium |
| Basket Value Density Corridor | Fridge | Medium | Range plot | How tightly do basket totals track line count, and where do outlier baskets break the pattern? | It separates normal stock-ups from unusually expensive baskets. | Basket totals, line counts, outlier ranges | No | Existing basket-size charts do not show the normal corridor versus outliers. | High |
| Early-Month Buffer Carryover | Savings | Medium | Bullet bar | How much opening cushion typically survives the first week of each month? | It reveals whether the prior month's win vanishes immediately. | Opening balance, first-week balance floor, first-week spend totals | No | Existing savings charts focus the full month, not first-week carryover erosion. | Medium |
| Debt Ticket Escalation Ladder | Debt | Medium | Arrow plot | Are debt payments drifting upward in their usual ticket size over time? | It signals creeping burden even when payment frequency looks stable. | Debt-tagged descriptions and median payment size by month | No | This is a size-escalation question rather than burden share or timing. | Medium |
| Travel Country Cost Evenness | Pockets | Low | Dot plot | Is travel spend spread evenly across countries or dominated by one expensive destination? | It gives the travel surface an evenness read instead of only totals. | Travel pocket country totals and month-level distribution | No | Travel concentration exists elsewhere; evenness is a different portfolio question. | Medium |
| Shared Expense Weekend Fronting Rate | Friend Rooms | Low | Grouped bar | Are shared expenses fronted more heavily on weekends than weekdays? | It shows whether weekends create a special fronting burden. | Shared uploader data, transaction dates, shared totals | No | This is about weekend fronting behavior, not settlement timing or pending age. | High |
| Challenge Metric Rank Spread | Challenges | Low | Range plot | Within each metric, how wide is the distance from leader to lower ranks month to month? | It shows which metrics are close races and which are blowouts. | Ranked challenge results by metric and month | No | Turnover and podium ideas exist, but rank spread is a different competitiveness signal. | High |
| Pocket Fixed Load vs Recurring Bill Flex | Cross-Feature | Low | Split bar | Once fixed pocket obligations and recurring bills land, how much monthly flex is left? | It shows whether ownership plus subscriptions is boxing out optional spend. | Fixed pocket tabs, recurring spend, discretionary totals | Yes - Pockets x Analytics | This combines two fixed-load systems rather than reusing budget collision logic. | Medium |
| Goal Plan Density by Year Half | Goals | Low | Grouped bar | Is more planned goal pressure packed into the first half of the year or the second? | It is useful for seeing whether the portfolio is seasonally overloaded. | Goal deadlines, allocations, target amounts | No | This is a planning-density cut, not a deadline-risk chart. | Medium |
| Merchant Calm-Day Reliance | Analytics | Low | Split bar | Does monthly spending stay anchored in ordinary calm days or depend on a few large spike days? | It shows whether the month is structurally stable or shock-driven. | Daily spend totals, spike-day flags, merchant-normalized spend | No | Existing charts cover spikes and counts separately, not calm-day reliance. | Medium |
| Store Basket Volatility by Week | Fridge | Low | Boxplot | Which stores swing wildly in receipt totals from week to week? | It distinguishes predictable staple stores from irregular mission stores. | Weekly receipt totals by store | No | This is a volatility lens on stores rather than a loyalty or range view. | High |
| Cushion Reset Speed After Income | Savings | Low | Arrow plot | How quickly does the cushion recover in the days after an income event? | It translates pay-in relief into a measurable reset speed. | Income events and post-income balance recovery slope | No | Income timing and lift are covered elsewhere; this focuses the reset window speed. | Medium |
| Debt Merchant Stickiness | Debt | Low | Dot plot | Do debt-like payments cycle through many counterparties or keep returning to the same descriptions? | It helps separate one entrenched burden from many fragmented obligations. | Debt-tagged descriptions and repeat frequency | No | Debt concentration by lender is different from merchant-like stickiness over time. | Medium |
| Property Cost Weeks vs Goal Allocation Slack | Cross-Feature | Low | Scatter plot | Do heavy property-cost weeks reduce the slack left for monthly goal plans? | It connects housing timing to planning room without needing a full mortgage model. | Property pocket weekly totals, goal allocation, monthly slack | Yes - Pockets x Goals | This is a week-level housing-versus-slack chart, not a deadline-risk or debt-risk chart. | Medium |
| Goal Monthly Commitment Stack | Goals | Low | Stacked bar | How is total planned monthly goal commitment distributed across the current portfolio? | It summarizes the monthly planning load in one clear view. | Goal monthly allocations, categories, labels | No | This is a monthly commitment composition chart distinct from feasibility or status. | High |
| Pocket Value-to-Burden Spread | Pockets | Low | Range plot | Which pockets look most expensive relative to their stored value signal? | It helps spot ownership surfaces that feel heavy for the value they return. | Pocket totals, value signals, type-level pocket metadata | No | Pocket burden charts exist, but not burden spread against value signal. | Medium |
| Room Member Rotation vs Payment Load | Friend Rooms | Low | Scatter plot | Do rooms with more member churn still distribute payment load fairly? | It helps explain why some rooms stabilize and others recenter around one payer. | Room membership change timing and fronting load per member | No | This blends membership rotation with payment load, which room charts do not cover today. | Medium |
| Challenge Join Tenure vs Points Rate | Challenges | Low | Scatter plot | Do longer-tenured members keep earning points efficiently or does performance flatten over time? | It separates durable discipline from early enthusiasm. | Challenge group join dates, total points, scored months | No | Tenure-normalized performance is new in the current challenge idea set. | High |
| Goal Diversification vs Metric Breadth | Cross-Feature | Low | Scatter plot | Do users with more diversified goal portfolios also perform across more challenge metrics? | It connects planning breadth to disciplined execution breadth. | Goal category counts and metric-win breadth from challenge results | Yes - Goals x Challenges | This compares two breadth measures, not raw ranks, points, or goal totals. | Medium |

## 2. Best of Batch

Top 20 strongest charts from this run:

1. Merchant Budget Miss Map
2. Store Price Dispersion Index
3. Fixed-Bill Retention Rate
4. Minimum-Like Payment Pattern
5. Vehicle Fuel vs Maintenance Rhythm
6. Room Settlement Queue Age
7. Metric Podium Concentration
8. Recurring Bills vs Goal Slack
9. Goal Deadline Order vs Target Size
10. Category Timing Skew Ladder
11. Quantity Discount Failure Map
12. Transfer Rescue Frequency
13. Debt Date Regularity Score
14. Travel Spend Density by Country
15. Room Split Precision Score
16. Rank Recovery After Bad Month
17. Shared Expense Nights vs Wants Control
18. Goal Horizon Balance Index
19. Pocket Calendar Collision Map
20. Overspend Streak by Category

Important large-run rule applied:
- the table above is ordered from strongest to weakest using the scoring rubric
- the top 20 ideas are intended for active `/testCharts` materialization in this round
- the remaining 80 ideas stay preserved in the ranked manifest for later shortlist or approval decisions

## 3. `/testCharts` Materialization Target

Top-20 section counts for the active review batch:

| Section | Count |
|---|---:|
| Analytics | 3 |
| Fridge | 2 |
| Savings | 2 |
| Debt | 2 |
| Goals | 2 |
| Pockets | 3 |
| Friend Rooms | 2 |
| Challenges | 2 |
| Cross-Feature | 2 |
| **Total** | **20** |

Visible review shortlist:
- Merchant Budget Miss Map
- Store Price Dispersion Index
- Fixed-Bill Retention Rate
- Minimum-Like Payment Pattern
- Vehicle Fuel vs Maintenance Rhythm
- Room Settlement Queue Age
- Metric Podium Concentration
- Recurring Bills vs Goal Slack
- Goal Deadline Order vs Target Size
- Category Timing Skew Ladder
- Quantity Discount Failure Map
- Transfer Rescue Frequency
- Debt Date Regularity Score
- Travel Spend Density by Country
- Room Split Precision Score
- Rank Recovery After Bad Month
- Shared Expense Nights vs Wants Control
- Goal Horizon Balance Index
- Pocket Calendar Collision Map
- Overspend Streak by Category

## 4. Quality Gate

- Verdict: `Pass`
- Non-duplication: strong relative to current approved and rejected memory, with some medium-confidence cross-feature ideas intentionally pushed lower in the ranking
- Schema grounding: strongest for Analytics, Fridge, Pockets, Friend Rooms, and Challenges; medium for debt-like and some cross-feature comparisons
- Product balance: broad spread across domains without drifting back into grocery-heavy ideation
- Import readiness: strong for the top tier, especially the top-20 shortlist selected for clone-spec mock-data materialization
