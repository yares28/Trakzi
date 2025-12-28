-- Find which of the 62 expected defaults are MISSING from the database

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
  'MISSING: ' || e.name as alert
FROM expected_defaults e
WHERE NOT EXISTS (
  SELECT 1 
  FROM receipt_categories rc
  WHERE rc.user_id = 'user_372ixFhrDnQ0SAn4bEwyw59iuti'
    AND rc.name = e.name
)
ORDER BY e.name;
