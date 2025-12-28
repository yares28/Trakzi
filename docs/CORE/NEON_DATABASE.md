# Neon Database Documentation

This document contains comprehensive information about the Neon database setup for the Trakzi project, extracted using the Neon MCP tools.

## Organization Information

- **Organization Name**: yares
- **Organization ID**: org-damp-flower-56045386
- **Organization Handle**: yares-org-damp-flower-56045386
- **Plan**: free
- **Created**: November 22, 2025
- **Updated**: November 24, 2025
- **Members**: 1
- **Projects**: 1

## Project Information

- **Project Name**: Trakzi
- **Project ID**: orange-waterfall-16223480
- **Console URL**: https://console.neon.tech/app/projects/orange-waterfall-16223480

## Branch Information

### Production Branch (Default)

- **Branch Name**: Prod
- **Branch ID**: br-rapid-voice-abajd9gp
- **Status**: ready
- **Primary**: Yes
- **Default**: Yes
- **Protected**: No
- **Created**: November 22, 2025 at 19:29:06 UTC
- **Updated**: December 23, 2025 at 23:50:35 UTC
- **Created By**: yares
- **Logical Size**: 38,846,464 bytes (~37 MB)
- **Compute Usage**: 63,569 seconds (~17.7 hours)
- **Active Time**: 248,964 seconds (~69.2 hours)
- **Written Data**: 99,368,560 bytes (~94.8 MB)
- **Data Transfer**: 146,066,300 bytes (~139.4 MB)
- **Console Link**: https://console.neon.tech/app/projects/orange-waterfall-16223480/branches/br-rapid-voice-abajd9gp

## Compute Endpoint Information

- **Compute ID**: ep-purple-tree-abhoip45
- **Compute Type**: read_write
- **Compute Size**: 0.25-2 CU (autoscaling)
- **Autoscaling Min CU**: 0.25
- **Autoscaling Max CU**: 2
- **Region**: aws-eu-west-2 (London)
- **Host**: ep-purple-tree-abhoip45.eu-west-2.aws.neon.tech
- **Proxy Host**: eu-west-2.aws.neon.tech
- **Current State**: active
- **Last Active**: December 24, 2025 at 00:06:20 UTC
- **Started At**: December 24, 2025 at 00:06:09 UTC
- **Pooler Enabled**: false
- **Pooler Mode**: transaction
- **Passwordless Access**: true
- **Suspend Timeout**: 0 seconds
- **Compute Release Version**: 10673
- **Created**: November 22, 2025 at 19:29:06 UTC
- **Updated**: December 24, 2025 at 00:06:22 UTC

## Connection String

**Pooled Connection String** (Recommended for application use):
```
postgresql://neondb_owner:npg_nCG8VWF9OSwI@ep-purple-tree-abhoip45-pooler.eu-west-2.aws.neon.tech/neondb?channel_binding=require&sslmode=require
```

**Connection Details**:
- **Database**: neondb
- **Role**: neondb_owner
- **Branch ID**: br-rapid-voice-abajd9gp
- **Using Default Compute**: Yes

## Database Structure

### Databases

1. **postgres** (system database)
2. **neondb** (main application database)

### Schemas

1. **public** - Main application schema
2. **neon_auth** - Neon Auth schema (contains `users_sync` table)

## Tables Overview

### Public Schema Tables

1. **users** - User accounts (Clerk authentication)
2. **categories** - Transaction categories (41 defaults)
3. **transactions** - Bank transactions
4. **statements** - Uploaded bank statements
5. **category_budgets** - Category budget settings
6. **user_files** - Uploaded files storage
7. **receipts** - Grocery receipt metadata
8. **receipt_category_types** - Macronutrient types (6 types: Protein, Carbs, Fat, Mixed, None, Other)
9. **receipt_categories** - Food/Drink/Non-food categories (62 defaults, broad_type: Food/Drinks/Other)
10. **receipt_transactions** - Individual receipt line items
11. **receipt_item_category_preferences** - Receipt item categorization preferences
12. **transaction_category_preferences** - Transaction categorization preferences
13. **subscriptions** - Stripe subscription management
14. **webhook_events** - Stripe webhook event tracking (idempotency)

### Neon Auth Schema Tables

1. **users_sync** - Neon Auth user synchronization table

## Detailed Table Schemas

### 1. users

**Purpose**: Stores user accounts linked to Clerk authentication

**Columns**:
- `id` (text, PRIMARY KEY) - Clerk user ID (e.g., "user_2abc123xyz")
- `email` (text, NOT NULL, UNIQUE) - User email address
- `name` (text, NULLABLE) - User display name
- `created_at` (timestamp without time zone, NOT NULL, DEFAULT CURRENT_TIMESTAMP)
- `updated_at` (timestamp without time zone, NOT NULL)

**Indexes**:
- `users_pkey` (16 kB) - PRIMARY KEY on `id`
- `users_email_key` (16 kB) - UNIQUE index on `email`

**Constraints**:
- PRIMARY KEY: `id`

**Size**: Table: 8 kB, Indexes: 72 kB, Total: 80 kB

---

### 2. transactions

**Purpose**: Stores bank transaction records

**Columns**:
- `id` (integer, PRIMARY KEY, AUTO_INCREMENT)
- `user_id` (text, NOT NULL) - References `users(id)`
- `statement_id` (integer, NULLABLE) - References `statements(id)`
- `tx_date` (date, NOT NULL) - Transaction date
- `tx_time` (time without time zone, NULLABLE) - Transaction time (from CSV import)
- `description` (text, NOT NULL) - Transaction description
- `amount` (numeric, NOT NULL) - Transaction amount
- `balance` (numeric, NULLABLE) - Account balance after transaction
- `category_id` (integer, NULLABLE) - References `categories(id)`
- `currency` (text, NOT NULL, DEFAULT 'EUR')
- `raw_csv_row` (jsonb, NULLABLE) - Original CSV row data
- `created_at` (timestamp without time zone, NOT NULL, DEFAULT CURRENT_TIMESTAMP)
- `updated_at` (timestamp without time zone, NOT NULL)

**Indexes**:
- `transactions_pkey` (16 kB) - PRIMARY KEY on `id`
- `idx_transactions_user` (16 kB) - Index on `user_id`
- `idx_transactions_user_date` (32 kB) - Composite index on `user_id, tx_date DESC`
- `idx_transactions_user_date_desc_covering` (56 kB) - Covering index on `user_id, tx_date DESC` INCLUDE (`amount`, `balance`, `category_id`, `description`, `tx_time`)

**Constraints**:
- PRIMARY KEY: `id`
- FOREIGN KEY: `user_id` → `users(id)` ON DELETE CASCADE

**Size**: Table: 112 kB, Indexes: 152 kB, Total: 264 kB

---

### 3. categories

**Purpose**: User-defined transaction categories

**Columns**:
- `id` (integer, PRIMARY KEY, AUTO_INCREMENT)
- `user_id` (text, NOT NULL) - References `users(id)`
- `name` (text, NOT NULL) - Category name
- `color` (text, NULLABLE, DEFAULT '#6366f1') - Category color
- `icon` (text, NULLABLE) - Category icon
- `is_default` (boolean, NULLABLE, DEFAULT false) - System default flag
- `created_at` (timestamp with time zone, NULLABLE, DEFAULT now())
- `updated_at` (timestamp with time zone, NULLABLE, DEFAULT now())

**Indexes**:
- `categories_pkey` (16 kB) - PRIMARY KEY on `id`
- `categories_user_id_name_key` (16 kB) - UNIQUE index on `user_id, name`
- `idx_categories_user` (16 kB) - Index on `user_id`
- `idx_categories_user_name` (16 kB) - Composite index on `user_id, name`

**Constraints**:
- PRIMARY KEY: `id`
- UNIQUE: `user_id, name`
- FOREIGN KEY: `user_id` → `users(id)` ON DELETE CASCADE

**Size**: Table: 16 kB, Indexes: 96 kB, Total: 112 kB

---

### 4. statements

**Purpose**: Tracks uploaded bank statement files

**Columns**:
- `id` (integer, PRIMARY KEY, AUTO_INCREMENT)
- `user_id` (text, NOT NULL) - References `users(id)`
- `file_name` (text, NOT NULL) - Original filename
- `status` (text, NULLABLE, DEFAULT 'processing') - processing, completed, failed
- `row_count` (integer, NULLABLE, DEFAULT 0) - Total rows in CSV
- `imported_count` (integer, NULLABLE, DEFAULT 0) - Successfully imported rows
- `created_at` (timestamp with time zone, NULLABLE, DEFAULT now())
- `updated_at` (timestamp with time zone, NULLABLE, DEFAULT now())

**Indexes**:
- `statements_pkey` (16 kB) - PRIMARY KEY on `id`
- `idx_statements_user` (16 kB) - Index on `user_id`
- `idx_statements_user_created` (16 kB) - Composite index on `user_id, created_at DESC`

**Constraints**:
- PRIMARY KEY: `id`
- FOREIGN KEY: `user_id` → `users(id)` ON DELETE CASCADE

**Size**: Table: 8 kB, Indexes: 56 kB, Total: 64 kB

---

### 5. category_budgets

**Purpose**: Stores user-defined category budgets for analytics

**Columns**:
- `id` (integer, PRIMARY KEY, AUTO_INCREMENT)
- `user_id` (text, NOT NULL) - References `users(id)`
- `category_id` (integer, NOT NULL) - References `categories(id)`
- `scope` (text, NULLABLE, DEFAULT 'analytics') - Budget scope
- `budget` (numeric, NOT NULL, DEFAULT 0) - Budget amount
- `created_at` (timestamp with time zone, NULLABLE, DEFAULT now())
- `updated_at` (timestamp with time zone, NULLABLE, DEFAULT now())

**Indexes**:
- `category_budgets_pkey` (8 kB) - PRIMARY KEY on `id`
- `category_budgets_user_id_category_id_scope_key` (8 kB) - UNIQUE index on `user_id, category_id, scope`
- `idx_category_budgets_user` (8 kB) - Index on `user_id`

**Constraints**:
- PRIMARY KEY: `id`
- UNIQUE: `user_id, category_id, scope`
- FOREIGN KEY: `user_id` → `users(id)` ON DELETE CASCADE
- FOREIGN KEY: `category_id` → `categories(id)` ON DELETE CASCADE

**Size**: Table: 0 bytes, Indexes: 32 kB, Total: 32 kB

---

### 6. user_files

**Purpose**: Stores uploaded files (receipts, statements, etc.)

**Columns**:
- `id` (text, PRIMARY KEY, DEFAULT gen_random_uuid()::text)
- `user_id` (text, NOT NULL) - References `users(id)`
- `file_name` (text, NOT NULL) - Original filename
- `mime_type` (text, NOT NULL) - File MIME type
- `source` (text, NULLABLE, DEFAULT 'Upload') - 'Upload', 'Receipt', 'Statement'
- `data` (bytea, NOT NULL) - File binary data
- `created_at` (timestamp with time zone, NULLABLE, DEFAULT now())

**Indexes**:
- `user_files_pkey` (16 kB) - PRIMARY KEY on `id`
- `idx_user_files_user` (16 kB) - Index on `user_id`
- `idx_user_files_source` (16 kB) - Composite index on `user_id, source`

**Constraints**:
- PRIMARY KEY: `id`
- FOREIGN KEY: `user_id` → `users(id)` ON DELETE CASCADE

**Size**: Table: 16 kB, Indexes: 5,816 kB, Total: 5,832 kB

---

### 7. receipts

**Purpose**: Stores grocery receipt metadata

**Columns**:
- `id` (text, PRIMARY KEY, DEFAULT gen_random_uuid()::text)
- `user_id` (text, NOT NULL) - References `users(id)`
- `receipt_file_id` (text, NULLABLE) - References `user_files(id)`
- `store_name` (text, NULLABLE) - Store name from receipt
- `receipt_date` (date, NULLABLE) - Receipt date
- `receipt_time` (time without time zone, NULLABLE) - Receipt time
- `total_amount` (numeric, NULLABLE) - Total receipt amount
- `currency` (text, NULLABLE, DEFAULT 'EUR')
- `status` (text, NULLABLE, DEFAULT 'processing') - processing, completed, failed
- `ai_extraction_data` (jsonb, NULLABLE) - AI extraction metadata
- `created_at` (timestamp with time zone, NULLABLE, DEFAULT now())
- `updated_at` (timestamp with time zone, NULLABLE, DEFAULT now())

**Indexes**:
- `receipts_pkey` (16 kB) - PRIMARY KEY on `id`
- `idx_receipts_user` (16 kB) - Index on `user_id`
- `idx_receipts_date` (16 kB) - Composite index on `user_id, receipt_date DESC`

**Constraints**:
- PRIMARY KEY: `id`
- FOREIGN KEY: `user_id` → `users(id)` ON DELETE CASCADE
- FOREIGN KEY: `receipt_file_id` → `user_files(id)` ON DELETE SET NULL

**Size**: Table: 8 kB, Indexes: 56 kB, Total: 64 kB

---

### 8. receipt_category_types

**Purpose**: Stores macronutrient types (Protein, Carbs, Fat, Fiber, Vitamins/Minerals)

**Columns**:
- `id` (integer, PRIMARY KEY, AUTO_INCREMENT)
- `user_id` (text, NOT NULL) - References `users(id)`
- `name` (text, NOT NULL) - Type name
- `color` (text, NULLABLE, DEFAULT '#6366f1') - Type color
- `is_default` (boolean, NULLABLE, DEFAULT false) - System default flag
- `created_at` (timestamp with time zone, NULLABLE, DEFAULT now())
- `updated_at` (timestamp with time zone, NULLABLE, DEFAULT now())

**Indexes**:
- `receipt_category_types_pkey` (16 kB) - PRIMARY KEY on `id`
- `receipt_category_types_user_id_name_key` (16 kB) - UNIQUE index on `user_id, name`
- `idx_receipt_category_types_user` (16 kB) - Index on `user_id`

**Constraints**:
- PRIMARY KEY: `id`
- UNIQUE: `user_id, name`
- FOREIGN KEY: `user_id` → `users(id)` ON DELETE CASCADE

**Size**: Table: 8 kB, Indexes: 56 kB, Total: 64 kB

---

### 9. receipt_categories

**Purpose**: Stores food, drink, and non-food grocery categories

**Default Categories**: 62 categories organized by type:
- Food (38): Fresh/whole foods, bakery, pantry staples, snacks, frozen, prepared foods
- Drinks (9): Water, soft drinks, juice, coffee/tea, energy drinks, alcohol (beer, wine, spirits, low/no alcohol)
- Other (15): OTC medicine, supplements, hygiene, cleaning, baby, pet supplies

**Columns**:
- `id` (integer, PRIMARY KEY, AUTO_INCREMENT)
- `user_id` (text, NOT NULL) - References `users(id)`
- `type_id` (integer, NULLABLE) - References `receipt_category_types(id)` (fallback macro classification)
- `name` (text, NOT NULL) - Category name
- `color` (text, NULLABLE, DEFAULT '#6366f1') - Category color
- `broad_type` (text, NULLABLE) - **Standardized values**: 'Food' | 'Drinks' | 'Other' (used for filtering)
- `is_default` (boolean, NULLABLE, DEFAULT false) - System default flag
- `created_at` (timestamp with time zone, NULLABLE, DEFAULT now())
- `updated_at` (timestamp with time zone, NULLABLE, DEFAULT now())

**Indexes**:
- `receipt_categories_pkey` (16 kB) - PRIMARY KEY on `id`
- `receipt_categories_user_id_name_key` (16 kB) - UNIQUE index on `user_id, name`
- `idx_receipt_categories_user` (16 kB) - Index on `user_id`
- `idx_receipt_categories_type` (16 kB) - Index on `type_id`

**Constraints**:
- PRIMARY KEY: `id`
- UNIQUE: `user_id, name`
- FOREIGN KEY: `user_id` → `users(id)` ON DELETE CASCADE
- FOREIGN KEY: `type_id` → `receipt_category_types(id)` ON DELETE SET NULL

**Size**: Table: 16 kB, Indexes: 96 kB, Total: 112 kB

---

### 10. receipt_transactions

**Purpose**: Stores individual line items from receipts

**Columns**:
- `id` (integer, PRIMARY KEY, AUTO_INCREMENT)
- `receipt_id` (text, NOT NULL) - References `receipts(id)`
- `user_id` (text, NOT NULL) - References `users(id)` (denormalized for performance)
- `description` (text, NOT NULL) - Item description
- `quantity` (numeric, NULLABLE, DEFAULT 1) - Item quantity
- `price_per_unit` (numeric, NULLABLE) - Price per unit
- `total_price` (numeric, NOT NULL) - Total price
- `category_id` (integer, NULLABLE) - References `receipt_categories(id)`
- `category_type_id` (integer, NULLABLE) - References `receipt_category_types(id)` (denormalized)
- `receipt_date` (date, NULLABLE) - Denormalized receipt date
- `receipt_time` (time without time zone, NULLABLE) - Denormalized receipt time
- `created_at` (timestamp with time zone, NULLABLE, DEFAULT now())
- `updated_at` (timestamp with time zone, NULLABLE, DEFAULT now())

**Indexes**:
- `receipt_transactions_pkey` (16 kB) - PRIMARY KEY on `id`
- `idx_receipt_transactions_user` (16 kB) - Index on `user_id`
- `idx_receipt_transactions_receipt` (16 kB) - Index on `receipt_id`
- `idx_receipt_transactions_date` (16 kB) - Composite index on `user_id, receipt_date DESC`
- `idx_receipt_transactions_category` (16 kB) - Index on `category_id`

**Constraints**:
- PRIMARY KEY: `id`
- FOREIGN KEY: `receipt_id` → `receipts(id)` ON DELETE CASCADE
- FOREIGN KEY: `user_id` → `users(id)` ON DELETE CASCADE
- FOREIGN KEY: `category_id` → `receipt_categories(id)` ON DELETE SET NULL
- FOREIGN KEY: `category_type_id` → `receipt_category_types(id)` ON DELETE SET NULL

**Size**: Table: 8 kB, Indexes: 88 kB, Total: 96 kB

---

### 11. receipt_item_category_preferences

**Purpose**: Stores user preferences for categorizing receipt items

**Columns**:
- `id` (integer, PRIMARY KEY, AUTO_INCREMENT)
- `user_id` (text, NOT NULL) - References `users(id)`
- `store_key` (text, NOT NULL, DEFAULT '') - Store identifier
- `description_key` (text, NOT NULL) - Item description key
- `category_id` (integer, NOT NULL) - References `receipt_categories(id)`
- `use_count` (integer, NULLABLE, DEFAULT 0) - Usage count
- `created_at` (timestamp with time zone, NULLABLE, DEFAULT now())
- `updated_at` (timestamp with time zone, NULLABLE, DEFAULT now())

**Indexes**:
- `receipt_item_category_preferences_pkey` (8 kB) - PRIMARY KEY on `id`
- `receipt_item_category_prefere_user_id_store_key_description_key` (8 kB) - UNIQUE index on `user_id, store_key, description_key`
- `idx_receipt_item_prefs_user` (8 kB) - Index on `user_id`
- `idx_receipt_item_prefs_lookup` (8 kB) - Composite index on `user_id, store_key, description_key`
- `receipt_item_category_preferences_unique` (8 kB) - UNIQUE index on `user_id, store_key, description_key`

**Constraints**:
- PRIMARY KEY: `id`
- UNIQUE: `user_id, store_key, description_key`
- FOREIGN KEY: `user_id` → `users(id)` ON DELETE CASCADE
- FOREIGN KEY: `category_id` → `receipt_categories(id)` ON DELETE CASCADE

**Size**: Table: 0 bytes, Indexes: 48 kB, Total: 48 kB

---

### 12. transaction_category_preferences

**Purpose**: Stores user preferences for categorizing transactions

**Columns**:
- `id` (integer, PRIMARY KEY, AUTO_INCREMENT)
- `user_id` (text, NOT NULL) - References `users(id)`
- `description_key` (text, NOT NULL) - Transaction description key
- `example_description` (text, NULLABLE) - Example transaction description
- `category_id` (integer, NOT NULL) - References `categories(id)`
- `use_count` (integer, NOT NULL, DEFAULT 0) - Usage count
- `last_used_at` (timestamp with time zone, NULLABLE) - Last usage timestamp
- `created_at` (timestamp with time zone, NOT NULL, DEFAULT now())
- `updated_at` (timestamp with time zone, NOT NULL, DEFAULT now())

**Indexes**:
- `transaction_category_preferences_pkey` (16 kB) - PRIMARY KEY on `id`
- `transaction_category_preferences_unique` (16 kB) - UNIQUE index on `user_id, description_key`

**Constraints**:
- PRIMARY KEY: `id`
- UNIQUE: `user_id, description_key`

**Size**: Table: 8 kB, Indexes: 40 kB, Total: 48 kB

---

### 13. subscriptions

**Purpose**: Manages Stripe subscription information

**Columns**:
- `id` (text, PRIMARY KEY)
- `user_id` (text, NOT NULL, UNIQUE) - References `users(id)`
- `plan` (text, NOT NULL, DEFAULT 'free') - free, pro, max
- `status` (text, NOT NULL, DEFAULT 'active') - active, canceled, past_due, trialing
- `stripe_customer_id` (text, NULLABLE, UNIQUE) - Stripe customer ID
- `stripe_subscription_id` (text, NULLABLE, UNIQUE) - Stripe subscription ID
- `stripe_price_id` (text, NULLABLE) - Stripe price ID
- `current_period_end` (timestamp without time zone, NULLABLE) - Subscription period end
- `cancel_at_period_end` (boolean, NOT NULL, DEFAULT false) - Cancel at period end flag
- `is_lifetime` (boolean, NULLABLE, DEFAULT false) - Lifetime subscription flag
- `pending_plan` (text, NULLABLE) - Plan to switch to at period end
- `created_at` (timestamp without time zone, NOT NULL, DEFAULT CURRENT_TIMESTAMP)
- `updated_at` (timestamp without time zone, NOT NULL)

**Indexes**:
- `subscriptions_pkey` (16 kB) - PRIMARY KEY on `id`
- `subscriptions_user_id_key` (16 kB) - UNIQUE index on `user_id`
- `subscriptions_stripe_customer_id_key` (16 kB) - UNIQUE index on `stripe_customer_id`
- `subscriptions_stripe_subscription_id_key` (16 kB) - UNIQUE index on `stripe_subscription_id`
- `idx_subscriptions_user` (16 kB) - Index on `user_id`
- `idx_subscriptions_stripe_customer` (16 kB) - Partial index on `stripe_customer_id` WHERE NOT NULL
- `idx_subscriptions_stripe_sub` (16 kB) - Partial index on `stripe_subscription_id` WHERE NOT NULL

**Constraints**:
- PRIMARY KEY: `id`
- FOREIGN KEY: `user_id` → `users(id)` ON DELETE CASCADE

**Size**: Table: 8 kB, Indexes: 120 kB, Total: 128 kB

---

### 14. webhook_events

**Purpose**: Tracks Stripe webhook events for idempotency (prevents duplicate processing)

**Columns**:
- `event_id` (text, PRIMARY KEY) - Stripe event ID (e.g., "evt_xxx")
- `event_type` (text, NOT NULL) - Stripe event type
- `status` (text, NULLABLE, DEFAULT 'processing') - processing, completed, failed
- `error_message` (text, NULLABLE) - Error message if processing failed
- `subscription_id` (text, NULLABLE) - Related Stripe subscription ID
- `customer_id` (text, NULLABLE) - Related Stripe customer ID
- `processed_at` (timestamp with time zone, NULLABLE) - When event was processed
- `created_at` (timestamp with time zone, NULLABLE, DEFAULT now()) - When event was received

**Indexes**:
- `webhook_events_pkey` (8 kB) - PRIMARY KEY on `event_id`
- `idx_webhook_events_type` (8 kB) - Index on `event_type`
- `idx_webhook_events_status` (8 kB) - Index on `status`
- `idx_webhook_events_processed` (8 kB) - Index on `processed_at`

**Constraints**:
- PRIMARY KEY: `event_id`

**Size**: Table: 0 bytes, Indexes: 40 kB, Total: 40 kB

**Note**: This table implements Stripe's recommended idempotency pattern to ensure webhook events are only processed once, even if Stripe retries delivery.

---

## Database Functions

### Public Schema Functions

- `update_updated_at_column()` - Trigger function to update `updated_at` timestamp
- `show_db_tree()` - Utility function for displaying database tree structure

### UUID Functions (from uuid-ossp extension)

- `uuid_generate_v1()`
- `uuid_generate_v1mc()`
- `uuid_generate_v3()`
- `uuid_generate_v4()`
- `uuid_generate_v5()`
- `uuid_nil()`
- `uuid_ns_dns()`
- `uuid_ns_oid()`
- `uuid_ns_url()`
- `uuid_ns_x500()`

## Database Triggers

The following tables have triggers that automatically update the `updated_at` column:

- `users`
- `categories`
- `statements`
- `transactions`
- `receipts`
- `receipt_categories`
- `receipt_category_types`
- `receipt_transactions`
- `subscriptions`
- `category_budgets`

All triggers use the `update_updated_at_column()` function.

## Performance Optimizations

### Covering Indexes

1. **transactions**: `idx_transactions_user_date_desc_covering`
   - Includes frequently accessed columns (`amount`, `balance`, `category_id`, `description`, `tx_time`)
   - Optimizes queries that filter by `user_id` and `tx_date` and select these columns

2. **receipt_transactions**: `idx_receipt_transactions_covering` (mentioned in schema but not present in current structure)
   - Would include `category_id`, `category_type_id`, `description`, `quantity`, `total_price`

### Denormalization

1. **receipt_transactions**:
   - `user_id` stored directly (avoids join through `receipts`)
   - `receipt_date` and `receipt_time` stored directly (avoids join through `receipts`)
   - `category_type_id` stored directly (avoids join through `receipt_categories`)

### Composite Indexes

- User + date indexes for time-series queries
- User + category indexes for category filtering
- User + name indexes for category lookups

## Database Statistics

### Total Database Size

- **Logical Size**: ~37 MB
- **Written Data**: ~94.8 MB
- **Data Transfer**: ~139.4 MB

### Table Sizes Summary

| Table | Table Size | Index Size | Total Size |
|-------|------------|------------|------------|
| users | 8 kB | 72 kB | 80 kB |
| transactions | 112 kB | 152 kB | 264 kB |
| categories | 16 kB | 96 kB | 112 kB |
| statements | 8 kB | 56 kB | 64 kB |
| category_budgets | 0 bytes | 32 kB | 32 kB |
| user_files | 16 kB | 5,816 kB | 5,832 kB |
| receipts | 8 kB | 56 kB | 64 kB |
| receipt_category_types | 8 kB | 56 kB | 64 kB |
| receipt_categories | 16 kB | 96 kB | 112 kB |
| receipt_transactions | 8 kB | 88 kB | 96 kB |
| receipt_item_category_preferences | 0 bytes | 48 kB | 48 kB |
| transaction_category_preferences | 8 kB | 40 kB | 48 kB |
| subscriptions | 8 kB | 120 kB | 128 kB |
| webhook_events | 0 bytes | 40 kB | 40 kB |

**Note**: The `user_files` table has a large index size (5.8 MB) due to indexing binary data, which is expected for file storage.

## Connection Information

### Connection String Format

The connection string uses the pooled endpoint format:
```
postgresql://[role]:[password]@[endpoint]-pooler.[region].aws.neon.tech/[database]?channel_binding=require&sslmode=require
```

### Connection Pooling

- **Pooler Enabled**: Currently disabled on the compute endpoint
- **Pooler Mode**: transaction (when enabled)
- **Recommended**: Use pooled connection string for application connections

### Security

- **SSL Mode**: require
- **Channel Binding**: require
- **Passwordless Access**: Enabled

## Monitoring & Performance

### Slow Query Monitoring

**Status**: `pg_stat_statements` extension is not currently installed

To enable slow query monitoring, run:
```sql
CREATE EXTENSION pg_stat_statements;
```

### Compute Usage

- **Total Compute Time**: 63,569 seconds (~17.7 hours)
- **Active Time**: 248,964 seconds (~69.2 hours)
- **Last Active**: December 24, 2025 at 00:06:20 UTC
- **Current Status**: Active (was suspended, now resumed)

## Notes

1. **User IDs**: All user IDs are stored as `TEXT` to match Clerk's authentication format (e.g., "user_2abc123xyz"), not UUIDs.

2. **Connection Pooling**: While the compute endpoint shows pooler as disabled, the connection string uses the `-pooler` suffix, which enables Neon's built-in connection pooling at the proxy level.

3. **Database Suspension**: The compute endpoint automatically suspends when idle on the free tier. It was suspended on December 23, 2025 and resumed on December 24, 2025 at 00:06:09 UTC. The endpoint is currently active.

4. **File Storage**: The `user_files` table stores binary data directly in the database. Consider migrating to object storage (S3, etc.) for production if file sizes grow significantly.

5. **Neon Auth**: The `neon_auth` schema contains a `users_sync` table, indicating Neon Auth may have been provisioned at some point, though it's not currently active in the main database.

## Last Updated

This documentation was generated on: **December 24, 2025**

All information was extracted using Neon MCP tools and reflects the current state of the database.

### Recent Changes

- **December 28, 2025**: Expanded category system:
  - Transaction categories: 22 → 41 (added utilities, transport, health, shopping subcategories)
  - Receipt categories: 31 → 62 (detailed food, beverage, non-food items)
  - Standardized `broad_type` to Food/Drinks/Other only
  - Migration endpoint `/api/migrations/fix-default-categories` to mark defaults
- **December 24, 2025**: Added `webhook_events` table for Stripe webhook idempotency
- **December 24, 2025**: Compute endpoint resumed from suspension
- **December 23, 2025**: Initial documentation created

### Migration Notes

For existing users with old default categories, run:
```bash
curl -X POST http://localhost:3000/api/migrations/fix-default-categories?dryRun=true
```

This marks default categories with `is_default=true` to exclude them from user category limits.

