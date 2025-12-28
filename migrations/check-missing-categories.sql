-- Check which categories are MISSING from the expected defaults

-- Expected transaction categories (41 total)
WITH expected_tx AS (
  SELECT unnest(ARRAY[
    'Groceries', 'Restaurants', 'Coffee', 'Bars', 'Takeaway/Delivery',
    'Rent', 'Mortgage', 'Home Maintenance', 'Home Supplies',
    'Electricity', 'Gas', 'Water', 'Internet', 'Mobile',
    'Fuel', 'Public Transport', 'Taxi/Rideshare', 'Parking/Tolls', 'Car Maintenance',
    'Pharmacy', 'Medical', 'Fitness',
    'Clothing', 'Electronics', 'Home Goods', 'Gifts',
    'Bank Fees', 'Taxes & Fees', 'Insurance',
    'Salary', 'Bonus', 'Freelance', 'Refunds/Reimbursements',
    'Savings', 'Investments', 'Transfers',
    'Entertainment', 'Education', 'Subscriptions', 'Travel', 'Services',
    'Other'
  ]) as name
)
SELECT 'MISSING TRANSACTION: ' || e.name as alert
FROM expected_tx e
WHERE NOT EXISTS (
  SELECT 1 FROM categories c
  WHERE c.user_id = 'user_372ixFhrDnQ0SAn4bEwyw59iuti'
    AND c.name = e.name
);

-- Expected receipt categories (62 total from new defaults)
WITH expected_rc AS (
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
SELECT 'MISSING RECEIPT: ' || e.name as alert
FROM expected_rc e
WHERE NOT EXISTS (
  SELECT 1 FROM receipt_categories rc
  WHERE rc.user_id = 'user_372ixFhrDnQ0SAn4bEwyw59iuti'
    AND rc.name = e.name
);

-- Show what we DO have
SELECT 'Current transaction categories:' as info, COUNT(*) as count
FROM categories
WHERE user_id = 'user_372ixFhrDnQ0SAn4bEwyw59iuti'
UNION ALL
SELECT 'Current receipt categories:', COUNT(*)
FROM receipt_categories
WHERE user_id = 'user_372ixFhrDnQ0SAn4bEwyw59iuti';
