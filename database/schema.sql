-- database/schema.sql
-- Complete database schema for Trakzi
-- Run this against a fresh Neon branch to set up the database
--
-- NOTE: Neon already has uuid-ossp extension enabled by default
-- and gen_random_uuid() is a built-in PostgreSQL function

-- ============================================================================
-- USERS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,  -- Clerk user ID (e.g., "user_2abc123xyz")
    email TEXT UNIQUE NOT NULL,
    name TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- CATEGORIES TABLE (for transaction categorization)
-- ============================================================================
CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    color TEXT DEFAULT '#6366f1',
    icon TEXT,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, name)
);

CREATE INDEX idx_categories_user ON categories(user_id);

-- ============================================================================
-- TRANSACTION CATEGORY PREFERENCES (user learning for categorization)
-- ============================================================================
CREATE TABLE IF NOT EXISTS transaction_category_preferences (
    id SERIAL PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    description_key TEXT NOT NULL,
    example_description TEXT NULL,
    category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    use_count INTEGER NOT NULL DEFAULT 0,
    last_used_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS transaction_category_preferences_unique
    ON transaction_category_preferences (user_id, description_key);
CREATE INDEX idx_transaction_category_preferences_user ON transaction_category_preferences(user_id);

-- ============================================================================
-- STATEMENTS TABLE (uploaded bank statements)
-- ============================================================================
CREATE TABLE IF NOT EXISTS statements (
    id SERIAL PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    status TEXT DEFAULT 'processing', -- processing, completed, failed
    row_count INTEGER DEFAULT 0,
    imported_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_statements_user ON statements(user_id);

-- ============================================================================
-- TRANSACTIONS TABLE (bank transactions)
-- ============================================================================
CREATE TABLE IF NOT EXISTS transactions (
    id SERIAL PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    statement_id INTEGER REFERENCES statements(id) ON DELETE SET NULL,
    tx_date DATE NOT NULL,
    tx_time TIME,  -- NEW: Optional time from CSV import
    description TEXT NOT NULL,
    amount NUMERIC(12, 2) NOT NULL,
    balance NUMERIC(12, 2),
    category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
    currency TEXT DEFAULT 'EUR',
    raw_csv_row JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Performance indexes for transactions
CREATE INDEX idx_transactions_user ON transactions(user_id);
CREATE INDEX idx_transactions_user_date ON transactions(user_id, tx_date DESC);
CREATE INDEX idx_transactions_category ON transactions(category_id);
CREATE INDEX idx_transactions_statement ON transactions(statement_id);

-- Covering index for optimized queries (includes frequently selected columns)
CREATE INDEX idx_transactions_user_date_desc_covering 
    ON transactions(user_id, tx_date DESC) 
    INCLUDE (amount, balance, category_id, description, tx_time);

-- ============================================================================
-- CATEGORY BUDGETS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS category_budgets (
    id SERIAL PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    scope TEXT DEFAULT 'analytics',
    budget NUMERIC(12, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, category_id, scope)
);

CREATE INDEX idx_category_budgets_user ON category_budgets(user_id);

-- ============================================================================
-- USER FILES TABLE (uploaded files storage)
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_files (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    source TEXT DEFAULT 'Upload', -- 'Upload', 'Receipt', 'Statement'
    data BYTEA NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_user_files_user ON user_files(user_id);
CREATE INDEX idx_user_files_source ON user_files(user_id, source);

-- ============================================================================
-- RECEIPTS TABLE (grocery receipts)
-- ============================================================================
CREATE TABLE IF NOT EXISTS receipts (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    receipt_file_id TEXT REFERENCES user_files(id) ON DELETE SET NULL,
    store_name TEXT,
    receipt_date DATE,
    receipt_time TIME,
    total_amount NUMERIC(12, 2),
    currency TEXT DEFAULT 'EUR',
    status TEXT DEFAULT 'processing', -- processing, completed, failed
    ai_extraction_data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_receipts_user ON receipts(user_id);
CREATE INDEX idx_receipts_date ON receipts(user_id, receipt_date DESC);

-- ============================================================================
-- RECEIPT CATEGORY TYPES TABLE (macronutrient types)
-- ============================================================================
CREATE TABLE IF NOT EXISTS receipt_category_types (
    id SERIAL PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    color TEXT DEFAULT '#6366f1',
    is_default BOOLEAN DEFAULT FALSE,  -- System defaults cannot be deleted
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, name)
);

CREATE INDEX idx_receipt_category_types_user ON receipt_category_types(user_id);

-- ============================================================================
-- RECEIPT CATEGORIES TABLE (food categories)
-- ============================================================================
CREATE TABLE IF NOT EXISTS receipt_categories (
    id SERIAL PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type_id INTEGER REFERENCES receipt_category_types(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    color TEXT DEFAULT '#6366f1',
    broad_type TEXT, -- For quick filtering: 'Drinks', 'Food', 'Other'
    is_default BOOLEAN DEFAULT FALSE,  -- System defaults cannot be deleted
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, name)
);

CREATE INDEX idx_receipt_categories_user ON receipt_categories(user_id);
CREATE INDEX idx_receipt_categories_type ON receipt_categories(type_id);

-- ============================================================================
-- RECEIPT TRANSACTIONS TABLE (individual items from receipts)
-- ============================================================================
CREATE TABLE IF NOT EXISTS receipt_transactions (
    id SERIAL PRIMARY KEY,
    receipt_id TEXT NOT NULL REFERENCES receipts(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    quantity NUMERIC(10, 2) DEFAULT 1,
    price_per_unit NUMERIC(12, 2),
    total_price NUMERIC(12, 2) NOT NULL,
    category_id INTEGER REFERENCES receipt_categories(id) ON DELETE SET NULL,
    category_type_id INTEGER REFERENCES receipt_category_types(id) ON DELETE SET NULL,
    receipt_date DATE,
    receipt_time TIME,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_receipt_transactions_user ON receipt_transactions(user_id);
CREATE INDEX idx_receipt_transactions_receipt ON receipt_transactions(receipt_id);
CREATE INDEX idx_receipt_transactions_date ON receipt_transactions(user_id, receipt_date DESC);
CREATE INDEX idx_receipt_transactions_category ON receipt_transactions(category_id);

-- Covering index for fridge page queries
CREATE INDEX idx_receipt_transactions_covering 
    ON receipt_transactions(user_id, receipt_date DESC) 
    INCLUDE (category_id, category_type_id, description, quantity, total_price);

-- ============================================================================
-- RECEIPT ITEM CATEGORY PREFERENCES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS receipt_item_category_preferences (
    id SERIAL PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    store_key TEXT NOT NULL DEFAULT '',
    description_key TEXT NOT NULL,
    category_id INTEGER NOT NULL REFERENCES receipt_categories(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, store_key, description_key)
);

CREATE INDEX idx_receipt_item_prefs_user ON receipt_item_category_preferences(user_id);
CREATE INDEX idx_receipt_item_prefs_lookup ON receipt_item_category_preferences(user_id, store_key, description_key);

-- ============================================================================
-- SUBSCRIPTIONS TABLE (Stripe subscriptions)
-- ============================================================================
CREATE TABLE IF NOT EXISTS subscriptions (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id TEXT UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    plan TEXT DEFAULT 'free', -- free, pro, max
    status TEXT DEFAULT 'active', -- active, canceled, past_due, trialing
    stripe_customer_id TEXT UNIQUE,
    stripe_subscription_id TEXT UNIQUE,
    stripe_price_id TEXT,
    current_period_end TIMESTAMPTZ,
    cancel_at_period_end BOOLEAN DEFAULT FALSE,
    is_lifetime BOOLEAN DEFAULT FALSE, -- Lifetime subscriptions bypass Stripe operations
    pending_plan TEXT DEFAULT NULL, -- Plan the user will switch to at period end
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_subscriptions_user ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_stripe_customer ON subscriptions(stripe_customer_id);
CREATE INDEX idx_subscriptions_stripe_sub ON subscriptions(stripe_subscription_id);

-- ============================================================================
-- HELPER FUNCTION: Update updated_at timestamp
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at trigger to relevant tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON categories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_statements_updated_at BEFORE UPDATE ON statements FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON transactions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_receipts_updated_at BEFORE UPDATE ON receipts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_receipt_categories_updated_at BEFORE UPDATE ON receipt_categories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_receipt_category_types_updated_at BEFORE UPDATE ON receipt_category_types FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_receipt_transactions_updated_at BEFORE UPDATE ON receipt_transactions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON subscriptions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_category_budgets_updated_at BEFORE UPDATE ON category_budgets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
