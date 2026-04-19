# Cross-Feature Join Map

This file maps the most realistic cross-feature joins for Trakzi chart ideation.

Primary schema sources:
- `/Users/yares/Trakzi/docs/CORE/NEON_DATABASE.md`
- `/Users/yares/Trakzi/docs/CORE/PROJECT_DEEP_DIVE.md`

Use this file when deciding whether a cross-feature chart is:
- realistic
- strong
- implementation-worthy

Important:
- This is a product ideation join map, not a literal SQL query file
- It exists to keep chart ideas grounded in feasible relationships

---

## Core Join Backbone

Most joins anchor through:
- `users.id`
- `transactions.user_id`
- `receipts.user_id`
- `receipt_transactions.user_id`
- `shared_transactions.uploaded_by`
- `room_members.user_id`
- `challenge_participants.user_id`
- `challenge_group_members.user_id`
- `savings_goals.user_id`
- `pockets.user_id`

User ownership is the primary stable join spine.

---

## Join 1: Transactions -> Categories

### Path

- `transactions.category_id -> categories.id`

### Best use

- analytics
- spending pressure
- budget conflict
- debt-like category behavior
- category crowd-out
- income vs spending mix

### Confidence

- Very high

---

## Join 2: Transactions -> Category Budgets

### Path

- `transactions.category_id -> category_budgets.category_id`
- constrained by `user_id`

### Best use

- budget pressure charts
- category overshoot charts
- budget vs savings conflict
- category burden vs goals

### Confidence

- High

---

## Join 3: Receipts -> Receipt Transactions

### Path

- `receipt_transactions.receipt_id -> receipts.id`

### Best use

- basket charts
- store charts
- line-item distributions
- shopping cadence
- receipt complexity

### Confidence

- Very high

---

## Join 4: Receipt Transactions -> Receipt Categories

### Path

- `receipt_transactions.category_id -> receipt_categories.id`

### Best use

- fridge category mix
- food vs drinks vs other
- item-type spreads
- basket composition

### Confidence

- Very high

---

## Join 5: Transactions -> Pockets via Pocket Transactions

### Path

- `pocket_transactions.transaction_id -> transactions.id`
- `pocket_transactions.pocket_id -> pockets.id`

### Best use

- per-pocket cost burden
- income vs asset burden
- pocket-linked category load
- cost-of-ownership charts
- vehicle/property comparisons

### Confidence

- Very high

---

## Join 6: Transactions -> Shared Transactions

### Path

- `transactions.room_transaction_id -> shared_transactions.id`
- `shared_transactions.original_tx_id -> transactions.id`

### Best use

- shared vs solo spending
- room-linked spending distortion
- settlement timing
- transaction origin vs shared aftermath

### Confidence

- High

### Note

Use carefully because there are both “original transaction” and “shared transaction” viewpoints.

---

## Join 7: Shared Transactions -> Transaction Splits

### Path

- `transaction_splits.shared_tx_id -> shared_transactions.id`

### Best use

- who owes what
- split burden
- room pressure
- settlement exposure
- split amount distributions

### Confidence

- Very high

---

## Join 8: Shared Transactions -> Receipt Items

### Path

- `receipt_items.shared_tx_id -> shared_transactions.id`

### Best use

- item-level room splits
- shared grocery item burden
- shared basket composition
- room grocery vs non-grocery structure

### Confidence

- High

---

## Join 9: Receipt Items -> Transaction Splits

### Path

- `transaction_splits.item_id -> receipt_items.id`

### Best use

- item-level sharing behavior
- most-split item types
- per-user grocery burden within rooms
- item ownership distortion

### Confidence

- High

---

## Join 10: Rooms -> Room Members

### Path

- `room_members.room_id -> rooms.id`

### Best use

- room size
- membership churn
- room burden normalization
- role-aware room charts

### Confidence

- Very high

---

## Join 11: Friendships -> Shared Transactions

### Path

- `shared_transactions.friendship_id -> friendships.id`

### Best use

- one-to-one shared spending
- friend-based settlement patterns
- friendship-linked expense behavior

### Confidence

- High

---

## Join 12: Challenges -> Challenge Participants

### Path

- `challenge_participants.challenge_id -> challenges.id`

### Best use

- challenge participation
- challenger comparison
- challenge size / duration / membership

### Confidence

- Very high

---

## Join 13: Challenge Groups -> Challenge Group Members -> Monthly Results

### Path

- `challenge_group_members.group_id -> challenge_groups.id`
- `challenge_monthly_results.member_id -> challenge_group_members.id`

### Best use

- leaderboard momentum inside one group
- score progression by member
- consistency by member
- rank changes inside one group
- podium pressure and top-3 turnover
- metric snapshots by month

### Confidence

- Very high

### Note

Use this as member-vs-member competition inside one group.
Do not frame these charts as group-vs-group battles.

---

## Join 14: Savings Goals -> Transactions

### Path

- shared by `user_id`
- optionally compare with income, expenses, surplus, or savings-like categories over time

### Best use

- goal realism
- funding pressure
- target vs actual pace
- savings crowd-out
- goal progress vs cash flow

### Confidence

- High

### Note

This is a user-level conceptual join rather than a direct foreign-key transaction-to-goal link.

---

## Use-Carefully Warnings

- Do not propose Challenge Group charts as group-vs-group competition unless the product model explicitly changes
- Do not default to blended all-pocket charts when the actual question should live under Travel, Vehicles, Housing, or Other

## Join 15: Transactions -> Challenges

### Path

Not a direct FK join in the schema snapshot.

Use only when challenge rules or participant spending can be compared conceptually through:
- user_id
- challenge windows
- challenge category definitions
- cached participant metrics

### Best use

- challenge effectiveness
- spending behavior during challenge windows
- challenge participation vs savings or budget outcomes

### Confidence

- Medium

### Note

This is valid for analytical comparison, but it is not a direct relational join in the same sense as pockets or rooms.

---

## Join 16: Transactions -> Country / Geography

### Path

- `transactions.country_name`
- possibly `country_instance_id` where relevant per schema history

### Best use

- pocket geography
- travel spending
- location-based category behavior

### Confidence

- Medium

### Note

Useful, but usually secondary for the chart-generation workflow unless the prompt explicitly wants geography.

---

## Highest-Confidence Cross-Feature Pairs

These are the safest, strongest cross-feature chart pairings:

- Analytics × Savings
  - transactions + goals/surplus/balance behavior

- Analytics × Pockets
  - transactions + pocket_transactions + pockets

- Fridge × Savings
  - receipt data + closing-balance / net-cash behavior

- Friend Rooms × Fridge
  - shared_transactions + receipt_items + transaction_splits

- Friend Rooms × Analytics
  - room-linked transactions vs personal transaction behavior

- Challenges × Analytics
  - challenge participation metrics vs spending behavior

- Goals × Savings
  - savings_goals + transaction-based surplus / contributions

---

## Medium-Confidence Cross-Feature Pairs

- Debt × Savings
  - if debt is modeled through categorized transactions rather than explicit loans

- Debt × Goals
  - same constraint as above

- Challenges × Savings
  - good conceptually, but often user-level analytical joins rather than direct FKs

- Pockets × Friend Rooms
  - possible, but usually more niche and harder to make broadly valuable

---

## Lower-Confidence / Use Carefully

- Detailed loan-state or amortization-like debt charts without documented structured debt records
- Cross-feature charts that rely on undocumented fields inside `pockets.metadata`
- Highly specific friend/challenge joins that assume raw dollar visibility where the product may intentionally expose scores only

---

## Practical Rule

For cross-feature ideation:

1. Prefer direct FK or junction-table joins first
2. Prefer user-level analytical joins second
3. Avoid speculative joins unless the CORE docs clearly support them
4. If a chart depends on a medium-confidence join, keep the question simpler and more implementation-realistic
