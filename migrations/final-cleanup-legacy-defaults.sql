-- FINAL CLEANUP: Mark remaining legacy categories as defaults

-- Mark transaction categories that should be defaults
UPDATE categories
SET is_default = true
WHERE user_id = 'user_372ixFhrDnQ0SAn4bEwyw59iuti'
  AND name IN (
    'Shopping',  -- In new defaults
    'Income'     -- In new defaults (also have Salary, Bonus, Freelance)
  )
  AND (is_default IS NULL OR is_default = false);

-- Mark receipt categories that are legacy defaults
UPDATE receipt_categories
SET is_default = true
WHERE user_id = 'user_372ixFhrDnQ0SAn4bEwyw59iuti'
  AND name IN (
    'Meat',                  -- Legacy, now "Meat & Poultry"
    'Sauce',                 -- Legacy, now "Sauces"
    'Pasta, Rice & Potato',  -- Legacy, now "Pasta, Rice & Grains"
    'Snacks',                -- Legacy, now split into Salty Snacks, Cookies, etc.
    'Bread & Bakery',        -- Legacy, now "Bread"
    'Deli',                  -- Legacy, now "Deli / Cold Cuts"
    'Condiments & Spices'    -- Legacy, now "Condiments"
  )
  AND (is_default IS NULL OR is_default = false);

-- VERIFICATION: Should show ONLY user-created categories
SELECT 'TRANSACTION USER-CREATED:' as type, name, created_at
FROM categories
WHERE user_id = 'user_372ixFhrDnQ0SAn4bEwyw59iuti'
  AND (is_default IS NULL OR is_default = false)
UNION ALL
SELECT 'RECEIPT USER-CREATED:', name, created_at
FROM receipt_categories
WHERE user_id = 'user_372ixFhrDnQ0SAn4bEwyw59iuti'
  AND (is_default IS NULL OR is_default = false)
ORDER BY created_at;

-- Expected result: Only "Deliveries" and "brr"

-- Final counts
SELECT 
  'Transaction' as type,
  SUM(CASE WHEN is_default = true THEN 1 ELSE 0 END) as defaults,
  SUM(CASE WHEN is_default != true OR is_default IS NULL THEN 1 ELSE 0 END) as user_created,
  COUNT(*) as total
FROM categories
WHERE user_id = 'user_372ixFhrDnQ0SAn4bEwyw59iuti'
UNION ALL
SELECT 
  'Receipt' as type,
  SUM(CASE WHEN is_default = true THEN 1 ELSE 0 END) as defaults,
  SUM(CASE WHEN is_default != true OR is_default IS NULL THEN 1 ELSE 0 END) as user_created,
  COUNT(*) as total
FROM receipt_categories
WHERE user_id = 'user_372ixFhrDnQ0SAn4bEwyw59iuti';

-- Expected: Transaction (46 defaults, 1 user), Receipt (87 defaults, 1 user)
