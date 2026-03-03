-- Migration: Add sharing preference columns to users table
-- These control whether a user's ranking metrics are visible to friends or publicly.
-- Default: both false (full privacy until user opts in)

ALTER TABLE users ADD COLUMN IF NOT EXISTS share_with_friends BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS share_publicly BOOLEAN DEFAULT false;

-- Index for efficient lookups when computing rankings
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_sharing_prefs
    ON users (id) WHERE share_with_friends = true;
