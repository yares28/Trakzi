# Goals Tab Integrated Plan

This plan upgrades the current goals tab from a simple savings target list into an app-integrated planning workspace that connects to Savings, Debt, Net Worth, and Pockets.

## Goal

Make goals feel like a natural layer on top of the app's existing money model:

- `transactions` describe imported money movement
- `pockets` describe assets and asset context
- `debt_accounts` and `debt_entries` describe liabilities
- `goals` describe what the user wants to achieve next

The goals system should not duplicate the source-of-truth data already stored in Pockets or Debt.

## What makes this app-integrated

The goals system should not be an isolated page where users retype numbers the app already knows.

Instead:

- Savings goals sit on top of savings behavior and manual goal entries
- Debt payoff goals sit on top of real debt accounts and debt balances
- Net worth goals sit on top of the same calculator and liability model already used in Savings
- Pocket-linked goals use pockets for identity and context without becoming duplicate asset records

The result should feel like one connected financial model:

- assets come from `pockets`
- liabilities come from `debt_accounts`
- imported money movement comes from `transactions`
- goals sit above them as planning and pacing

## Product direction

The goals tab should answer three things quickly:

1. What am I working toward?
2. Am I on pace?
3. What should I fund next?

The UI should stay modern and minimal:

- compact summary strip at the top
- grouped goal cards, not dense tables
- one primary CTA: `Add goal`
- fast contribution logging
- clear at-risk / on-track states

It should also create useful entry points into the rest of the app:

- a savings goal should lead naturally to `Add contribution`
- a debt payoff goal should lead naturally to the linked debt account
- a net worth goal should lead naturally to the net worth calculator
- a pocket-linked goal should lead naturally to the linked property or vehicle context

## Design principles

The tab should optimize for decisions, not data entry.

- one goal should be understandable in one glance
- the user should always see the next best action
- the app should reuse existing financial truth before asking for manual input
- goals should motivate without feeling gamey or noisy
- every goal kind should feel native to the page it came from

## Goal kinds

Goals should support four integrated kinds:

1. `savings_target`
   - Standard goal such as emergency fund, trip, or house deposit
   - Progress is based on goal entries and optionally linked savings behavior

2. `debt_payoff`
   - Goal to reduce a linked debt account to a target balance, usually `0`
   - Example: pay off credit card, student loan, overdraft
   - Progress is based on the linked debt account balance, not duplicated manual values

3. `net_worth_target`
   - Goal to reach a target net worth
   - Progress is based on the same net worth calculation model used by the savings page

4. `pocket_funding`
   - Goal linked to a pocket context
   - Example: house down payment, renovation reserve, car replacement fund
   - Progress still uses goal entries, but the goal can point at a related pocket

## Goal object model

Every goal should have two layers:

1. Stored fields
   - identity
   - type
   - target
   - deadline
   - optional links
   - status
   - manual notes and priority

2. Derived fields
   - current value
   - progress percent
   - remaining gap
   - needed per month
   - current pace
   - projected completion
   - source health
   - next best action

This keeps the database small while still letting the UI feel rich and intelligent.

## Goal lifecycle

Each goal should move through a clear lifecycle:

1. `draft`
   - optional future state if we later add multi-step creation
2. `active`
   - visible in main board and summaries
3. `completed`
   - automatically or manually completed
4. `archived`
   - kept for history, hidden by default

Rules:

- `debt_payoff` can auto-complete when linked debt balance reaches the target balance
- `net_worth_target` can auto-complete when live net worth reaches target
- `savings_target` and `pocket_funding` can complete from manual progress or explicit user action
- completed goals should remain readable and celebratory, not disappear immediately

## UX model

### Top summary strip

Show:

- total target value
- total funded so far
- monthly amount needed across active goals
- count of on-track goals

This should be a quiet horizontal strip, not a stack of oversized cards.

### Goal board

Split into:

- `In Progress`
- `Due Soon`
- `Completed`

Each goal card should show:

- goal name
- goal kind
- current progress
- saved / target or current debt / target
- deadline
- amount needed per month
- status chip

Actions:

- `Add`
- `Edit`
- `Archive`

Secondary affordances:

- `Add contribution` on savings and pocket funding goals
- `View debt` on debt payoff goals
- `View net worth` on net worth goals

This keeps the layout minimal while still giving each goal a natural next step.

Recommended card anatomy:

- top row: title, status chip, progress percent
- middle row: current vs target, remaining amount, deadline
- visual row: one thin progress bar
- footer row: next best action plus one secondary action

This should feel closer to a concise roadmap than a finance spreadsheet.

### Quick add and edit

Use a single sheet or modal with progressive input:

1. goal name
2. goal kind
3. target amount or target balance
4. deadline
5. optional links:
   - linked debt account
   - linked pocket
6. optional note and priority

The add flow should adapt by goal kind:

- `savings_target`
  - target amount
  - deadline
  - optional starting amount

- `debt_payoff`
  - choose linked debt account
  - target balance defaults to `0`
  - deadline

- `net_worth_target`
  - target net worth
  - deadline
  - optional snapshot note

- `pocket_funding`
  - choose linked pocket
  - target amount
  - deadline
  - optional label such as `Renovation reserve`

The modal should avoid showing irrelevant fields.

- selecting `debt_payoff` should immediately swap the form into debt language
- selecting `net_worth_target` should remove contribution-oriented copy
- selecting `pocket_funding` should foreground the pocket relationship

### Contribution flow

Each goal should support quick entries:

- contribution
- withdrawal
- adjustment

For debt payoff goals, manual contributions should be rare; the preferred source is the linked debt account.

For net worth goals, there should be no manual contribution ledger by default. Progress should be derived from the live net worth model.

Goal entry UX should stay intentionally lightweight:

- amount first
- date second
- note optional
- quick presets such as `today`, `this month`, or last used amount later if useful

## App integration rules

### Source-of-truth rules

- `goal_entries` own manual funding history.
- `debt_accounts` own debt payoff state.
- net worth goals read from the same net worth calculation used in Savings.
- pockets provide context and related asset identity, but not duplicated goal progress numbers.

### Goal kind to source mapping

| Goal kind | Current value comes from | Progress history comes from |
|-----------|--------------------------|-----------------------------|
| `savings_target` | manual goal state | `goal_entries` |
| `debt_payoff` | linked `debt_accounts` balance | `debt_entries` |
| `net_worth_target` | live net worth calculation | derived snapshots, not manual entries |
| `pocket_funding` | manual goal state with pocket context | `goal_entries` |

### Goal engine rules

The app should derive goal progress in a fixed order:

1. if the goal is linked to a live financial model, use that model first
2. if the goal is manual-funding based, use `goal_entries`
3. if the source link is broken, preserve the goal and mark `source_health` accordingly

This prevents conflicting numbers and makes every goal explainable.

### Savings

- Standard savings goals can use manual `goal_entries`.
- Later, the app can optionally suggest matching savings transactions, but the first clean version should not auto-write goal progress from imported transactions.
- Savings should surface:
  - next goal to fund
  - total monthly needed across active goals
  - quick contribution CTA

### Debt

- Debt payoff goals must link to `debt_accounts.id`.
- Progress comes from debt balance, not from duplicated goal amounts.
- The goals tab can still show manual notes or milestones, but current payoff state should come from Debt.
- Debt should surface:
  - linked payoff goal chip on each active debt
  - remaining amount to target
  - projected payoff date

### Net worth

- Net worth goals should reuse the same net worth calculation logic as the savings page.
- This prevents disagreement between the goal progress and the net worth tab.
- Net worth should surface:
  - active net worth target
  - progress to target amount
  - gap remaining and target date context

### Pockets

- Pocket-linked goals are for context, not duplicate value storage.
- Example:
  - A `house deposit` goal may link to a future property pocket conceptually.
  - A `renovation reserve` goal may link to an owned property pocket.
  - A `car replacement` goal may link to a vehicle pocket.
- If a pocket already contains the asset and linked debt, the goal should remain a funding/planning object, not another asset record.
- Pockets should eventually surface:
  - lightweight goal pill or progress row in pocket detail views
  - direct `Create goal from pocket` action

## Where goals should surface across the app

Goals should not live only in the Goals tab.

### Savings tab

- show the next goal that needs funding
- show monthly amount needed across active goals
- show a quick `Add contribution` action

### Net Worth tab

- show net worth goals when relevant
- show whether current net worth is on pace for the target date

### Debt tab

- show debt payoff goals linked to active debt accounts
- show payoff progress and next milestone without duplicating debt data entry

### Pockets

- linked goals should appear as lightweight context in relevant pocket surfaces later
- example: a property pocket can show an attached renovation reserve goal

## Creation entry points

The same goal system should be creatable from multiple places without creating multiple flows.

- From `Goals`:
  - full add flow with all goal kinds
- From `Debt`:
  - prefilled `debt_payoff` flow for the selected debt
- From `Net Worth`:
  - prefilled `net_worth_target` flow using current net worth
- From `Pockets`:
  - prefilled `pocket_funding` flow for the current property or vehicle context
- From `Savings`:
  - prefilled `savings_target` flow

All of these should write to the same `savings_goals` table and use the same goal card UI.

## Cross-app behavior

Goals should improve the rest of the app, not just consume data from it.

- Savings page:
  - show the single best goal to fund next
  - surface a compact monthly target badge

- Debt page:
  - show payoff goals inline with debts
  - let users create a payoff goal from a debt row without context switching

- Net Worth page:
  - show current target, gap, and pace
  - link into goal details from the calculator summary

- Pockets:
  - show attached funding goals as quiet context
  - let the user create a reserve goal from a property or vehicle page

- Home:
  - later, a compact `Next goal` widget could surface the most urgent or most fundable goal

## Smart defaults

The app should reduce setup work when possible.

- If the user creates a `debt_payoff` goal from the Debt tab:
  - prefill linked debt
  - set target balance to `0`
  - suggest deadline based on current minimum payment if available

- If the user creates a `net_worth_target` goal from the Net Worth tab:
  - prefill current net worth snapshot
  - suggest a target date 6 or 12 months out

- If the user creates a `pocket_funding` goal from a property or vehicle context:
  - prefill the linked pocket
  - suggest category and label from the pocket name

- If the user creates a standard savings goal:
  - default to `savings_target`
  - suggest monthly allocation from target and deadline immediately

## Prioritization model

Not every active goal should shout equally.

The app should rank active goals using:

- deadline urgency
- amount remaining
- current pace gap
- user-set priority
- source health

This ranking should power:

- `What should I fund next?`
- ordering inside `Due Soon`
- compact recommendation surfaces on other pages

## Database plan

### Current table to evolve

`savings_goals` exists today and should be extended rather than replaced immediately.

Recommended new columns:

- `user_id` stays as the owner boundary
- `goal_kind` text
- `priority` smallint default 2
- `notes` text null
- `linked_debt_account_id` bigint null
- `linked_pocket_id` integer null
- `linked_pocket_type` text null
- `starting_amount` numeric null
- `archived_at` timestamptz null
- `updated_at` timestamptz default now()
- `completed_at` timestamptz null
- `target_balance` numeric null for debt-style targets if you want explicit payoff balance semantics

Recommended supporting indexes:

- `(user_id, status, archived_at)`
- `(user_id, goal_kind, archived_at)`
- `(user_id, deadline)` for ordering and due-soon views
- `(linked_debt_account_id)` where not null
- `(linked_pocket_type, linked_pocket_id)` where not null

Recommended integrity rules:

- `linked_debt_account_id` required when `goal_kind = 'debt_payoff'`
- `linked_pocket_id` and `linked_pocket_type` allowed when `goal_kind = 'pocket_funding'`
- links should be nullable for `savings_target` and `net_worth_target`
- archive should be soft-delete style via `archived_at`
- `completed_at` should be set when status becomes `completed`
- if `goal_kind = 'net_worth_target'`, debt and pocket links should usually remain null in v1

Keep existing columns:

- `category`
- `label`
- `target_amount`
- `deadline`
- `monthly_allocation`
- `status`

## New table

Add `goal_entries`:

- `id`
- `goal_id`
- `user_id`
- `entry_type` = `contribution | withdrawal | adjustment`
- `amount`
- `entry_date`
- `transaction_id` nullable
- `debt_entry_id` nullable
- `note`
- `created_at`

Recommended indexes:

- `(goal_id, entry_date desc, created_at desc)`
- `(user_id, entry_date desc)`
- `(transaction_id)` where not null
- `(debt_entry_id)` where not null

Important rule:

- `goal_entries` should be used only for goals with manual funding flows
- `debt_payoff` and `net_worth_target` goals should derive progress from live linked models first, not duplicated entry totals

This table is the key to:

- contribution history
- pace and projection
- auditability
- future goal charts

### Optional later additions

These are not required for v1, but they are the cleanest future extensions:

- `goal_snapshots`
  - periodic derived snapshots for charting and history without recalculating everything client-side
- `goal_milestones`
  - optional named milestones such as `25%`, `house deposit reached`, `card under 1,000`

Neither is required for the first integrated version.

## Why this is better than a simple goals list

- Savings goals become actionable instead of static
- Debt payoff goals can connect directly to real liabilities
- Net worth goals can reuse the same financial truth as the savings page
- Pocket-linked goals add context without duplicating assets or debts

## Status and forecasting model

Each active goal should compute:

- `current_amount`
- `remaining_amount`
- `months_remaining`
- `needed_per_month`
- `current_monthly_pace`
- `projected_completion_date`
- `status`

Also compute:

- `source_health`
  - whether the goal still has a valid linked debt or pocket
- `next_best_action`
  - `add_contribution`
  - `review_deadline`
  - `open_debt`
  - `review_net_worth_inputs`

Recommended statuses:

- `on_track`
- `tight`
- `behind`
- `due_soon`
- `completed`

Recommended trigger logic:

- `due_soon` if deadline is within the configured near-term window
- `behind` if projected completion is meaningfully after deadline
- `tight` if the goal is technically on pace but with low buffer
- `completed` only when the underlying source reaches target or the user explicitly completes the goal

This gives the UI a consistent language across all goal kinds.

## Minimal modern layout

The tab should stay visually light:

- one quiet summary strip
- grouped cards with thin borders
- no dense tables
- no nested cards inside cards
- a single accent color used mostly for progress
- muted metadata and strong numeric hierarchy

Each goal card should feel readable in under 3 seconds:

- title and status first
- saved or current value second
- target and deadline third
- one clear next action at the bottom

Recommended empty states:

- `No goals yet`
  - explain value in one sentence
  - show 3 suggested templates
- `No due soon goals`
  - celebrate stability quietly
- `All completed`
  - show archive entry point and next suggested goal

## Edge cases

- Goal linked to a debt that gets paid off:
  - mark completed automatically when debt balance reaches target

- Goal linked to a pocket that is deleted:
  - keep the goal, null the link, preserve history

- User changes target or deadline:
  - keep entries unchanged, recompute pace and status

- User deletes a standalone debt linked to a payoff goal:
  - preserve the goal, null the link, mark `source_health = missing`

- Goal linked to a debt that gets refinanced:
  - either relink to the replacement debt with explicit confirmation or freeze the old goal as archived history

- Net worth inputs change because the user excludes a property or debt in the calculator:
  - the goal should still use the app's default net worth model, not the temporary local UI toggles

- Pocket-linked house or car with financing:
  - goal should never duplicate the asset or the liability
  - progress remains a planning layer only

- Goal contribution linked to a deleted transaction:
  - keep the goal entry and null the transaction link

- Completed goals:
  - collapse by default, do not remove from history

## Rollout phases

### Phase 1

- extend `savings_goals`
- add `goal_entries`
- build grouped goal board
- ship `savings_target` goals with contribution flow

### Phase 2

- add `debt_payoff` goals backed by linked `debt_accounts`
- surface payoff goals inside the Debt tab
- add goal-aware pacing and next-action logic

### Phase 3

- add `net_worth_target` goals using the savings page net worth model
- surface current target and gap in Net Worth

### Phase 4

- add `pocket_funding` entry points from properties and vehicles
- surface linked goals inside Pockets
- add optional home-page recommendations

This order keeps the model coherent and avoids building disconnected goal logic twice.

## Quality bar

The goals tab should feel:

- calm
- motivating
- reliable
- connected to the rest of the app

If the tab still feels like a standalone CRUD list, the integration is not done yet.
