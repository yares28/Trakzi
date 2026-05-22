# Database Extraction Checklist

Use this before chart ideation or chart review.

The goal is to ground chart ideas in what Trakzi can actually extract from the current database and backend model.

## Required files to inspect

- `/Users/yares/Trakzi/docs/CORE/NEON_DATABASE.md`
- `/Users/yares/Trakzi/docs/CORE/PROJECT_DEEP_DIVE.md`

Optional secondary sources if needed:
- `/Users/yares/Trakzi/prisma/schema.prisma`
- `/Users/yares/Trakzi/database/schema.sql` if it exists

Current repo note:
- `database/schema.sql` is currently missing in this repo snapshot, so treat `docs/CORE/NEON_DATABASE.md` as the strongest schema source.

## Authoritative rule

For chart ideation purposes:
- `docs/CORE/NEON_DATABASE.md` is the authoritative schema snapshot
- feature/page docs define current product coverage
- chart memory docs define approved and rejected concept memory

## What to extract before proposing charts

Build a quick internal map of:

- financial transaction tables
- receipt / grocery tables
- category tables
- savings / goal tables
- challenge tables
- friend / room / split tables
- pocket / asset / country / item tables
- subscription / plan tables only if relevant to chart scope
- timestamps, amounts, balances, merchants, categories, joins, ownership links, room links, challenge links

## Questions to answer first

Before proposing charts, confirm internally:

1. What tables support each domain?
2. What cross-feature joins are realistically possible?
3. What fields support time-series, ranking, comparison, and state analysis?
4. What user-level filters or ownership constraints exist?
5. Which concepts are strong **and** realistically extractable from the current data model?

## Rule for ideation

- Prefer charts that are clearly supported by the schema and current backend shape
- If an idea depends on uncertain data availability, mark it as lower confidence or avoid it
- Do not invent data relationships that the current model likely cannot support

## Domains that should be checked in the schema

- Analytics
- Fridge
- Savings
- Debt
- Goals
- Pockets
- Friend Rooms
- Challenges

## Outcome

After this checklist, the ideation model should know:
- what Trakzi already tracks
- what Trakzi can plausibly compute
- which cross-feature charts are realistically grounded in the database
