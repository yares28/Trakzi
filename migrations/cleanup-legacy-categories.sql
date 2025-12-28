-- Clean up legacy default categories
-- Safe to run if user has no transactions (all categories unused)

-- =====================================================
-- STEP 1: IDENTIFY LEGACY CATEGORIES
-- =====================================================

-- Show transaction categories NOT in new defaults
WITH new_defaults AS (
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
SELECT 'LEGACY TRANSACTION TO DELETE: ' || c.name as alert, c.id
FROM categories c
WHERE c.user_id = 'user_372ixFhrDnQ0SAn4bEwyw59iuti'
  AND c.is_default = true
  AND c.name NOT IN (SELECT name FROM new_defaults);

-- Show receipt categories NOT in new defaults
WITH new_receipt_defaults AS (
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
SELECT 'LEGACY RECEIPT TO DELETE: ' || rc.name as alert, rc.id
FROM receipt_categories rc
WHERE rc.user_id = 'user_372ixFhrDnQ0SAn4bEwyw59iuti'
  AND rc.is_default = true
  AND rc.name NOT IN (SELECT name FROM new_receipt_defaults);

-- =====================================================
-- STEP 2: DELETE LEGACY CATEGORIES
-- (Only run after reviewing Step 1 output)
-- =====================================================

-- Delete legacy transaction categories
WITH new_defaults AS (
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
DELETE FROM categories
WHERE user_id = 'user_372ixFhrDnQ0SAn4bEwyw59iuti'
  AND is_default = true
  AND name NOT IN (SELECT name FROM new_defaults);

-- Delete legacy receipt categories
WITH new_receipt_defaults AS (
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
DELETE FROM receipt_categories
WHERE user_id = 'user_372ixFhrDnQ0SAn4bEwyw59iuti'
  AND is_default = true
  AND name NOT IN (SELECT name FROM new_receipt_defaults);

-- =====================================================
-- STEP 3: VERIFY FINAL COUNTS
-- =====================================================

-- Should show exactly 42 transaction defaults, 1 user (Deliveries)
SELECT 
  'Transaction' as type,
  SUM(CASE WHEN is_default = true THEN 1 ELSE 0 END) as defaults,
  SUM(CASE WHEN is_default != true OR is_default IS NULL THEN 1 ELSE 0 END) as user_created,
  COUNT(*) as total
FROM categories
WHERE user_id = 'user_372ixFhrDnQ0SAn4bEwyw59iuti';

-- Should show exactly 62 receipt defaults, 1 user (brr)
SELECT 
  'Receipt' as type,
  SUM(CASE WHEN is_default = true THEN 1 ELSE 0 END) as defaults,
  SUM(CASE WHEN is_default != true OR is_default IS NULL THEN 1 ELSE 0 END) as user_created,
  COUNT(*) as total
FROM receipt_categories
WHERE user_id = 'user_372ixFhrDnQ0SAn4bEwyw59iuti';

-- Expected results:
-- Transaction: 42 defaults, 1 user, 43 total
-- Receipt: 62 defaults, 1 user, 63 total
