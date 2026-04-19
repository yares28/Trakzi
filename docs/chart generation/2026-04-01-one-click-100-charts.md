# One-Click Ideation Run - 100 Charts - April 1, 2026

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
- `TESTCHARTS_PLAYGROUND_PROTOCOL.md`
- `READY_TO_IMPORT_DELIVERY_STANDARD.md`
- `MOCK_DATA_IDEATION_STANDARD.md`

Batch targets satisfied:
- Exactly 100 ranked ideas
- Weighted heavily toward useful, high-demand information
- Current existing, approved, and rejected memory respected
- Top 20 intended for live `/testCharts` materialization
- Full production clone-spec card path retained
- Mock-data ideation mode retained with no live transaction wiring
- Broad domain spread across Analytics, Fridge, Savings, Debt, Goals, Pockets, Friend Rooms, Challenges, and Cross-Feature
- Low grocery bias relative to the full pool
- Low line-chart reliance
- Full ranking preserved in this manifest

The `Proposed Charts` table is already ordered from highest weighted priority to lowest. The weighting favors usefulness, demand, clarity, and importability over novelty alone.

## 1. Proposed Charts

| Chart Title | Page / Domain | Level | Chart Type | Core Question | Why It Matters | Primary Data Needed | Cross-Feature? | Why It Is Original / Not A Duplicate | Extraction Confidence |
|---|---|---|---|---|---|---|---|---|---|
| Paycheck-to-Paycheck Carry Ratio | Savings | High | Bullet bar | How much cash typically survives from one income window into the next income window? | It gives the user a pay-cycle safety measure that is easier to act on than a month-end balance alone. | Income dates, daily balances, carry amount before next income | No | Existing savings charts show closes, floors, and retention, but not cross-paycheck carry as the main question. | High |
| Subscription Renewal Crowding by Week | Analytics | High | Heatmap | Which week of the month accumulates the densest stack of subscription and recurring renewals? | It shows whether passive charges are crowding one cash window instead of arriving smoothly. | Recurring or subscription-like transactions by week of month | No | Current recurring charts show share, not renewal-density concentration inside the month. | High |
| Category Recovery Window After Overspend | Analytics | High | Range plot | After a category breaks budget, how long does it take that category to return to its normal spend band? | It distinguishes categories that self-correct quickly from categories that stay out of control. | Daily category spend, category budgets, rolling category baseline | No | Budget pace charts show when pressure happens, not how long recovery actually takes. | High |
| Cushion Use-Then-Rebuild Ratio | Savings | High | Split bar | In weak months, how much buffer gets used and how much gets rebuilt before the month closes? | It turns cushion management into a visible resilience pattern instead of a single closing snapshot. | Opening balance, monthly floor, closing balance, inferred draw and rebuild amounts | No | Savings memory covers size and safety, not the use-versus-rebuild balance within the same month. | High |
| Deadline Cluster Weight by Category | Goals | High | Treemap | Which goal categories absorb the heaviest share of near-term deadline pressure? | It makes urgency easier to reason about when several goal types compete for money at once. | Goal categories, deadlines, target amounts, monthly allocations | No | Approved goal charts focus individual goals and deadline order, not category-level urgency concentration. | High |
| Store Markdown Capture Rate | Fridge | High | Grouped bar | Which stores most often produce category-normalized bargain wins inside otherwise ordinary baskets? | It separates stores that occasionally look cheap from stores that repeatedly generate real savings opportunities. | Store names, unit-price outliers, category-normalized price comparisons | No | Existing store charts focus level and spread, not how often a store actually delivers markdown-like wins. | High |
| Pocket Tab Volatility by Type | Pockets | High | Grouped bar | Which pocket tabs swing the most inside vehicles, housing, travel, and other surfaces? | It shows where sinking-fund planning is most needed inside each pocket surface. | Pocket type, `pocket_transactions.tab`, monthly totals by tab | No | The current pocket memory focuses burden totals, not volatility by tab across pocket types. | High |
| Member Settlement Response Time | Friend Rooms | High | Boxplot | Which members settle quickly after being asked and which ones consistently drag their feet? | It turns settlement friction into a person-level operational signal that is easy to act on. | `transaction_splits.status`, `settled_at`, member identity, room linkage | No | Rejected room charts covered lag distributions at room level, not member response-time behavior. | High |
| Metric Leader Gap Momentum | Challenges | High | Arrow plot | Is the distance from first place to the pack widening or tightening by metric over time? | It shows whether a metric is becoming more competitive or more one-sided. | Monthly challenge-group results by metric, rank gap to leader | No | Existing challenge memory covers breadth and rejected turnover variants, not direction of leader-gap change. | High |
| Debt Ticket Variance by Week of Month | Debt | High | Boxplot | Does debt payment size stay stable across the month or spike in specific weekly windows? | It shows whether debt pain is evenly distributed or concentrated into a few heavy weeks. | Debt-tagged payment sizes, week-of-month buckets, recurring streams | No | Debt memory covers burden share, not ticket-size variance by weekly position. | High |
| Room Fronting vs Low-Balance Exposure | Cross-Feature | High | Scatter plot | Do heavier fronting months coincide with more low-balance exposure for the person covering the room? | It connects social burden-sharing to real cash-safety strain. | Fronted shared totals, monthly low-balance exposure, room linkage | Yes - Friend Rooms x Savings | It links fronting load directly to balance risk instead of repeating generic shared-spend summaries. | Medium |
| Store Price Floor Reliability | Fridge | High | Heatmap | Which stores most consistently deliver the lowest observed category price floors over time? | It shows where price leadership is dependable rather than occasional. | Store names, unit prices, category groups, month buckets | No | Approved store advantage charts compare levels; this asks whether low-price leadership repeats reliably. | High |
| Budget Miss Day Clusters | Analytics | High | Heatmap | Which days of the month cluster the highest number of over-budget category misses? | It turns monthly budget pain into a timing problem the user can plan around. | Daily category spend, category budgets, day-of-month breach flags | No | Merchant Budget Miss Map is merchant-led; this chart is calendar-led and budget-day oriented. | High |
| Opening Balance Reliance by Pay Cycle | Savings | High | Grouped bar | How much of a safe pay cycle comes from starting cash versus new inflow that arrives during the cycle? | It reveals whether strong cycles are earned by fresh cash flow or inherited from prior cushion. | Opening balance, pay-cycle windows, income totals, cycle-end safety state | No | Existing savings charts do not split pay-cycle safety into opening-cash versus fresh-inflow dependence. | High |
| Goal Portfolio Deadline Gaps | Goals | Medium | Range plot | Are there long quiet gaps between goal deadlines or constant compression all year? | It helps the user understand whether the portfolio cadence is calm or relentlessly crowded. | Goal deadlines, labels, goal categories | No | Approved goal charts cover order and horizon balance, not gap structure between deadline clusters. | High |
| Other Pocket Renewal Pressure | Pockets | Medium | Range plot | Which Other pockets recur often enough to behave like hidden subscriptions? | It makes the Other pocket surface useful for recurring cash-pressure review. | Other-pocket linked transactions, monthly gaps, repeat descriptions or tabs | No | Current pocket ideas do not turn Other pockets into renewal-pressure signals. | Medium |
| Settlement Batch Size by Room | Friend Rooms | Medium | Boxplot | Which rooms settle in many small cleanup batches versus fewer large reset moments? | It shows whether settlement culture is drip-by-drip or periodic reset. | Settled split batches by room and timestamp | No | Room charts cover pressure and settlement status, not the shape of settlement batch behavior. | High |
| Challenge Engagement Decay Curve | Challenges | Medium | Funnel | Across active challenge windows, how many members stay visibly engaged from start to midpoint to close? | It measures challenge stickiness rather than just final scores. | Challenge windows, scored months, active-result participation presence | No | Existing challenge charts focus breadth and performance, not engagement retention across the window. | Medium |
| Goal Deadline Quarter vs Debt Burst Month | Cross-Feature | Medium | Heatmap | Do heavy debt months line up with quarters that also carry many goal deadlines? | It exposes timing collisions between debt strain and planning commitments. | Debt monthly totals, goal deadline-quarter counts | Yes - Debt x Goals | It is a timing-collision view rather than another burden-versus-income or goal-feasibility chart. | Medium |
| Cushion Depth vs Essential Median | Savings | Medium | Bullet bar | How many median essential-spend days could the usual monthly cushion absorb? | It grounds safety in essential behavior instead of all-expense averages. | Essential category medians, cushion values, monthly balance context | No | Existing safety ratios use grocery or total-expense logic; this focuses essential-day depth. | High |
| Essential Stack by Pay Window | Analytics | Medium | Stacked bar | How much of each pay window is consumed by housing, groceries, utilities, and transport before flexible categories begin? | It shows where the paycheck really goes at the decision window users feel most. | Income-window segments and essential category totals | No | Existing category and budget charts do not reframe essentials inside pay windows. | High |
| Basket Value Density Corridor | Fridge | Medium | Range plot | How tightly do basket totals track line count, and where do outlier baskets break the normal corridor? | It separates normal stock-ups from unexpectedly expensive baskets. | Basket totals, line counts, outlier range by store or month | No | Fridge charts cover basket size and ranges, not the normal value corridor versus expensive exceptions. | High |
| Debt Interval Compression by Stream | Debt | Medium | Arrow plot | Are debt payment gaps tightening into stressful clusters for specific debt streams? | It shows when debt timing starts to compress instead of staying predictable. | Debt-tagged payment intervals by description or stream | No | Debt timing ideas in memory focus distance to payday, not compression inside the debt stream itself. | High |
| Goal Allocation Spread by Size Band | Goals | Medium | Grouped bar | Do larger goals receive proportionally larger monthly allocations, or do they stay underweighted? | It reveals whether visually impressive goals are actually backed by commitment. | Goal target amounts grouped into size bands plus monthly allocations | No | Approved goal charts do not compare contribution behavior across target-size bands. | High |
| Property Fee Clustering by Week | Pockets | Medium | Heatmap | Which weeks of the month absorb the most property-fee and utility pressure? | It makes housing cash drag easier to schedule around. | Property pockets, tab totals, week-of-month timing | No | Pocket memory lacks a weekly clustering view for housing obligations. | High |
| Shared Receipt Size vs Settlement Delay | Friend Rooms | Medium | Scatter plot | Do larger shared receipts lead to longer settlement delays, or is delay unrelated to amount? | It shows whether settlement drag is mostly a size problem or a behavior problem. | Shared receipt totals, linked splits, settlement timestamps | No | This is not another lag distribution; it explains delay against receipt size. | High |
| Consistency Premium by Metric | Challenges | Medium | Grouped bar | Which challenge metrics reward steady monthly performance more than occasional spikes? | It helps judge whether the metric set favors discipline or volatility. | Metric scores, points, month-by-month variance by member | No | Breadth and rank charts exist, but this isolates the premium paid to steadiness by metric. | High |
| Grocery Promo Capture vs Cushion Rebuild | Cross-Feature | Medium | Scatter plot | Do months with stronger grocery deal capture rebuild cushion faster after dips? | It tests whether grocery discipline visibly helps cash recovery. | Grocery price-win signals and monthly cushion rebuild amount | Yes - Fridge x Savings | It ties grocery efficiency directly to rebound quality rather than overall grocery share. | Medium |
| Post-Income Category Activation Ladder | Analytics | Medium | Arrow plot | How many days after income lands does each category usually activate? | It reveals which categories immediately absorb fresh cash and which wait. | Positive transaction dates and subsequent category timing | No | Existing payday charts do not ladder category activation delay across the month. | Medium |
| Category Promotion Dependence by Store | Fridge | Medium | Grouped bar | Which stores rely most on a few promo-sensitive categories to look cheap? | It helps users see where low totals are driven by narrow category wins rather than broad value. | Store totals, category-normalized price wins, promo-sensitive category groups | No | Price index charts show level; this shows dependence on narrow promotional pockets. | Medium |
| Pay Cycle Safety Reserve Spread | Savings | Medium | Range plot | How wide is the spread between weakest and strongest safety reserve across recent pay cycles? | It shows whether pay-cycle safety is stable or highly uneven. | Pay-cycle segmentation, reserve depth, carry into next income | No | Current savings charts are month-centric; this makes pay-cycle spread the main signal. | High |
| Debt Sequence Irregularity by Stream | Debt | Medium | Dot plot | Which debt streams vary the most in the order and spacing of their payments? | It highlights streams that are hardest to plan for because their cadence keeps changing. | Debt-tagged stream identification, payment ordering, interval variance | No | It focuses sequence irregularity, not total burden or payment share. | Medium |
| Goal Funding Load by Quarter | Goals | Medium | Stacked bar | How much planned funding load is packed into each quarter of the year? | It makes seasonal goal overload visible before deadlines collide. | Goal deadlines, monthly allocations, quarterly grouping | No | This is a planning-load view, not another deadline ladder or horizon mix. | High |
| Vehicle Cost Surprise Windows | Pockets | Medium | Heatmap | When do maintenance, insurance, and repair surprises most often hit vehicles? | It helps users know when the garage surface behaves like a shock source instead of a steady bill. | Vehicle pockets, tabged vehicle transactions, month and week timing | No | Pocket burden charts do not isolate surprise-prone windows for vehicles. | Medium |
| Split Status Aging by Room Role | Friend Rooms | Medium | Grouped bar | Do owner-led, admin-led, and member-led rooms age pending splits differently? | It shows whether room structure influences how fast shared costs get cleaned up. | Room roles, pending split age, room membership | No | Existing room charts do not compare split aging against room role structure. | High |
| Podium Entry Conversion Rate | Challenges | Medium | Funnel | How often do members who briefly approach the podium actually convert into a top-three finish? | It separates noisy challengers from members who can close. | Monthly rank positions, near-podium states, podium finishes | No | It focuses conversion into podium, not raw points or broad metric coverage. | High |
| Subscription Renewal Density vs Low-Balance Exposure | Cross-Feature | Medium | Scatter plot | Do months with denser renewal stacks also produce more low-balance days? | It links passive recurring clutter to balance strain. | Renewal counts by month and low-balance day exposure | Yes - Analytics x Savings | It is a recurrence-density versus balance-risk question, not a generic recurring-spend share cut. | Medium |
| Week-of-Month Essential Saturation | Analytics | Medium | Stacked bar | Which week of the month is most saturated by essential categories before optional spending appears? | It helps users see when the month feels structurally pre-committed. | Week-of-month category totals grouped into essential categories | No | The app covers day-of-week and month pace, not week-of-month essential saturation. | High |
| Broad-Type Value Density | Fridge | Medium | Grouped bar | Which broad grocery types create the most spend per unique item in a basket? | It distinguishes pricey basket types from simply larger baskets. | Broad type, unique-item counts, basket totals | No | Existing fridge charts do not quantify spend density per unique item by broad type. | High |
| First-Week Carryover Erosion | Savings | Medium | Bullet bar | How much of opening cushion typically survives the first week of each month? | It shows whether prior-month wins vanish immediately. | Opening balance, first-week floor, first-week spend totals | No | Month-end charts do not isolate first-week erosion of carryover cushion. | High |
| Debt Heavy-Week Recurrence | Debt | Medium | Dot plot | Which debt streams repeatedly produce the heaviest week of the month? | It reveals debt obligations that keep owning the same cash window. | Debt-tagged streams, weekly totals, recurrence counts | No | It studies recurring heavy weeks rather than total monthly burden. | High |
| Goal Pace Outlier Map | Goals | Medium | Heatmap | Which goals are repeatedly far above or below their required monthly pace? | It highlights portfolio outliers without flattening everything into one average pace. | Required monthly pace, actual monthly allocation, goal labels | No | Approved goal charts cover order and horizon, not repeated pace outliers by goal. | High |
| Housing Utility Weight vs Rent Weight | Pockets | Medium | Split bar | For each property, how much of the monthly load is rent or mortgage versus utilities and attached overhead? | It shows whether the obvious housing headline is hiding a meaningful overhead layer. | Property pocket tabs for rent, mortgage, utilities, fees | No | This differs from total burden by separating headline obligation from attached overhead. | High |
| Room Prompt-to-Settle Funnel | Friend Rooms | Medium | Funnel | Once a pending split exists, how many move from reminder to partial settlement to fully cleared? | It helps pinpoint where settlement friction is actually happening. | Reminder prompts, split status changes, settlement completion | No | It traces the cleanup path rather than only the current pending amount. | Medium |
| Score Compression by Metric | Challenges | Medium | Boxplot | Which metrics keep the field tightly packed and which ones create big score spread? | It reveals which metrics produce close races versus runaway leaders. | Monthly scores by metric, member score distributions | No | This differs from leader-gap direction by focusing on overall field compression. | High |
| Travel Pocket Spikes vs Carry Ratio | Cross-Feature | Medium | Scatter plot | Do travel-spend spike months leave less cash surviving into the next income cycle? | It connects travel bursts to pay-cycle safety instead of just total travel burden. | Travel-pocket monthly spikes and pay-cycle carry ratio | Yes - Pockets x Savings | It reframes travel as a carry-ratio risk rather than a pocket summary. | Medium |
| Merchant Shock Interval Map | Analytics | Medium | Heatmap | Which merchants create repeated expensive shocks with the shortest cooldown between them? | It helps users spot merchants that turn occasional overspend into a repeat pattern. | Merchant-normalized expensive-day intervals and cooldown timing | No | Merchant charts today show totals and budget misses, not shock interval structure. | Medium |
| Receipt Line Price Skew by Store | Fridge | Medium | Boxplot | Do some stores keep most lines near the median while others rely on a few very expensive lines? | It shows whether a store feels predictably priced or full of surprise spikes. | Store-level line totals, unit prices, within-receipt skew statistics | No | Existing store charts cover totals and dispersion, not skew of line-level pricing. | High |
| Closing Cushion Win Rate by Floor Band | Savings | Medium | Grouped bar | How often do months from low, medium, and high floor bands still close with a safe cushion? | It shows whether deep intramonth drops reliably doom the closing outcome. | Monthly floor bands, closing cushion state, recent balance history | No | It is about win rate by floor band, not rebound speed or floor size alone. | High |
| Debt-to-Income Reset Delay | Debt | Medium | Range plot | After a debt-heavy month, how long does it take debt share of income to return to normal range? | It shows whether debt spikes are isolated or leave a multi-month hangover. | Monthly debt-share-of-income values and return-to-band timing | No | Approved debt burden is a static share chart; this adds reset timing after spikes. | Medium |
| Deadline Collision Calendar | Goals | Medium | Heatmap | Which months cluster the highest number of active goal deadlines at once? | It turns abstract deadline pressure into a calendar the user can actually plan around. | Goal deadlines, goal counts, goal categories | No | This is a calendar-collision view, not another ranking of single deadlines. | High |
| Travel Pocket Burst Spacing | Pockets | Medium | Range plot | How long are the gaps between travel-pocket bursts for each trip or country cluster? | It shows whether travel costs come in one wave or keep reactivating the pocket. | Travel-pocket transactions grouped by country or trip cluster, burst gaps | No | Travel concentration charts explain where money went, not how bursts are spaced. | Medium |
| Shared Expense Wave by Weeknight | Friend Rooms | Medium | Heatmap | Which rooms build shared-expense waves on weeknights instead of weekends? | It distinguishes routine weekday coordination from social-weekend spending. | Shared transaction dates, room linkage, weekday and weeknight buckets | No | It is about weekday patterning of shared waves, not queue age or fronting totals. | High |
| Leaderboard Month-to-Month Rank Distance | Challenges | Medium | Dumbbell | How far do members usually move between one month and the next inside the leaderboard? | It quantifies leaderboard turbulence without reducing it to who won. | Monthly rank positions by member | No | It measures typical rank travel, which differs from breadth, spread, or points totals. | High |
| Goal Deadline Clusters vs Fixed-Bill Retention | Cross-Feature | Medium | Scatter plot | Do quarters with more goal deadlines coincide with weaker fixed-bill retention of income? | It tests whether planning pressure shows up in cash left after fixed obligations. | Goal deadline-quarter counts and fixed-bill retention rates | Yes - Goals x Savings | It connects portfolio timing pressure to a savings-quality outcome instead of another deadline ladder. | Medium |
| Essential-to-Flex Hand-off by Week | Analytics | Medium | Arrow plot | At what point in a normal month does flexible spending overtake essentials as the main driver? | It helps users understand when the month stops being obligation-led and becomes behavior-led. | Weekly essential totals and flexible category totals | No | The app has obligation and mix charts, but not a hand-off timing chart between essentials and flex. | High |
| Weekend Pantry Fill Rate | Fridge | Medium | Pictorial bar | Which pantry categories are refilled most heavily on weekends? | It gives weekend grocery behavior a useful pantry-restock lens instead of another total-spend cut. | Pantry-tagged receipt categories, weekend versus weekday counts | No | Existing fridge timing charts do not isolate pantry refill behavior by category family. | Medium |
| Income Cluster Cushion Dependence | Savings | Medium | Grouped bar | Do months with tightly clustered income events depend more on cushion than months with evenly spaced income? | It shows whether income timing pattern changes safety quality even at similar totals. | Income-event spacing, cushion depth, monthly safety state | No | Current savings charts do not compare cushion dependence by income clustering pattern. | Medium |
| Debt Payment Weekload Split | Debt | Medium | Split bar | Is debt load concentrated in the first half or second half of the month across streams? | It offers a practical scheduling view of debt stress without relying on payday framing. | Debt-tagged payments by half-month or week band | No | It is a weekly load split, not a debt-share or debt-date chart. | High |
| Target Size vs Contribution Persistence | Goals | Medium | Scatter plot | Do larger targets keep attracting contributions month after month or fade after the first push? | It helps distinguish inspiring goals from abandoned big ideas. | Goal targets and month-by-month contribution persistence flags | No | This focuses persistence against target size, which current goal charts do not show. | Medium |
| Vehicle Service Reserve Adequacy | Pockets | Medium | Bullet bar | Is each vehicle's recent maintenance pattern covered by a realistic reserve, or does it keep outrunning one? | It turns garage history into a concrete reserve-planning question. | Vehicle maintenance totals, service intervals, recent service peaks | No | It adds a reserve adequacy question rather than another vehicle cost summary. | Medium |
| Balance Relief After Partial Settlements | Friend Rooms | Medium | Grouped bar | When a room settles only part of what is pending, how much does that partial cleanup reduce payer pressure? | It shows whether partial settlement behavior is meaningfully helpful or mostly cosmetic. | Partial settlement amounts, fronted balances, room linkage | No | The room memory focuses full pending states, not relief from partial cleanup behavior. | Medium |
| Points Momentum vs Score Momentum | Challenges | Medium | Parallel coordinates | Are members gaining points because their raw scores are improving, or just because the field weakens around them? | It separates true performance improvement from leaderboard luck. | Monthly raw scores, points awarded, member sequence over time | No | It compares score direction to points direction rather than summarizing either alone. | Medium |
| Store Price Floor Reliability vs Grocery Budget Recovery | Cross-Feature | Medium | Scatter plot | Do months with more reliable store price floors recover grocery budget pressure faster? | It connects store choice quality to later budget stabilization. | Store floor-reliability signal and grocery-budget recovery time | Yes - Fridge x Analytics | It links pricing reliability to recovery quality instead of repeating pure store or pure budget charts. | Medium |
| Flex Spend Rebound After Fixed Bills | Analytics | Medium | Range plot | How quickly does discretionary spending return after the main fixed-bill wave passes? | It shows whether flex behavior snaps back immediately or stays suppressed. | Fixed-bill timing windows and discretionary spend recovery timeline | No | It measures rebound of flexible spend, not fixed-bill share or total load. | Medium |
| Basket Discount Efficiency by Size | Fridge | Medium | Scatter plot | Do larger baskets actually capture better unit economics, or do they just get more expensive? | It helps users see whether stock-up shopping is paying off. | Basket size, total spend, normalized unit-price savings by basket | No | Basket size charts do not compare basket growth against discount efficiency. | High |
| Median Safe-Day Distance to Payday | Savings | Medium | Dot plot | How many safe days typically remain before the next income arrives? | It converts balance safety into a countdown-style operating measure. | Daily balance states and next-income distance | No | Savings charts show days funded and runway, but not safe-day distance to the next payday. | Medium |
| Debt Stream Calendar Drift | Debt | Medium | Range plot | Are debt streams landing in the same calendar windows or drifting later across recent months? | It shows whether debt timing is stable or sliding into worse parts of the month. | Debt stream dates over multiple months, drift range | No | It focuses calendar drift rather than simple regularity or burden share. | Medium |
| Goal Required Pace Change if One Goal Pauses | Goals | Medium | Waterfall | If one active goal pauses, how much pace pressure disappears from the rest of the portfolio? | It helps the user understand the real relief from pausing a goal. | Active goal required monthly pace and portfolio totals | No | It is a decision-support chart about pause impact, not just current pressure. | Medium |
| Pocket Fixed Load Seasonality by Surface | Pockets | Medium | Stacked bar | Which pocket surfaces show the most seasonal fixed-load pressure across the year? | It helps users know whether housing, travel, vehicles, or other pockets create calendar-season stress. | Pocket type, fixed tab totals, monthly seasonality | No | It compares seasonal fixed load by surface, which current pocket charts do not do. | Medium |
| Member Payment Rotation Stability | Friend Rooms | Medium | Heatmap | Does one person keep becoming the payer in the same room, or does the burden rotate fairly? | It surfaces hidden payer habits before resentment builds. | Room payer identity by transaction over time, member rotation pattern | No | It studies payer rotation rather than member share versus payment share in one snapshot. | High |
| Challenge Window Overlap Pressure | Challenges | Medium | Heatmap | Which months overload users with too many active challenge windows at once? | It helps keep the social layer motivating instead of exhausting. | Challenge start dates, end dates, active-window overlap counts | No | It is a scheduling-density chart, not another results or rank chart. | High |
| Housing Fee Peaks vs Debt Timing Drift | Cross-Feature | Medium | Scatter plot | Do heavy housing-fee weeks also push debt payments into worse timing windows? | It connects housing spikes to debt-scheduling stress. | Property-fee weeks and debt payment drift signals | Yes - Pockets x Debt | It compares housing timing stress to debt timing drift instead of pure burden totals. | Medium |
| Budget Breach Daypart Split | Analytics | Medium | Split bar | Are budget breaches happening in daytime routine spending or in late-day behavior-heavy windows? | It adds a timing behavior layer to budget misses. | Budget-breach transactions grouped by daypart | No | Budget miss charts today do not split breaches by daypart behavior. | Medium |
| Same-Day Store Switching Pressure | Fridge | Medium | Grouped bar | Do multi-store shopping days create more grocery pressure than single-store days? | It shows whether store hopping is actually costing more. | Same-day receipt groups, store count, total spend per day | No | Existing store charts do not ask whether same-day switching lifts grocery pressure. | High |
| Cushion Stability vs Expense Concentration | Savings | Medium | Scatter plot | Do months dominated by one or two large expenses end with less stable cushion behavior? | It shows whether concentration of spend is a stronger safety risk than spend size alone. | Monthly expense concentration and cushion volatility measures | No | It connects concentration structure to cushion stability rather than simply ranking expenses. | Medium |
| Debt Stream Size Dispersion | Debt | Medium | Boxplot | Which debt streams show the widest spread between small and large payment tickets? | It separates predictable obligations from variable drains. | Debt stream labels and ticket-size distributions | No | It studies within-stream spread rather than totals or timing alone. | High |
| Goal Label Commitment Ladder | Goals | Medium | Dumbbell | Which labeled goals ask for much more monthly commitment than others relative to their target size? | It helps compare how aggressively each goal is being funded. | Goal labels, target amounts, monthly allocations | No | It compares commitment intensity by label, which is different from approved coverage and horizon views. | High |
| Travel Destination Recurrence by Quarter | Pockets | Low | Grouped bar | Which destinations keep reappearing across quarters instead of being one-off trips? | It helps the travel surface distinguish repeat habits from singular travel spikes. | Travel-pocket country totals by quarter | No | It asks recurrence of destinations over time rather than travel burden totals. | Medium |
| Shared Receipt Drift by Room | Friend Rooms | Low | Dot plot | Which rooms are seeing shared receipts get more item-dense over time? | It shows where grocery coordination is getting more complex. | Shared receipt items, room linkage, item count per shared receipt over time | No | Existing room ideas focus balances and settlement, not receipt-complexity drift. | Medium |
| Metric Specialist Drift Over Time | Challenges | Low | Parallel coordinates | Are members becoming more specialized in one metric or broadening over time? | It shows whether the challenge layer is creating all-rounders or narrow specialists. | Metric ranks or scores by member over time | No | Approved breadth is a snapshot; this adds direction of specialization change. | Medium |
| Room Settlement Response vs Challenge Consistency | Cross-Feature | Low | Scatter plot | Do people who settle shared costs reliably also post steadier challenge performance? | It connects social follow-through to score consistency without exposing raw amounts. | Settlement response-time signal and challenge consistency metric | Yes - Friend Rooms x Challenges | It compares two behavior-quality signals rather than raw spend or points totals. | Medium |
| Category Quiet-Day Reliance | Analytics | Low | Split bar | Does the month stay healthy because of many calm low-spend days or because a few big days happen not to recur? | It separates structural calm from temporary luck. | Daily spend totals, calm-day flags, monthly health state | No | Existing analytics charts count activity and spikes, not reliance on calm days. | Medium |
| Price Surprise Persistence by Category | Fridge | Low | Heatmap | Which categories keep reappearing as surprise-price offenders across months? | It helps users know which categories need repeated monitoring rather than one-off store changes. | Category-level unit-price outlier counts by month | No | Outlier trackers exist by unit price, but this asks whether surprises persist month after month. | High |
| Safety Window by Fixed-Bill Stack | Savings | Low | Bullet bar | After the main fixed-bill stack lands, how many safe days does the month usually retain? | It turns fixed-bill pressure into an intuitive post-bill safety window. | Fixed-bill timing, daily balances, post-bill safe-day counts | No | It reframes safety specifically after the fixed-bill wave, not across the whole month. | Medium |
| Debt Ticket Escalation Ladder | Debt | Low | Arrow plot | Are debt payment tickets drifting upward over time even when frequency looks steady? | It can reveal creeping burden before debt share obviously worsens. | Debt stream labels and median payment size by month | No | It is about ticket escalation rather than burden split or week placement. | Medium |
| Goal Allocation Tightness by Deadline Band | Goals | Low | Grouped bar | Are short-horizon goals funded tightly enough compared with medium and long-horizon goals? | It shows whether the portfolio is underfunding urgency. | Deadline bands and monthly allocations versus required pace | No | It compares tightness by deadline band, not simple deadline order or horizon share. | High |
| Other Pocket Spend Evenness | Pockets | Low | Dot plot | Is Other-pocket spend spread evenly across items or dominated by one or two drains? | It gives the Other surface a simple concentration read without flattening it into generic spend. | Other-pocket totals by item with evenness metric | No | Other-pocket charts are scarce; this adds an easy concentration question. | Medium |
| Fronting Repeaters by Month | Friend Rooms | Low | Ranked list | Which members repeatedly end up fronting shared costs month after month? | It identifies people who become the default float providers. | Shared uploader data, room linkage, month-level fronting frequency | No | It is a repeat-behavior ranking, not the rejected fronting-imbalance framing. | High |
| Member Recovery Speed After Missed Month | Challenges | Low | Range plot | After a bad month, how quickly do members climb back toward their usual range? | It distinguishes durable competitors from members who disappear after setbacks. | Member monthly ranks or scores relative to personal baseline | No | It is about recovery duration rather than pure rank comeback count. | Medium |
| Pocket Tab Volatility vs Goal Pause Risk | Cross-Feature | Low | Scatter plot | Do more volatile ownership tabs coincide with a higher risk that a goal has to pause? | It connects pocket unpredictability to planning fragility. | Pocket tab volatility and goal pause or underfunding risk signal | Yes - Pockets x Goals | It links ownership volatility to planning fragility rather than pure burden totals. | Medium |
| Small-Ticket Drift After Overspend | Analytics | Low | Grouped bar | After a major over-budget day, do small discretionary tickets shrink or stay sticky? | It shows whether users actually tighten up after a bad day. | Overspend-day flags and subsequent small-ticket discretionary transactions | No | It focuses post-shock small-ticket behavior rather than aggregate category totals. | Medium |
| Store Mission Stability by Weekday | Fridge | Low | Heatmap | Does each store keep the same weekday mission profile, or does its basket role change throughout the week? | It reveals whether a store is predictably a refill stop, a stock-up trip, or an opportunistic detour. | Store name, weekday, basket totals, basket line counts | No | Existing timing charts show when shopping happens, not whether the mission stays stable by weekday. | Medium |
| Closing Safety by Income-Day Spacing | Savings | Low | Range plot | How does closing safety vary when income events are tightly spaced versus widely spaced? | It shows whether income spacing quality matters as much as income count. | Income-event spacing by month and closing safety state | No | It adds spacing quality to the safety conversation instead of using counts alone. | Medium |
| Debt Monthly Burden Volatility by Pay Frequency | Debt | Low | Grouped bar | Do months with more income events smooth debt burden or simply create more debt movement? | It tests whether income frequency changes debt stability. | Debt burden by month plus income-event frequency | No | It compares debt volatility against pay frequency rather than static debt share of income. | Medium |
| Goal Deadline Spillover into Next Quarter | Goals | Low | Waterfall | If the current quarter slips, how much deadline pressure spills into the next quarter? | It helps users see the scheduling cost of delay before they miss a target. | Goal deadlines, required pace, slip assumptions by quarter | No | It models deadline spillover rather than just current pressure or ordering. | Medium |
| Travel Country Cost Evenness | Pockets | Low | Dot plot | Is travel spend spread across countries or dominated by one expensive destination? | It gives the travel surface an evenness read instead of just total spend by country. | Country-level travel totals and evenness metric | No | It asks about evenness of the travel mix, not raw travel concentration or country ranking. | Medium |
| Settlement Rebound After Weekend Trips | Friend Rooms | Low | Grouped bar | Do rooms recover their pending balance faster after weekend-trip spending than after ordinary shared weeks? | It shows whether trip-style rooms clean up quickly or carry hangover debt. | Weekend-trip shared spend and subsequent settlement reduction timing | No | It is a rebound comparison between trip weeks and normal weeks, not queue age. | Medium |
| Metric Entry Barrier by Score Band | Challenges | Low | Funnel | How hard is it to break into the top score bands for each metric? | It shows which metrics feel accessible and which discourage newcomers. | Metric score distributions and score-band counts | No | It studies the barrier to entry by score band rather than podium share or leader gap. | Medium |
| Shared Settlement Delay vs Wants Control Score | Cross-Feature | Low | Scatter plot | Do months with slower shared-settlement cleanup line up with weaker wants-control challenge scores? | It connects follow-through on shared money to a privacy-safe discipline metric. | Settlement delay signal and wants-control challenge score | Yes - Friend Rooms x Challenges | It links settlement discipline to score quality without exposing raw shared-dollar comparisons. | Medium |
## 2. Best of Batch

Top 20 weighted scorers from this run:

1. Paycheck-to-Paycheck Carry Ratio - `96/100`
2. Subscription Renewal Crowding by Week - `95/100`
3. Category Recovery Window After Overspend - `95/100`
4. Cushion Use-Then-Rebuild Ratio - `94/100`
5. Deadline Cluster Weight by Category - `94/100`
6. Store Markdown Capture Rate - `93/100`
7. Pocket Tab Volatility by Type - `92/100`
8. Member Settlement Response Time - `92/100`
9. Metric Leader Gap Momentum - `91/100`
10. Debt Ticket Variance by Week of Month - `91/100`
11. Room Fronting vs Low-Balance Exposure - `90/100`
12. Store Price Floor Reliability - `90/100`
13. Budget Miss Day Clusters - `90/100`
14. Opening Balance Reliance by Pay Cycle - `89/100`
15. Goal Portfolio Deadline Gaps - `89/100`
16. Other Pocket Renewal Pressure - `88/100`
17. Settlement Batch Size by Room - `88/100`
18. Challenge Engagement Decay Curve - `88/100`
19. Goal Deadline Quarter vs Debt Burst Month - `88/100`
20. Cushion Depth vs Essential Median - `88/100`

Important large-run rule applied:
- the full `Proposed Charts` table is ranked from strongest to weakest
- the top 20 ideas above are the only ones intended for active `/testCharts` materialization in this round
- the remaining 80 ideas stay preserved in this ranked manifest for later shortlist or approval decisions

## 3. `/testCharts` Materialization Target

Top-20 section counts for the active review batch:

| Section | Count |
|---|---:|
| Analytics | 4 |
| Fridge | 2 |
| Savings | 4 |
| Debt | 1 |
| Goals | 2 |
| Pockets | 2 |
| Friend Rooms | 2 |
| Challenges | 2 |
| Cross-Feature | 2 |
| **Total** | **20** |

Visible review shortlist:
- Paycheck-to-Paycheck Carry Ratio
- Subscription Renewal Crowding by Week
- Category Recovery Window After Overspend
- Cushion Use-Then-Rebuild Ratio
- Deadline Cluster Weight by Category
- Store Markdown Capture Rate
- Pocket Tab Volatility by Type
- Member Settlement Response Time
- Metric Leader Gap Momentum
- Debt Ticket Variance by Week of Month
- Room Fronting vs Low-Balance Exposure
- Store Price Floor Reliability
- Budget Miss Day Clusters
- Opening Balance Reliance by Pay Cycle
- Goal Portfolio Deadline Gaps
- Other Pocket Renewal Pressure
- Settlement Batch Size by Room
- Challenge Engagement Decay Curve
- Goal Deadline Quarter vs Debt Burst Month
- Cushion Depth vs Essential Median

## 4. Quality Gate

- Verdict: `Pass`
- Non-duplication: strong against current existing, approved, and rejected memory
- Schema grounding: strongest for Analytics, Fridge, Savings, Friend Rooms, and Goals; medium for some debt and cross-feature timing comparisons
- Product balance: broad spread across domains without falling back into grocery-heavy or line-heavy ideation
- Import readiness: strong for the visible top 20, with the shortlist shaped for full clone-spec production-card review in `/testCharts`
- Mock-data quality target: every visible top-20 card should use chart-specific, idealized, believable scenario data rather than live bundle wiring

## 5. Review Outcome on April 1, 2026

Moved into `To Be Implemented`:

- Paycheck-to-Paycheck Carry Ratio
- Store Price Floor Reliability
- Cushion Depth vs Essential Median

Discarded from the live shortlist and synced to rejected memory:

- Subscription Renewal Crowding by Week
- Category Recovery Window After Overspend
- Cushion Use-Then-Rebuild Ratio
- Deadline Cluster Weight by Category
- Store Markdown Capture Rate
- Pocket Tab Volatility by Type
- Member Settlement Response Time
- Metric Leader Gap Momentum
- Debt Ticket Variance by Week of Month
- Room Fronting vs Low-Balance Exposure
- Budget Miss Day Clusters
- Opening Balance Reliance by Pay Cycle
- Goal Portfolio Deadline Gaps
- Other Pocket Renewal Pressure
- Settlement Batch Size by Room
- Challenge Engagement Decay Curve
- Goal Deadline Quarter vs Debt Burst Month
