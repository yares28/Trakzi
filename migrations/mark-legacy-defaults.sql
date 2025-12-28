-- Migration: Mark LEGACY default categories as defaults
-- These were created before the v2.0 expansion and have different names

UPDATE categories
SET is_default = true
WHERE user_id = 'user_372ixFhrDnQ0SAn4bEwyw59iuti'
  AND name IN (
    -- Legacy transaction categories (no longer in new defaults but were defaults before)
    'Refunds',          -- Now "Refunds/Reimbursements"
    'Utilities',        -- Now split into Electricity, Gas, Water, Internet, Mobile
    'Transport',        -- Now "Public Transport"
    'Health & Fitness'  -- Now separate: Pharmacy, Medical, Fitness
  )
  AND (is_default IS NULL OR is_default = false);

UPDATE receipt_categories
SET is_default = true
WHERE user_id = 'user_372ixFhrDnQ0SAn4bEwyw59iuti'
  AND name IN (
    -- Legacy receipt categories (renamed or removed in v2.0)
    'Meat',                         -- Now "Meat & Poultry"
    'Sauce',                        -- Now "Sauces"
    'Pasta, Rice & Potato',         -- Now "Pasta, Rice & Grains"
    'Snacks',                       -- Now split into Salty Snacks, Cookies, etc.
    'Bread & Bakery',               -- Now "Bread"
    'Deli',                         -- Now "Deli / Cold Cuts"
    'Condiments & Spices',          -- Now "Condiments"
    'Baking',                       -- Now "Baking Ingredients"
    'Dairy',                        -- Now "Dairy (Milk/Yogurt)"
    'Oils & Fats',                  -- Now "Oils & Vinegars"
    'Plant-Based Protein'           -- Removed from new defaults
  )
  AND (is_default IS NULL OR is_default = false);

-- Verify transaction categories
SELECT 
  CASE 
    WHEN is_default = true THEN 'default'
    WHEN is_default = false THEN 'user_created'
    ELSE 'NULL'
  END as category_type,
  COUNT(*) as count
FROM categories
WHERE user_id = 'user_372ixFhrDnQ0SAn4bEwyw59iuti'
GROUP BY is_default
ORDER BY is_default DESC NULLS LAST;

-- Verify receipt categories
SELECT 
  CASE 
    WHEN is_default = true THEN 'default'
    WHEN is_default = false THEN 'user_created'
    ELSE 'NULL'
  END as category_type,
  COUNT(*) as count
FROM receipt_categories
WHERE user_id = 'user_372ixFhrDnQ0SAn4bEwyw59iuti'
GROUP BY is_default
ORDER BY is_default DESC NULLS LAST;

-- Show remaining user-created categories
SELECT 'TRANSACTION' as type, name, created_at
FROM categories
WHERE user_id = 'user_372ixFhrDnQ0SAn4bEwyw59iuti'
  AND (is_default IS NULL OR is_default = false)
UNION ALL
SELECT 'RECEIPT' as type, name, created_at
FROM receipt_categories
WHERE user_id = 'user_372ixFhrDnQ0SAn4bEwyw59iuti'
  AND (is_default IS NULL OR is_default = false)
ORDER BY created_at;
