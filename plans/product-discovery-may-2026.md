# Product Discovery Plan — May 2026

**Date**: 2026-05-12
**Product Stage**: Existing product (continuous discovery)
**Discovery Question**: What new directions should Trakzi invest in to drive retention, engagement, and market expansion?

---

## Discovery Overview

This plan covers three ideas surfaced through a structured discovery process. Two are engineering-leverage plays on Trakzi's existing data moat; one is a behavioral finance feature targeting proactive engagement.

| # | Idea | Direction | Strategic Bet or Quick Win |
|---|------|-----------|---------------------------|
| 1 | Budget Guardrails with Burn Rate | Behavioral / Engagement | Strategic Bet |
| 2 | Natural Language Transaction Search | Engineering / UX | Quick Win (phased) |
| 3 | Receipt ↔ Statement Deduplication | Engineering / Data Quality | Quick Win (starts with a SQL query) |

---

## Idea 1 — Budget Guardrails with Burn Rate

### Description

Real-time category budgets displayed as fuel gauges — not just "you spent $X of $Y" but "at this pace you'll exceed your grocery budget 8 days early." Includes a projected overage amount and actionable alerts before month end.

### Why It Matters

Budget features are the highest-retention category in personal finance. The *burn rate* framing (projecting forward, not reporting backward) is a meaningful design bet against the "set budget once, ignore forever" graveyard pattern common in fintech.

---

### Critical Assumptions

| # | Assumption | Category | Priority |
|---|-----------|----------|----------|
| V1 | Users want to set budgets proactively, not just track retroactively | Value | 🔴 #1 |
| F1 | Statement/transaction data arrives with low enough latency for burn rates to feel live | Feasibility | 🔴 #2 |
| F2 | Projection model accuracy handles non-linear spend (rent on day 1, etc.) | Feasibility | 🔴 #3 |
| U1 | Users know what a reasonable budget is per category without guidance | Usability | 🟡 #4 |
| B1 | Budget-setting users retain at a higher rate than passive trackers | Viability | 🟡 #5 |
| V4 | Users trust auto-categorization enough to base budget decisions on it | Value | 🟡 #6 |
| U2 | Alert cadence can be tuned to feel helpful, not noisy | Usability | 🟢 #7 |
| V3 | Fuel gauge / forward projection is more motivating than a simple progress bar | Value | 🟢 #8 |
| B2 | Feature differentiates Trakzi from YNAB, Copilot, legacy Mint | Viability | 🟢 #9 |
| B3 | Re-engagement mechanics prevent the "set and forget" pattern | Viability | 🟢 #10 |

### Leap of Faith Assumptions
1. **Do users want to budget proactively?** — If false, zero adoption regardless of execution quality.
2. **Is data fresh enough for burn rates to feel real?** — Manual CSV import kills the core UX promise.
3. **Can we project accurately enough to avoid false alarms?** — Trust destruction = churn.

---

### Validation Experiments

#### Experiment B-1 — Budget Intent Survey (tests V1)
**Hypothesis**: >40% of active Trakzi users have tried to set a spending limit in the past 3 months (in any tool).
**Method**: In-app survey (PostHog), 3 questions max. Segment by import frequency.
**Success criteria**: >40% report active budget intent
**Effort**: Very Low (1 day)
**Timeline**: Week 1

#### Experiment B-2 — Fake Door Budget UI (tests V1 + U1)
**Hypothesis**: >20% of active users will click a "Set Budget" CTA in the analytics view.
**Method**: Add a "Set Budget" button to the category breakdown chart. On click: collect their target amount in a modal, confirm with "we'll alert you when you're close." Store input but don't enforce anything yet.
**Success criteria**: >20% click-through; >60% of clickers complete the modal
**Effort**: Low (2–3 days)
**Timeline**: Week 1–2

#### Experiment B-3 — Manual Burn Rate Alerts (tests V2 + U2)
**Hypothesis**: Users who receive a mid-month burn rate alert will open the app and adjust spending within 48 hours.
**Method**: Wizard of Oz — manually calculate burn rates for 20 opted-in users and send push notifications on day 12–15 of the month ("You're on pace to exceed groceries by $43").
**Success criteria**: >35% open rate; >15% take a visible in-app action within 48 hours
**Effort**: Low (manual, no automation)
**Timeline**: Week 2–3

#### Experiment B-4 — Projection Algorithm Spike (tests F2)
**Hypothesis**: A time-of-month-weighted projection model reduces false alarms vs. linear extrapolation by >50%.
**Method**: Backtest both models against 3 months of existing transaction data. Flag "false alarm" as any projection that exceeded actual end-of-month spend by >20%.
**Success criteria**: Weighted model false alarm rate < 10%
**Effort**: Medium (3–4 days engineering)
**Timeline**: Week 2

---

## Idea 2 — Natural Language Transaction Search

### Description

Vector embeddings over transaction descriptions stored in Neon via `pgvector`. Users type natural language queries — *"sushi restaurants last quarter"*, *"everything over $100 that wasn't rent"* — and get semantically ranked results. No new infrastructure required: pgvector is a Neon-native extension; embedding generation uses OpenAI `text-embedding-3-small` (~$0.00002/transaction).

### Why It Matters

Turns Trakzi's transaction database into something semantically queryable. No consumer finance app currently offers this. Complements and amplifies the dedup engine (Idea 3) — cleaner data = more trustworthy search results.

---

### Critical Assumptions

| # | Assumption | Category | Priority |
|---|-----------|----------|----------|
| A1 | Users want to *search* transactions, not just browse charts | Value | 🔴 #1 |
| A5 | Result accuracy is high enough to build trust on first use | Feasibility | 🔴 #2 |
| A3 | Transaction descriptions in Neon are rich enough for meaningful embeddings | Feasibility | 🟡 #3 |
| A4 | Users will discover the search feature without heavy onboarding | Usability | 🟡 #4 |
| A2 | Natural language is preferred over date filters + category dropdowns | Value | 🟡 #5 |
| A6 | This is differentiated enough to influence retention or acquisition | Viability | 🟢 #6 |

---

### Validation Experiments

#### Experiment S-1 — Fake Door Search Bar (tests A1 + A4)
**Hypothesis**: >25% of active users will click a search bar in the transactions view within 2 weeks.
**Method**: Add a search bar with placeholder "Search your transactions..." — on click, show modal: "Natural language search is coming — what would you search for?" Collect free-text input.
**Success criteria**: >25% click-through; qualitative query patterns emerge from free-text
**Effort**: Low (1–2 days)
**Timeline**: Week 1

#### Experiment S-2 — Wizard of Oz NL Search (tests A2 + A5)
**Hypothesis**: >60% of natural language queries can be manually fulfilled with results users mark as "helpful."
**Method**: Enable "AI search beta" for 10–20 power users. Engineer manually interprets queries and returns filtered results within minutes. Users rate results (thumbs up/down).
**Success criteria**: >60% helpful rating; <20% queries produce zero usable results
**Effort**: Low (human labor for 2 weeks, no system)
**Timeline**: Week 2–3
**What you learn**: Actual query patterns, accuracy floor before committing to vector infra

#### Experiment S-3 — Keyword Search Proxy (tests A3 + A5)
**Hypothesis**: Postgres full-text search (`tsvector`) satisfies >50% of user queries well enough to validate demand before vector investment.
**Method**: Ship basic full-text search. Measure engagement and log all queries.
**Success criteria**: >15% of users use search twice or more in the first month
**Effort**: Medium (3–4 days)
**Timeline**: Week 3–4 (if S-1 shows demand)
**What you learn**: Baseline demand before committing to embedding infrastructure

---

## Idea 3 — Receipt ↔ Statement Deduplication Engine

### Description

When a user imports a bank statement and has a scanned receipt for the same purchase, both records currently exist independently — the $87.43 Costco charge appears twice. A dedup engine fingerprints by `(normalized_merchant, amount, date ±2 days)` and merges them into one enriched record: the statement provides debit confirmation, the receipt provides item-level breakdown.

**Core technical challenge**: Merchant name normalization. Banks write `COSTCO WHSE #0123`; receipts say `Costco Warehouse`. Requires fuzzy matching (Levenshtein + merchant alias map) before fingerprinting.

### Why It Matters

Data quality improvement that makes every other Trakzi feature more trustworthy — budgets, analytics, NL search, and categorization all become more accurate when the corpus isn't polluted with duplicates. Should be built before NL search for this reason.

---

### Critical Assumptions

| # | Assumption | Category | Priority |
|---|-----------|----------|----------|
| B1 | A meaningful % of users import both receipts AND statements for the same purchases | Value | 🔴 #1 |
| B4 | False positive merges (wrong records merged) are rare enough not to destroy trust | Feasibility | 🔴 #2 |
| B3 | Merchant normalization is tractable across Trakzi's merchant variety | Feasibility | 🔴 #3 |
| B2 | Double-counting is a pain point users notice and care about | Value | 🟡 #4 |
| B6 | Users understand and accept auto-merging without feeling like data was deleted | Usability | 🟡 #5 |
| B5 | Merged enriched records are more useful than separate records | Value | 🟢 #6 |

---

### Validation Experiments

#### Experiment D-1 — Data Audit (tests B1 + B3)
**Hypothesis**: >20% of receipt transactions have a plausible statement match `(amount ±$0.01, date ±2 days, merchant fuzzy match ≥80%)`.
**Method**: SQL query on existing Neon DB — no user-facing changes. Cross-join receipts and statement transactions per user, apply fuzzy merchant matching, count plausible pairs.
**Success criteria**: >20% overlap rate across users who have both data sources
**Effort**: Very Low (~4 hours, pure SQL)
**Timeline**: Day 1 — run before anything else

#### Experiment D-2 — Shadow Dedup (tests B3 + B4)
**Hypothesis**: The fingerprinting algorithm produces <5% false positive merges on real data.
**Method**: Run dedup logic in background (no UI changes). Log every proposed merge with confidence score. Engineering manually reviews a random sample of 50–100 proposed merges.
**Success criteria**: <5% false positive rate on reviewed sample
**Effort**: Low (algorithm + logging, no UI, ~3 days)
**Timeline**: Week 1–2

#### Experiment D-3 — Opt-In Merge Notification (tests B2 + B6)
**Hypothesis**: >50% of users shown a merge suggestion will accept it.
**Method**: Surface a card for users with detected duplicates: "We found 3 transactions that appear in both your receipts and bank statement — merge them for cleaner tracking?" User confirms or dismisses.
**Success criteria**: >50% acceptance rate; <5% of merged records are manually un-merged within 7 days
**Effort**: Medium (notification UI + merge logic, ~1 week)
**Timeline**: Week 3 (after D-2 passes)

---

## Recommended Experiment Timeline

```
Week 1 (May 12–18)
  ├── D-1: Data Audit SQL query             [4 hours, no user impact]
  ├── B-1: Budget Intent Survey             [1 day, PostHog in-app]
  └── S-1: Fake Door Search Bar             [1–2 days]

Week 2 (May 19–25)
  ├── D-2: Shadow Dedup (background)        [3 days engineering]
  ├── B-2: Fake Door Budget UI              [2–3 days]
  ├── B-4: Projection Algorithm Spike       [3–4 days engineering]
  └── S-2: Wizard of Oz NL Search begins   [manual, 2 weeks]

Week 3 (May 26 – Jun 1)
  ├── D-3: Opt-In Merge Notification        [if D-2 passes]
  ├── B-3: Manual Burn Rate Alerts          [manual, WoZ]
  └── S-3: Keyword Search Proxy            [if S-1 shows demand]

Week 4 (Jun 2–8)
  └── S-2: Wizard of Oz NL Search ends     [analyze results]

Week 5 (Jun 9–15)  ← Decision Point
  ├── Budget Guardrails: Build / Pivot / Kill
  ├── NL Search: Commit to pgvector / Stay with full-text / Kill
  └── Dedup Engine: Ship opt-in / Make automatic / Kill
```

---

## Decision Framework

### Budget Guardrails
| Experiment Result | Decision |
|------------------|----------|
| B-1 + B-2 both pass | Proceed to full build |
| B-1 passes, B-2 fails | Redesign budget-setting UX, re-test |
| B-1 fails | Kill or deprioritize; users are retroactive trackers |
| B-4 fails (projection accuracy) | Ship simpler "X% of budget used" without projection |

### NL Transaction Search
| Experiment Result | Decision |
|------------------|----------|
| S-1 passes, S-2 accuracy ≥60% | Commit to pgvector implementation |
| S-1 passes, S-2 accuracy <60% | Ship full-text search (S-3) as permanent solution |
| S-1 fails (<25% click-through) | Kill; users navigate via charts, not search |

### Receipt ↔ Statement Dedup
| Experiment Result | Decision |
|------------------|----------|
| D-1 shows >20% overlap + D-2 <5% false positives | Ship opt-in merge, then auto-merge |
| D-1 shows >20% overlap + D-2 >5% false positives | Invest in better merchant normalization before shipping |
| D-1 shows <20% overlap | Kill; not enough users have both data sources |

---

## Next Steps After Validation

If experiments pass, the natural build sequence is:

1. **Dedup Engine** (data quality foundation)
2. **Open Banking / Plaid** (data freshness — unblocks Budget Guardrails)
3. **Budget Guardrails with Burn Rate** (retention feature)
4. **NL Transaction Search** (pgvector on clean, deduplicated data)

---

## Related Discovery Work

- See `plans/seo-strategy.md` and `plans/seo-pages-redesign.md` for parallel growth initiatives
- Budget Guardrails pairs well with Savings Goals (surfaced in initial brainstorm, not yet explored)
- NL Search infrastructure (pgvector) also enables Spending Graph / Correlation Engine (#18) at low marginal cost
