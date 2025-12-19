-- Add is_lifetime column to subscriptions table
-- This allows marking subscriptions as lifetime (bypassing Stripe operations)

ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS is_lifetime BOOLEAN DEFAULT FALSE;
