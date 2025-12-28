-- Debug: Check if any of the expected defaults have is_default = FALSE or NULL

WITH expected_defaults AS (
  SELECT unnest(ARRAY[
    'Fruits', 'Vegetables', 'Herbs & Fresh Aromatics',
    'Meat & Poultry', 'Fish & Seafood', 'Eggs',
    'Dairy (Milk/Yogurt)', 'Cheese', 'Deli / Cold Cuts', 'Fresh Ready-to-Eat',
    'Bread', 'Pastries', 'Wraps & Buns',
    'Pasta, Rice & Grains', 'Legumes', 'Canned & Jarred', 'Sauces', 'Condiments',
    'Spices & Seasonings', 'Oils & Vinegars', 'Baking Ingredients', 'Breakfast & Spreads',
    'Salty Snacks', 'Cookies & Biscuits', 'Chocolate & Candy', 'Nuts & Seeds', 'Ice Cream & Desserts',
    'Water', 'Soft Drinks', 'Juice', 'Coffee & Tea', 'Energy & Sports Drinks',
    'Beer', 'Wine', 'Spirits', 'Low/No Alcohol',
    'Frozen Vegetables & Fruit', 'Frozen Meals',
    'Ready Meals', 'Prepared Salads', 'Sandwiches / Takeaway',
    'OTC Medicine', 'Supplements', 'First Aid',
    'Hygiene & Toiletries', 'Hair Care', 'Skin Care', 'Oral Care', 'Cosmetics',
    'Cleaning Supplies', 'Laundry', 'Paper Goods', 'Kitchen Consumables',
    'Storage (containers, zip bags)', 'Baby (Diapers & Wipes)', 'Baby Food',
    'Pet Food', 'Pet Supplies', 'Bags', 'Other'
  ]) as name
)
SELECT 
  rc.name,
  rc.is_default,
  'Should be TRUE' as note
FROM receipt_categories rc
INNER JOIN expected_defaults e ON rc.name = e.name
WHERE rc.user_id = 'user_372ixFhrDnQ0SAn4bEwyw59iuti'
  AND (rc.is_default IS NULL OR rc.is_default = false)
ORDER BY rc.name;

-- If any results, fix them with this UPDATE:
-- UPDATE receipt_categories
-- SET is_default = true
-- WHERE user_id = 'user_372ixFhrDnQ0SAn4bEwyw59iuti'
--   AND name IN (SELECT name FROM expected_defaults)
--   AND (is_default IS NULL OR is_default = false);
