# Mock Data Ideation Standard

This file defines the default data mode for chart ideation rounds in `/testCharts`.

The main rule is:

- when the user is reviewing chart ideas in `/testCharts`, use mock data by default
- do not wire ideation charts to the user's live transactions unless the user explicitly asks for live data

Primary references:
- `/Users/yares/Trakzi/docs/chart generation/TESTCHARTS_PLAYGROUND_PROTOCOL.md`
- `/Users/yares/Trakzi/docs/chart generation/READY_TO_IMPORT_DELIVERY_STANDARD.md`
- `/Users/yares/Trakzi/docs/FEATURES/DEMO_MODE.md`
- `/Users/yares/Trakzi/docs/CHARTS_CLONE_SPEC.md`

---

## Why This Exists

The purpose of `/testCharts` ideation is to judge:
- chart usefulness
- chart readability
- chart-card quality
- product value
- visual structure

It is not to judge:
- the current state of the user's real transactions
- missing data quality
- sparse or messy live records

For ideation rounds, the user should be able to evaluate the chart under idealized but believable conditions.

---

## Default Data Rule

For `/testCharts` ideation rounds:

1. use chart-specific mock data
2. keep the chart card in full clone-spec style
3. do not wire to live bundle APIs by default
4. only switch to real APIs if the user explicitly asks for live integration

This means ideation mode is:
- production-style card shell
- mock/demo data payload

not:
- prototype shell
- live user data

---

## What Good Mock Data Looks Like

Mock data should be:
- plausible
- readable
- varied enough to reveal the chart's value
- shaped like real Trakzi data
- strong enough to show the intended insight clearly

Mock data should not be:
- random nonsense
- flat or boring
- unrealistically perfect
- disconnected from the chart question

---

## Mock Data Design Rules

For each chart:

1. create mock data that highlights the exact insight the chart is supposed to reveal
2. make the scenario believable for the target domain
3. keep values internally consistent
4. include enough contrast for the chart to be worth judging
5. avoid using the same generic sample pattern for every chart

Examples:
- a savings pressure chart should show believable income/spend tension
- a fridge pricing chart should show store and item variance clearly
- a challenge leaderboard chart should show meaningful podium pressure
- a pockets chart should reflect the specific subdomain: Travel, Vehicles, Housing, or Other

---

## Schema-Shaped Mocking

Even though the data is mocked, it should still respect the product model.

Mock data should align with:
- real field shapes
- realistic joins
- real page/domain behavior
- current Trakzi terminology

Use the database and product docs to keep the mock data believable.

---

## Challenge And Pockets Rules

### Challenges

Mock Challenge Group data should show:
- users competing inside one leaderboard
- score differences between members
- podium movement
- top-3 pressure

Do not mock:
- group-vs-group battles
- team aggregates pretending to be the product model

### Pockets

Mock Pockets data should be built separately for:
- Travel
- Vehicles
- Housing
- Other

Do not collapse them into one blended pocket story unless the chart explicitly needs cross-pocket comparison.

---

## Importability Rule

Mock data is for judging the chart idea, not for lowering implementation quality.

So even in mock-data mode:
- use clone-spec card structure
- use realistic states and interactions
- use production-like labels and controls
- keep the chart ready to move to a real page later

---

## Practical Rule

If the user says:
- "there is no data"
- "use mock data"
- "I want to judge the idea, not my transactions"

then `/testCharts` should default to mock-data ideation mode automatically.
