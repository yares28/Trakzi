# Challenges System

**Status**: ✅ Implemented (Spending Challenges + Leaderboard Groups)
**Created**: 2026-03-02
**Updated**: 2026-03-03

---

## Overview

Two complementary challenge systems for friendly financial accountability:

1. **Spending Challenges** — Time-boxed category spending caps (e.g., "spend under $200 on dining this month")
2. **Challenge Groups** — Score-based monthly leaderboard competitions on ranking metrics

---

## 1. Spending Challenges

### API Endpoints

| Method | Route | Purpose |
|--------|-------|---------|
| GET | `/api/challenges` | List active challenges for current user |
| POST | `/api/challenges` | Create challenge + auto-join + invite friends |
| GET | `/api/challenges/[id]` | Challenge detail with participants |
| DELETE | `/api/challenges/[id]` | Delete challenge (creator only) |
| POST | `/api/challenges/[id]/join` | Join a challenge |
| POST | `/api/challenges/[id]/leave` | Leave a challenge (not creator) |
| POST | `/api/challenges/[id]/refresh` | Batch refresh all participants' current_spend |

### Data Model

#### `challenges` table
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| created_by | TEXT | FK to users.id |
| title | VARCHAR(100) | Challenge name |
| category | VARCHAR(100) | Spending category to track |
| goal_type | ENUM | `individual_cap` or `group_total` |
| target_amount | NUMERIC | Spending limit |
| starts_at | DATE | Challenge start |
| ends_at | DATE | Challenge end |

#### `challenge_participants` table
| Column | Type | Description |
|--------|------|-------------|
| challenge_id | UUID | FK to challenges.id |
| user_id | TEXT | FK to users.id |
| joined_at | TIMESTAMP | When user joined |
| current_spend | NUMERIC | Cached spending aggregate |

### Goal Types

- **individual_cap**: Each participant tries to stay under `target_amount` individually
- **group_total**: The group collectively tries to stay under `target_amount`

### Refresh Mechanism

`current_spend` is a cached value refreshed via the `/refresh` endpoint. Runs a single batch UPDATE joining `transactions` and `categories` for the challenge's date range and category — avoids N+1 queries.

---

## 2. Challenge Groups (Leaderboard System)

### API Endpoints

| Method | Route | Purpose |
|--------|-------|---------|
| GET | `/api/challenge-groups` | List groups with live scores per member |
| POST | `/api/challenge-groups` | Create group (name, metrics, visibility) |
| POST | `/api/challenge-groups/join` | Join via 6-char invite code |
| DELETE | `/api/challenge-groups/[groupId]` | Leave group |

### Data Model

#### `challenge_groups` table
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| name | VARCHAR(100) | Group name |
| created_by | TEXT | FK to users.id |
| invite_code | VARCHAR(10) | 6-char join code (UNIQUE) |
| metrics | TEXT[] | Array of metrics to compete on |
| is_public | BOOLEAN | Whether publicly joinable |

#### `challenge_group_members` table
| Column | Type | Description |
|--------|------|-------------|
| group_id | UUID | FK to challenge_groups.id |
| user_id | TEXT | FK to users.id |
| joined_at | TIMESTAMP | When member joined |
| total_points | INTEGER | Accumulated all-time points |

#### `challenge_monthly_results` table
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| group_id | UUID | FK to challenge_groups.id |
| user_id | TEXT | FK to users.id |
| month | DATE | First day of scored month |
| metric | TEXT | Which metric |
| score | NUMERIC | Raw metric value |
| points | INTEGER | 3 (1st) / 2 (2nd) / 1 (3rd) / 0 (other) |

### Available Metrics

| Metric | Higher is Better | Description |
|--------|-----------------|-------------|
| `savingsRate` | Yes | (income - expense) / income |
| `financialHealth` | Yes | 50/30/20 rule compliance score |
| `fridgeScore` | Yes | Healthy vs unhealthy grocery ratio |
| `wantsPercent` | No | Wants spending as % of total |

### Scoring

Monthly results assign points: 3 pts (1st place), 2 pts (2nd), 1 pt (3rd), 0 (4th+). Points accumulate across months in `total_points`.

### Detail Page

`/challenges/[groupId]` shows:
- Group header with name, visibility badge, invite code
- Per-metric leaderboard tabs (sorted by score, respecting `higherIsBetter`)
- All-time tab with podium for top 3 by total points
- Member list with points badges

---

## Frontend

The Challenges tab (`app/friends/components/ChallengesTab.tsx`) shows:
- Challenge group cards (glassmorphism design, h-220px)
- Metric badges, "Your Best Rank" indicator, days left in month
- Member avatars (max 4 + overflow count)
- "Join" via prompt for invite code
- "Create" opens `CreateChallengeGroupDialog`
- Card click navigates to `/challenges/[groupId]`

## Privacy

- **Spending Challenges**: Joining implicitly consents to sharing category spending within that challenge's scope
- **Challenge Groups**: Metrics use the same privacy-safe scores as Rankings (0-100, never raw amounts). Entry requirements apply (20+ transactions or 2+ receipts)

## Key Files

| File | Purpose |
|------|---------|
| `app/api/challenges/route.ts` | Spending challenge list + create |
| `app/api/challenges/[id]/route.ts` | Detail + delete |
| `app/api/challenges/[id]/join/route.ts` | Join |
| `app/api/challenges/[id]/leave/route.ts` | Leave |
| `app/api/challenges/[id]/refresh/route.ts` | Batch refresh |
| `app/api/challenge-groups/route.ts` | Group list + create |
| `app/api/challenge-groups/join/route.ts` | Join via code |
| `app/api/challenge-groups/[groupId]/route.ts` | Leave group |
| `app/friends/components/ChallengesTab.tsx` | UI tab |
| `app/challenges/[groupId]/page.tsx` | Group detail page |
| `components/friends/create-challenge-dialog.tsx` | Create spending challenge |
| `components/friends/create-challenge-group-dialog.tsx` | Create leaderboard group |
| `hooks/use-challenge-group.ts` | React Query hook for group detail |
| `lib/types/challenges.ts` | TypeScript types |
| `lib/charts/friends-aggregations.ts` | Bundle aggregation |
| `lib/friends/ranking-metrics.ts` | Metric computation engine |
