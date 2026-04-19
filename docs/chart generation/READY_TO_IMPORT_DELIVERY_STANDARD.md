# Ready-To-Import Delivery Standard

This file defines the default delivery standard for Trakzi chart generation.

The main rule is:

- if the user wants charts for use now, the AI should produce ready-to-import chart work
- do not stop at abstract prototypes unless the user explicitly asks for prototype-only ideation

Primary implementation references:
- `/Users/yares/Trakzi/docs/CHARTS_CLONE_SPEC.md`
- `/Users/yares/Trakzi/docs/chart generation/TESTCHARTS_PLAYGROUND_PROTOCOL.md`
- `/Users/yares/Trakzi/docs/PAGES/TEST_CHARTS.md`
- `/Users/yares/Trakzi/docs/chart generation/MOCK_DATA_IDEATION_STANDARD.md`

---

## What "Ready To Import" Means

A ready-to-import chart should be shaped so it can move into a real Trakzi page with minimal rewrite.

Default rendering expectation:
- use the full production clone-spec card style
- do not use the lightweight playground / prototype visual style unless the user explicitly asks for prototype-only output

That means the AI should think in terms of:
- the target Trakzi domain or page
- the real data source or bundle source for production
- the mock scenario source for ideation
- the likely card structure
- realistic chart type fit
- page-level usefulness
- current product constraints

It should not feel like:
- a loose prototype
- a vague concept stub
- a naming exercise without implementation direction

---

## Delivery Bias

Unless the user explicitly asks for text-only ideation or prototype-only exploration:

1. the active batch should be rendered in `/testCharts`
2. the charts should be described and structured as real Trakzi chart cards in full clone-spec card style
3. the implementation should follow `/Users/yares/Trakzi/docs/CHARTS_CLONE_SPEC.md`
4. ideation rounds may use schema-shaped mock data
5. the output should be reviewable now and portable later

---

## Required Product Corrections

### Challenges

Treat Challenge Groups as:
- one group of users competing inside the same leaderboard
- top-place competition driven by score totals and monthly scoring behavior
- a top-3 / podium style system

Do not frame Challenge Groups as:
- group vs group
- team vs team
- cohort vs cohort battles

### Pockets

Treat Pockets as separate subdomains by default:
- Travel
- Vehicles
- Housing
- Other

Do not default to one blended "all pockets" chart surface unless the user explicitly asks for a cross-pocket summary.

### Importability

If the user says they want charts "now" or wants charts they can pass to other pages:
- bias toward real page-ready chart cards
- bias away from prototype-only concepts
- prefer charts with a clear bundle/API path for production or a clear mock-data story for ideation

---

## Output Standard

Every generated chart should be easy to classify as one of these:

- `Ready Now`
  The concept is specific enough and grounded enough to be implemented in `/testCharts` immediately and passed to a real page later.

- `Needs Minor Adaptation`
  The concept is strong and grounded, but needs a small naming, data-shape, or page-fit refinement before implementation.

- `Prototype Only`
  The concept is exploratory and should not be treated as implementation-ready.

Default target:
- most charts in a serious Trakzi generation round should be `Ready Now` or `Needs Minor Adaptation`

---

## Practical Rule

If there is any tension between:
- novelty
- and importability

prefer importability unless the user explicitly asks for speculative exploration.
