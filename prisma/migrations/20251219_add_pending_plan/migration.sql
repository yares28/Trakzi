-- Add pending_plan column to subscriptions table
-- This stores the plan the user will switch to at the end of the billing period

ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS pending_plan TEXT DEFAULT NULL;
