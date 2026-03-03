# Friends & Rooms — Implementation Summary

**Purpose**: Hand-off document for starting implementation in a new context window.
**Source plan**: `docs/PLANS/rooms-sharing-feature.md` (v5 — latest)

---

## What Exists Already

### Frontend Shell (fully built, do NOT redesign)

| File | What it does |
|------|-------------|
| `app/friends/page.tsx` | Main page with pill tab switcher (currently 2 tabs: Rankings / Groups) |
| `app/friends/components/FriendsLayout.tsx` | Layout wrapper — sidebar + header |
| `app/friends/components/RankingsTab.tsx` | Podium (gold/silver/bronze) + glassmorphism leaderboard with 3 metrics |
| `app/friends/components/GroupsTab.tsx` | Themed gradient room cards grid (5 themes) + summary stat cards + "Create Group" tile |
| `hooks/use-friends-bundle.ts` | React Query hook fetching `{ friends, rooms }` with demo mode support |
| `app/api/demo/friends-bundle/route.ts` | Demo API → `MOCK_FRIENDS_BUNDLE` |
| `lib/demo/mock-data.ts` | `MOCK_FRIENDS`, `MOCK_ROOMS`, `MOCK_FRIENDS_BUNDLE` |

### Design System (locked — match exactly)

- Pill switcher: `rounded-full`, active = `bg-background shadow`
- Room cards: `rounded-3xl bg-gradient-to-br`, 5 themes (blue/emerald/violet/rose/amber)
- Leaderboard: `bg-white/5 dark:bg-black/20 backdrop-blur-xl rounded-3xl`
- Typography: `font-mono font-medium` wrapper, `font-sans` card labels
- Colors: positive = `text-emerald-500`, negative = `text-rose-500`

---

## What Needs to Be Built (Implementation Order)

### Phase 1: Database Schema & Types (do first)

**9 new tables** to create in Neon:

1. `friendships` — bidirectional with `LEAST/GREATEST` unique index
2. `friend_codes` — 1:1 per user, crypto-random 8-char code
3. `rooms` — name, invite_code, created_by, currency, is_archived
4. `room_members` — composite PK (room_id, user_id), role enum
5. `shared_transactions` — CHECK constraint: room_id OR friendship_id must be set
6. `receipt_items` — linked to shared_transactions
7. `transaction_splits` — per-user split amounts with settled status
8. `challenges` — title, category, goal_type, target_amount, date range
9. `challenge_participants` — composite PK, current_spend cache

**TypeScript types** to create:
- `lib/types/friends.ts` — FriendshipStatus, FriendWithBalance, FriendRequest, FriendCode
- `lib/types/rooms.ts` — Room, RoomMember, RoomRole, SharedTransaction, SplitType, TransactionSplit
- `lib/types/challenges.ts` — Challenge, ChallengeParticipant, ChallengeGoalType

**Full SQL for all tables is in** `docs/PLANS/rooms-sharing-feature.md` → "Database Schema" section.

### Phase 2: Friend System API

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/friends/search` | POST | Search by exact email (rate limited 10/min) |
| `/api/friends/request` | POST | Send friend request |
| `/api/friends/requests` | GET | Pending requests (sent + received) |
| `/api/friends/requests/[id]` | PATCH | Accept/decline |
| `/api/friends` | GET | List accepted friends with balance |
| `/api/friends/[friendshipId]` | DELETE | Remove friend |
| `/api/friends/block/[userId]` | POST | Block user |
| `/api/friends/my-code` | GET | Get/generate personal friend code |
| `/api/friends/add-by-code` | POST | Add friend via code (QR scan) |

**Middleware**: `lib/friends/permissions.ts` — `verifyFriendship()`, `checkFriendLimit()`

### Phase 3: Room Management API

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/rooms` | POST/GET | Create room / list user's rooms |
| `/api/rooms/[roomId]` | GET/PATCH/DELETE | Room CRUD |
| `/api/rooms/join` | POST | Join via invite code |
| `/api/rooms/[roomId]/invite` | POST | Invite friends (instant add) |
| `/api/rooms/[roomId]/members/[userId]` | DELETE/PATCH | Remove / change role |

**Middleware**: `lib/rooms/permissions.ts`

### Phase 4: Shared Transactions & Splits

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/rooms/[roomId]/transactions` | POST/GET | Upload / list shared transactions |
| `/api/rooms/[roomId]/transactions/[txId]` | GET/DELETE | Detail / delete |
| `/api/friends/[friendshipId]/splits` | POST/GET | Quick 1:1 splits |
| `/api/transactions/[txId]/share` | POST | Link personal tx to split |
| `/api/splits/[splitId]/settle` | PATCH | Mark settled |

**Balance engine**: `lib/rooms/balances.ts`
Split types: `equal | percentage | custom | item_level`

### Phase 5: Complete the Frontend (4 tabs)

**Add 2 new tabs** to `app/friends/page.tsx`:

1. **FriendsTab** (`app/friends/components/FriendsTab.tsx`)
   - Net balance summary cards (same style as GroupsTab)
   - Pending requests section (accept/decline)
   - Friends list with balances (glassmorphism card, same as leaderboard)
   - Activity feed (last 10 events)

2. **ChallengesTab** (`app/friends/components/ChallengesTab.tsx`)
   - Active challenges list (expandable)
   - Per-member leaderboard within each challenge (reuse ranking row component)
   - "New Challenge" button → `CreateChallengeDialog`

**Dialogs to create:**
- `components/friends/add-friend-dialog.tsx` — 3 sub-tabs: Email / Code / QR
- `components/rooms/create-room-dialog.tsx` — name, theme picker, invite friends
- `components/rooms/join-room-dialog.tsx` — enter invite code
- `components/friends/quick-split-dialog.tsx` — 1:1 split
- `components/rooms/settle-up-dialog.tsx` — mark settled / send link

**Wire existing buttons:**
- "Add Friends" in RankingsTab → `AddFriendDialog`
- "Create Group" in GroupsTab → `CreateRoomDialog`
- Room card click → `/rooms/[roomId]`

**New pages:**
- `app/rooms/[roomId]/page.tsx` — room detail (balances + transaction feed + simplified analytics)
- `app/friends/[friendId]/page.tsx` — friend profile (balance + chemistry score + spending impact + insights)

### Phase 6: Bundle API & Caching

**Extend `FriendsBundleData`:**
```typescript
interface FriendsBundleData {
  friends: FriendScore[]         // rankings data (exists)
  rooms: RoomData[]              // groups data (exists)
  friendsList: FriendWithBalance[]  // NEW
  pendingRequests: FriendRequest[]  // NEW
  activityFeed: ActivityItem[]      // NEW
  challenges: Challenge[]           // NEW
  netBalance: { totalOwedToYou: number; totalYouOwe: number }  // NEW
}
```

**Cache keys** (Upstash Redis, same pattern as existing bundles):
- `friends:user:{userId}:*` — 1-5 min TTL
- `room:{roomId}:bundle` — 2 min TTL
- `friendship:{id}:insights` — 10 min TTL

### Phase 7: Plan Limits

Update `lib/plan-limits.ts`:
| Plan | Max Friends | Max Rooms | Shared Tx/Month | Quick Splits/Month |
|------|-------------|-----------|------------------|--------------------|
| Free | 5 | 2 | 50 | 20 |
| Pro | 50 | 10 | 200 | 100 |
| Max | Unlimited | Unlimited | Unlimited | Unlimited |

---

## Key Architecture Rules

1. **All queries filter by user_id** — no data leaks between users
2. **Bundle API pattern** — never fetch chart/friend data individually, always aggregate in bundle
3. **Cache everything** via `getCachedOrCompute()` with `buildCacheKey()` and `CACHE_TTL`
4. **Invalidate on mutation** via `invalidateUserCachePrefix()`
5. **Auth**: `getCurrentUserId()` on every API route
6. **DB access**: `neonQuery()` / `neonInsert()` from `lib/neonClient.ts`, parameterized queries only
7. **Memo all chart/card components** with `React.memo` + `displayName`

---

## Start Here

**Recommended first task**: Phase 1 — create database tables in Neon + TypeScript types. This unblocks everything else.

Read the full plan at `docs/PLANS/rooms-sharing-feature.md` for complete SQL, API specs, permissions matrix, and risk mitigation.
