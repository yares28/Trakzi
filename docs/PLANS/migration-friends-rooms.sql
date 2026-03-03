-- =====================================================
-- Trakzi Friends & Rooms — Phase 1 Database Migration
-- Run this manually against Neon Postgres
-- =====================================================
-- Creates 9 tables: friendships, friend_codes, rooms,
-- room_members, shared_transactions, receipt_items,
-- transaction_splits, challenges, challenge_participants
-- =====================================================

-- 1. FRIENDSHIPS
-- Bidirectional friend relationships with request flow.
-- LEAST/GREATEST unique index prevents (A→B) and (B→A) duplicates.
CREATE TABLE friendships (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    requester_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    addressee_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'declined', 'blocked')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(requester_id, addressee_id)
);

CREATE INDEX idx_friendships_requester ON friendships(requester_id, status);
CREATE INDEX idx_friendships_addressee ON friendships(addressee_id, status);
CREATE UNIQUE INDEX idx_friendships_pair ON friendships(
    LEAST(requester_id, addressee_id),
    GREATEST(requester_id, addressee_id)
);

-- 2. FRIEND CODES
-- 1:1 per user, crypto-random 8-char code for QR / shareable link.
CREATE TABLE friend_codes (
    user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    code TEXT UNIQUE NOT NULL,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_friend_codes_code ON friend_codes(code);

-- 3. ROOMS
-- Group expense containers. Each room has a unique invite code.
CREATE TABLE rooms (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    name TEXT NOT NULL,
    created_by TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    invite_code TEXT UNIQUE NOT NULL,
    description TEXT,
    avatar_url TEXT,
    currency TEXT DEFAULT 'EUR',
    is_archived BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_rooms_created_by ON rooms(created_by);
CREATE UNIQUE INDEX idx_rooms_invite_code ON rooms(invite_code);
CREATE INDEX idx_rooms_created_at ON rooms(created_at DESC);

-- 4. ROOM MEMBERS
-- Composite PK (room_id, user_id). Roles: owner, admin, member.
CREATE TABLE room_members (
    room_id TEXT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'member')),
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (room_id, user_id)
);

CREATE INDEX idx_room_members_user ON room_members(user_id);
CREATE INDEX idx_room_members_room ON room_members(room_id);

-- 5. SHARED TRANSACTIONS
-- CHECK constraint: must belong to a room OR a friendship (quick split).
-- original_tx_id links to a user's personal transaction if shared from bank data.
CREATE TABLE shared_transactions (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    room_id TEXT REFERENCES rooms(id) ON DELETE CASCADE,
    friendship_id TEXT REFERENCES friendships(id) ON DELETE SET NULL,
    uploaded_by TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    original_tx_id INTEGER REFERENCES transactions(id) ON DELETE SET NULL,
    total_amount NUMERIC(10,2) NOT NULL,
    currency TEXT DEFAULT 'EUR',
    description TEXT NOT NULL,
    category TEXT,
    transaction_date DATE NOT NULL,
    receipt_url TEXT,
    split_type TEXT CHECK (split_type IN ('equal', 'percentage', 'custom', 'item_level')) DEFAULT 'equal',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CHECK (room_id IS NOT NULL OR friendship_id IS NOT NULL)
);

CREATE INDEX idx_shared_tx_room ON shared_transactions(room_id, transaction_date DESC)
    WHERE room_id IS NOT NULL;
CREATE INDEX idx_shared_tx_friendship ON shared_transactions(friendship_id, transaction_date DESC)
    WHERE friendship_id IS NOT NULL;
CREATE INDEX idx_shared_tx_uploader ON shared_transactions(uploaded_by);
CREATE INDEX idx_shared_tx_original ON shared_transactions(original_tx_id)
    WHERE original_tx_id IS NOT NULL;

-- 6. RECEIPT ITEMS
-- Individual line items from OCR-parsed receipts, linked to a shared transaction.
CREATE TABLE receipt_items (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    shared_tx_id TEXT NOT NULL REFERENCES shared_transactions(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    amount NUMERIC(10,2) NOT NULL,
    quantity INTEGER DEFAULT 1,
    category TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_receipt_items_tx ON receipt_items(shared_tx_id);

-- 7. TRANSACTION SPLITS
-- Per-user split amounts. Links to shared_transaction, optionally to a receipt_item.
CREATE TABLE transaction_splits (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    shared_tx_id TEXT NOT NULL REFERENCES shared_transactions(id) ON DELETE CASCADE,
    item_id TEXT REFERENCES receipt_items(id) ON DELETE SET NULL,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount NUMERIC(10,2) NOT NULL,
    status TEXT CHECK (status IN ('pending', 'settled')) DEFAULT 'pending',
    settled_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_splits_user_status ON transaction_splits(user_id, status);
CREATE INDEX idx_splits_tx ON transaction_splits(shared_tx_id);
CREATE INDEX idx_splits_item ON transaction_splits(item_id) WHERE item_id IS NOT NULL;

-- 8. CHALLENGES
-- Cross-friend spending challenges with date ranges and targets.
CREATE TABLE challenges (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    created_by TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    category TEXT NOT NULL,
    goal_type TEXT NOT NULL CHECK (goal_type IN ('individual_cap', 'group_total')),
    target_amount NUMERIC(10,2) NOT NULL,
    starts_at DATE NOT NULL,
    ends_at DATE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_challenges_creator ON challenges(created_by);
CREATE INDEX idx_challenges_ends_at ON challenges(ends_at);

-- 9. CHALLENGE PARTICIPANTS
-- Composite PK. current_spend is a cached aggregate, refreshed server-side.
CREATE TABLE challenge_participants (
    challenge_id TEXT NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    current_spend NUMERIC(10,2) DEFAULT 0,
    PRIMARY KEY (challenge_id, user_id)
);

CREATE INDEX idx_challenge_participants_user ON challenge_participants(user_id);

-- =====================================================
-- DONE — 9 tables, 20 indexes created
-- =====================================================

-- =====================================================
-- Phase 2 — Score-Based Challenge Groups
-- =====================================================
-- 3 new tables: challenge_groups, challenge_group_members,
-- challenge_monthly_results
-- =====================================================

-- 10. CHALLENGE GROUPS
-- Score-based monthly battle groups.
-- metrics: array of metric keys users battle on, e.g. {"savingsRate","fridgeScore"}
-- is_public: if true, anyone can join via discover; if false, invite-code only.
CREATE TABLE challenge_groups (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    name TEXT NOT NULL,
    created_by TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    is_public BOOLEAN DEFAULT false,
    invite_code TEXT UNIQUE NOT NULL,
    metrics TEXT[] NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_challenge_groups_invite ON challenge_groups(invite_code);
CREATE INDEX idx_challenge_groups_public ON challenge_groups(is_public) WHERE is_public = true;
CREATE INDEX idx_challenge_groups_creator ON challenge_groups(created_by);

-- 11. CHALLENGE GROUP MEMBERS
-- Composite PK (group_id, user_id).
-- total_points: accumulated all-time across all months (3/2/1 per metric placement).
CREATE TABLE challenge_group_members (
    group_id TEXT NOT NULL REFERENCES challenge_groups(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    total_points INTEGER DEFAULT 0,
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (group_id, user_id)
);

CREATE INDEX idx_cgm_user ON challenge_group_members(user_id);
CREATE INDEX idx_cgm_group ON challenge_group_members(group_id, total_points DESC);

-- 12. CHALLENGE MONTHLY RESULTS
-- Snapshot of final scores at month-end for each user × metric × group.
-- Unique per (group, user, month, metric) to prevent duplicates.
CREATE TABLE challenge_monthly_results (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    group_id TEXT NOT NULL REFERENCES challenge_groups(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    month TEXT NOT NULL,          -- 'YYYY-MM'
    metric TEXT NOT NULL,         -- e.g. 'savingsRate', 'fridgeScore'
    rank INTEGER NOT NULL,        -- 1, 2, 3, 4...
    points INTEGER NOT NULL,      -- 3 for 1st, 2 for 2nd, 1 for 3rd, 0 otherwise
    score NUMERIC(5,2) NOT NULL,  -- the metric value at snapshot time
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(group_id, user_id, month, metric)
);

CREATE INDEX idx_cmr_group_month ON challenge_monthly_results(group_id, month);
CREATE INDEX idx_cmr_user ON challenge_monthly_results(user_id);

-- =====================================================
-- DONE — 12 tables, 27 indexes total
-- =====================================================
