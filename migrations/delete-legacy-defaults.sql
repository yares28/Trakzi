-- Migration: Delete legacy default categories (safer approach)
-- First check if they're being used, then delete unused ones

-- =====================================================
-- STEP 1: Check which legacy categories are being used
-- =====================================================

-- Check transaction categories usage
SELECT 
  c.name,
  COUNT(t.id) as transaction_count
FROM categories c
LEFT JOIN transactions t ON t.category_id = c.id
WHERE c.user_id = 'user_372ixFhrDnQ0SAn4bEwyw59iuti'
  AND c.name IN ('Refunds', 'Utilities', 'Transport', 'Health & Fitness')
GROUP BY c.id, c.name
ORDER BY transaction_count DESC;

-- Check receipt categories usage
SELECT 
  rc.name,
  COUNT(rt.id) as transaction_count
FROM receipt_categories rc
LEFT JOIN receipt_transactions rt ON rt.category_id = rc.id
WHERE rc.user_id = 'user_372ixFhrDnQ0SAn4bEwyw59iuti'
  AND rc.name IN (
    'Meat', 'Sauce', 'Pasta, Rice & Potato', 'Snacks', 'Bread & Bakery',
    'Deli', 'Condiments & Spices', 'Baking', 'Dairy', 'Oils & Fats', 'Plant-Based Protein'
  )
GROUP BY rc.id, rc.name
ORDER BY transaction_count DESC;

-- =====================================================
-- STEP 2: Delete UNUSED legacy categories
-- (Only run after verifying usage above shows 0)
-- =====================================================

-- Delete unused transaction categories
DELETE FROM categories
WHERE user_id = 'user_372ixFhrDnQ0SAn4bEwyw59iuti'
  AND name IN ('Refunds', 'Utilities', 'Transport', 'Health & Fitness')
  AND id NOT IN (
    SELECT DISTINCT category_id 
    FROM transactions 
    WHERE category_id IS NOT NULL
  );

-- Delete unused receipt categories
DELETE FROM receipt_categories
WHERE user_id = 'user_372ixFhrDnQ0SAn4bEwyw59iuti'
  AND name IN (
    'Meat', 'Sauce', 'Pasta, Rice & Potato', 'Snacks', 'Bread & Bakery',
    'Deli', 'Condiments & Spices', 'Baking', 'Dairy', 'Oils & Fats', 'Plant-Based Protein'
  )
  AND id NOT IN (
    SELECT DISTINCT category_id 
    FROM receipt_transactions 
    WHERE category_id IS NOT NULL
  );

-- =====================================================
-- STEP 3: Verify deletion
-- =====================================================

-- Should only show 1 user-created transaction category (Deliveries)
SELECT name, created_at, is_default
FROM categories
WHERE user_id = 'user_372ixFhrDnQ0SAn4bEwyw59iuti'
  AND (is_default IS NULL OR is_default = false);

-- Should only show 1 user-created receipt category (brr)
SELECT name, created_at, is_default
FROM receipt_categories
WHERE user_id = 'user_372ixFhrDnQ0SAn4bEwyw59iuti'
  AND (is_default IS NULL OR is_default = false);

-- Final counts
SELECT 
  'Transaction' as type,
  SUM(CASE WHEN is_default = true THEN 1 ELSE 0 END) as defaults,
  SUM(CASE WHEN is_default != true OR is_default IS NULL THEN 1 ELSE 0 END) as user_created
FROM categories
WHERE user_id = 'user_372ixFhrDnQ0SAn4bEwyw59iuti'
UNION ALL
SELECT 
  'Receipt' as type,
  SUM(CASE WHEN is_default = true THEN 1 ELSE 0 END) as defaults,
  SUM(CASE WHEN is_default != true OR is_default IS NULL THEN 1 ELSE 0 END) as user_created
FROM receipt_categories
WHERE user_id = 'user_372ixFhrDnQ0SAn4bEwyw59iuti';
