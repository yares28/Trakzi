# One-Click Ideation Run - 100 Charts - March 30, 2026 - Round 2

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
- Current approved and rejected memory respected after the resolved March 30 shortlist
- Active review batch restored in `/testCharts` with a new top 20 visible shortlist
- Full clone-spec production card path retained
- Mock-data ideation mode retained with no live user-data wiring
- Broad domain spread across Analytics, Fridge, Savings, Debt, Goals, Pockets, Friend Rooms, Challenges, and Cross-Feature
- Low grocery bias relative to the full pool
- Low line-chart reliance
- Full ranking preserved in this manifest
- Only the top 20 ideas are intended for `/testCharts` materialization in this round

## 1. Proposed Charts

| Chart Title | Page / Domain | Level | Chart Type | Core Question | Why It Matters | Primary Data Needed | Cross-Feature? | Why It Is Original / Not A Duplicate | Extraction Confidence |
|---|---|---|---|---|---|---|---|---|---|
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
| Category Recovery Window After Overspend | Analytics | Medium | Range plot | After a category breaks budget, how long does it take spending in that category to return to its normal band? | It separates quick self-correction from categories that stay out of control for too long. | Daily category spend, budget breach flags, rolling category baselines | No | Budget miss-day charts show when trouble happens; this asks how long correction takes. | High |
| Store Markdown Capture Rate | Fridge | Medium | Grouped bar | Which stores most often deliver discount-like wins inside a normal basket? | It helps separate stores that occasionally look cheap from stores that regularly create bargain opportunities. | Store names, unit-price outliers, category-normalized price comparisons | No | Existing store price charts focus level and spread, not how often a store actually produces markdown-style wins. | Medium |
| Cushion Use-Then-Rebuild Ratio | Savings | Medium | Split bar | In weak months, how much buffer gets used and how much gets rebuilt before close? | It turns cushion management into a clear resilience pattern instead of a single end-of-month snapshot. | Opening balance, monthly floor, closing balance, inferred buffer draw and rebuild | No | Savings charts cover buffer size and recovery counts, not the use-versus-rebuild split within the same month. | High |
| Debt Ticket Variance by Week of Month | Debt | Medium | Boxplot | Does debt payment size stay stable across weeks or spike in certain windows of the month? | It shows whether debt pain is evenly distributed or concentrated into a few heavier weekly hits. | Debt-tagged payment sizes, week-of-month buckets, monthly repeats | No | Current debt ideas cover dates and burden splits, not ticket-size variance by week window. | High |
| Deadline Cluster Weight by Category | Goals | Medium | Treemap | Which goal categories absorb the heaviest share of near-term deadline pressure? | It makes urgency easier to reason about when several goal categories are competing for attention at once. | Goal categories, deadline months, target amounts, monthly allocations | No | Goal deadline and ordering charts focus individual goals, not category-level urgency concentration. | High |
| Travel Pocket Burst Spacing | Pockets | Low | Range plot | How long is the gap between travel-pocket spend bursts for each trip cluster or country? | It reveals whether travel costs arrive in one contained wave or keep reactivating the pocket over time. | Travel pocket transaction dates, country or trip grouping, burst-gap timing | No | Travel concentration ideas explain where the money went, not how travel-pocket bursts are spaced. | Medium |
| Shared Receipt Item Drift by Room | Friend Rooms | Low | Dot plot | Which rooms see the biggest drift in item counts per shared receipt over time? | It reveals where shared grocery coordination is getting more complex instead of staying routine. | Shared receipt items, room linkage, monthly item counts per receipt | No | Existing room charts cover balances and split structure, not receipt-complexity drift. | Medium |
| Metric Leader Gap Momentum | Challenges | Medium | Arrow plot | Is the distance from first place to the pack widening or tightening by metric? | It shows whether a metric is becoming more competitive or more one-sided over time. | Monthly challenge ranks and score gaps by metric | No | Podium stability and rank spread cover snapshots; this asks for direction of competitive change. | High |
| Goal Deadline Quarter vs Debt Burst Month | Cross-Feature | Medium | Heatmap | Do heavy debt months line up with quarters that also carry many goal deadlines? | It exposes timing collisions between debt strain and planning commitments. | Debt monthly totals, goal deadline quarter counts | Yes - Debt x Goals | This is a timing-collision question, not a burden-versus-income or simple goal-pressure view. | Medium |
| Subscription Renewal Crowding by Week | Analytics | Medium | Heatmap | Which weeks of the month accumulate the highest stack of subscription renewals? | It helps users understand whether passive recurring charges are crowding one cash window. | Recurring or subscription-tagged transactions by week of month | No | Subscription load charts show totals, not renewal crowding concentration. | High |
| Store Category Substitution Spread | Fridge | Low | Parallel coordinates | Which stores force users into different category mixes from trip to trip? | It reveals where store choice changes basket composition instead of just price. | Store-level category shares by receipt and month | No | Existing store charts focus price and breadth, not substitution spread across categories. | Medium |
| Paycheck-to-Paycheck Carry Ratio | Savings | Medium | Bullet bar | How much cash usually makes it from one paycheck window into the next? | It turns monthly safety into a pay-cycle carry measure users can act on. | Income events, balances before next income, carry ratio by pay window | No | Pay-cycle guidance exists, but not the carry ratio across consecutive paychecks. | High |
| Debt Stream Size Dispersion | Debt | Low | Boxplot | Which debt streams have the widest spread between small and large payment tickets? | It helps separate predictable debt from variable debt-like drains. | Debt-tagged descriptions and payment sizes by stream | No | This is about within-stream size spread, not timing or burden share. | High |
| Goal Label Commitment Ladder | Goals | Low | Dumbbell | Which labeled goals ask for much more monthly commitment than others relative to their target size? | It helps compare how aggressively each goal is being funded. | Goal labels, target amounts, monthly allocations | No | Goal allocation weight and pace dispersion ask different questions; this compares labeled commitment intensity side by side. | High |
| Other Pocket Renewal Pressure | Pockets | Low | Range plot | Which Other pockets recur often enough to behave like hidden subscriptions? | It makes the Other surface useful for recurring cash-pressure review. | Other pocket transactions, monthly gaps, repeat descriptions or tabs | No | Other-pocket volatility exists, but not hidden-renewal pressure by pocket. | Medium |
| Settlement Batch Size by Room | Friend Rooms | Low | Boxplot | Which rooms settle in many small cleanup batches versus fewer large ones? | It reveals whether settlement culture is drip-by-drip or periodic reset. | Settled split batches by room and timestamp | No | Weekend bias and queue age do not show settlement batch shape. | High |
| Metric Specialist Concentration | Challenges | Low | Treemap | Which members dominate one metric without showing the same strength elsewhere? | It separates specialists from well-rounded leaders. | Challenge wins or score leadership by member and metric | No | Metric breadth exists as a top-tier idea, but this asks who is isolated into one specialty. | High |
| Subscription Renewal vs Goal Allocation Tightness | Cross-Feature | Low | Scatter plot | Do months with denser subscription renewal stacks leave goal allocations tighter? | It connects passive recurring clutter to planning pressure. | Subscription renewal counts, goal allocation totals, monthly slack | Yes - Analytics x Goals | This is renewal-density versus planning tightness, not generic recurring burden. | Medium |
| Merchant Shock Interval Map | Analytics | Low | Heatmap | Which merchants appear in unusually expensive bursts with the shortest cooldown between shocks? | It helps users spot merchants that create repeated expensive episodes. | Merchant-normalized expensive-day intervals and cooldown timing | No | Shock maps exist conceptually, but this focuses cooldown interval rather than amount or count. | Medium |
| Weekend Pantry Fill Rate | Fridge | Low | Pictorial bar | Which pantry categories get refilled most heavily on weekends? | It gives weekend grocery behavior a clear pantry-restock lens instead of another total-spend cut. | Pantry-tagged receipt categories, weekend versus weekday counts | No | Fresh versus pantry timing covers day-of-month timing, not weekend refill rate by pantry group. | Medium |

## 2. Best of Batch

Top 20 strongest charts from this run:

1. Receipt Cost Concentration by Line
2. Multi-Income Cushion Advantage
3. Debt Burst Month Share
4. Housing Obligation Mix by Property
5. Room Category Concentration of Pending Balance
6. Challenge Spend Pace Variance
7. Weekend Spillover by Category
8. Fresh vs Pantry Timing Calendar
9. Bill Week Recovery Lag
10. Goal Funding Shape Mix
11. Grocery Store Mix vs Challenge Fridge Score
12. Pocket Fixed-Cost Start-of-Month Load
13. Metric Breadth by Member
14. Subscription Load vs Flex Spend
15. Category Price Season Window
16. Safe Spend Pace by Pay Cycle
17. Debt vs Essentials Burden Split
18. Fronted Category Mix by Room
19. Vehicle Maintenance Month vs Buffer Drop
20. Subscription Load vs Challenge Wants Score

Important large-run rule applied:
- the table above is ordered from strongest to weakest using the scoring rubric
- the top 20 ideas are intended for active `/testCharts` materialization in this round
- the remaining 80 ideas stay preserved in the ranked manifest for later shortlist or approval decisions

## 3. `/testCharts` Materialization Target

Top-20 section counts for the active review batch:

| Section | Count |
|---|---:|
| Analytics | 2 |
| Fridge | 3 |
| Savings | 3 |
| Debt | 2 |
| Goals | 1 |
| Pockets | 2 |
| Friend Rooms | 2 |
| Challenges | 2 |
| Cross-Feature | 3 |
| **Total** | **20** |

Visible review shortlist:
- Receipt Cost Concentration by Line
- Multi-Income Cushion Advantage
- Debt Burst Month Share
- Housing Obligation Mix by Property
- Room Category Concentration of Pending Balance
- Challenge Spend Pace Variance
- Weekend Spillover by Category
- Fresh vs Pantry Timing Calendar
- Bill Week Recovery Lag
- Goal Funding Shape Mix
- Grocery Store Mix vs Challenge Fridge Score
- Pocket Fixed-Cost Start-of-Month Load
- Metric Breadth by Member
- Subscription Load vs Flex Spend
- Category Price Season Window
- Safe Spend Pace by Pay Cycle
- Debt vs Essentials Burden Split
- Fronted Category Mix by Room
- Vehicle Maintenance Month vs Buffer Drop
- Subscription Load vs Challenge Wants Score

## 4. Quality Gate

- Verdict: `Pass`
- Non-duplication: strong relative to the current approved and rejected memory, with the newly approved March 30 favorites now treated as off-limits
- Schema grounding: strongest for Analytics, Fridge, Savings, Friend Rooms, and Challenges; medium for some debt and cross-feature timing comparisons
- Product balance: broad spread across domains without falling back into grocery-heavy or line-heavy ideation
- Import readiness: strong for the visible top 20, with the shortlist shaped for clone-spec mock-data materialization in `/testCharts`
