-- FIX: Mark all newly seeded categories as defaults
-- These were created when you logged in after the code update

UPDATE receipt_categories
SET is_default = true
WHERE user_id = 'user_372ixFhrDnQ0SAn4bEwyw59iuti'
  AND id >= 105  -- All new categories created today
  AND id <= 154
  AND name IN (
    -- These are ALL in the DEFAULT_RECEIPT_CATEGORIES list
    'Herbs & Fresh Aromatics',
    'Meat & Poultry',
    'Dairy (Milk/Yogurt)',
    'Deli / Cold Cuts',
    'Fresh Ready-to-Eat',
    'Bread',
    'Pastries',
    'Wraps & Buns',
    'Pasta, Rice & Grains',
    'Legumes',
    'Canned & Jarred',
    'Sauces',
    'Condiments',
    'Spices & Seasonings',
    'Oils & Vinegars',
    'Baking Ingredients',
    'Breakfast & Spreads',
    'Salty Snacks',
    'Cookies & Biscuits',
    'Chocolate & Candy',
    'Nuts & Seeds',
    'Ice Cream & Desserts',
    'Soft Drinks',
    'Energy & Sports Drinks',
    'Beer',
    'Wine',
    'Spirits',
    'Low/No Alcohol',
    'Frozen Vegetables & Fruit',
    'Frozen Meals',
    'Ready Meals',
    'Prepared Salads',
    'Sandwiches / Takeaway',
    'OTC Medicine',
    'Supplements',
    'First Aid',
    'Hygiene & Toiletries',
    'Hair Care',
    'Skin Care',
    'Oral Care',
    'Cosmetics',
    'Cleaning Supplies',
    'Laundry',
    'Paper Goods',
    'Kitchen Consumables',
    'Storage (containers, zip bags)',
    'Baby (Diapers & Wipes)',
    'Baby Food',
    'Pet Food',
    'Pet Supplies'
  );

-- Verify the fix
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

-- Should show only 1 user_created (brr)
SELECT name, created_at
FROM receipt_categories
WHERE user_id = 'user_372ixFhrDnQ0SAn4bEwyw59iuti'
  AND (is_default IS NULL OR is_default = false)
ORDER BY created_at;
