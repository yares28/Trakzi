-- Migration: Mark default categories with is_default = true
-- Run this in your Neon SQL Editor or via psql

-- ====================
-- TRANSACTION CATEGORIES
-- ====================

-- Mark all default transaction categories
UPDATE categories
SET is_default = true
WHERE user_id = 'user_372ixFhrDnQ0SAn4bEwyw59iuti' -- Replace with your user ID
  AND name IN (
    -- Food & Drink
    'Groceries',
    'Restaurants',
    'Coffee',
    'Bars',
    'Takeaway/Delivery',
    
    -- Housing
    'Rent',
    'Mortgage',
    'Home Maintenance',
    'Home Supplies',
    
    -- Bills & Utilities
    'Electricity',
    'Gas',
    'Water',
    'Internet',
    'Mobile',
    
    -- Transportation
    'Fuel',
    'Public Transport',
    'Taxi/Rideshare',
    'Parking/Tolls',
    'Car Maintenance',
    
    -- Health & Fitness
    'Pharmacy',
    'Medical',
    'Fitness',
    
    -- Shopping
    'Clothing',
    'Electronics',
    'Home Goods',
    'Gifts',
    
    -- Finance & Insurance
    'Bank Fees',
    'Taxes & Fees',
    'Insurance',
    
    -- Income
    'Salary',
    'Bonus',
    'Freelance',
    'Refunds/Reimbursements',
    
    -- Savings & Investments
    'Savings',
    'Investments',
    'Transfers',
    
    -- Entertainment & Lifestyle
    'Entertainment',
    'Education',
    'Subscriptions',
    'Travel',
    'Services',
    
    -- Other
    'Other',
    
    -- Legacy categories (might exist in old installs)
    'Utilities',
    'Refunds',
    'Health & Fitness',
    'Shopping',
    'Transport',
    'Income',
    'Transfers'
  )
  AND (is_default IS NULL OR is_default = false);

-- ====================
-- RECEIPT CATEGORIES
-- ====================

-- Mark all default receipt categories
UPDATE receipt_categories
SET is_default = true
WHERE user_id = 'user_372ixFhrDnQ0SAn4bEwyw59iuti' -- Replace with your user ID
  AND name IN (
    -- Fresh / Whole Foods
    'Fruits',
    'Vegetables',
    'Herbs & Fresh Aromatics',
    'Meat & Poultry',
    'Fish & Seafood',
    'Eggs',
    'Dairy (Milk/Yogurt)',
    'Cheese',
    'Deli / Cold Cuts',
    'Fresh Ready-to-Eat',
    
    -- Bakery
    'Bread',
    'Pastries',
    'Wraps & Buns',
    
    -- Pantry Staples
    'Pasta, Rice & Grains',
    'Legumes',
    'Canned & Jarred',
    'Sauces',
    'Condiments',
    'Spices & Seasonings',
    'Oils & Vinegars',
    'Baking Ingredients',
    'Breakfast & Spreads',
    
    -- Snacks & Sweets
    'Salty Snacks',
    'Cookies & Biscuits',
    'Chocolate & Candy',
    'Nuts & Seeds',
    'Ice Cream & Desserts',
    
    -- Beverages
    'Water',
    'Soft Drinks',
    'Juice',
    'Coffee & Tea',
    'Energy & Sports Drinks',
    
    -- Alcohol
    'Beer',
    'Wine',
    'Spirits',
    'Low/No Alcohol',
    
    -- Frozen
    'Frozen Vegetables & Fruit',
    'Frozen Meals',
    
    -- Prepared Foods
    'Ready Meals',
    'Prepared Salads',
    'Sandwiches / Takeaway',
    
    -- Non-Food
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
    'Pet Supplies',
    'Bags',
    'Other',
    
    -- Legacy categories that might exist
    'Meat',
    'Plant-Based Protein',
    'Bread & Bakery',
    'Snacks',
    'Baking',
    'Soda & Cola',
    'Energy Drinks',
    'Beverages',
    'Drinks',
    'Dairy',
    'Condiments & Spices',
    'Oils & Fats',
    'Sauce',
    'Canned Goods',
    'Frozen Foods',
    'Prepared Foods',
    'Alcohol',
    'Health Care',
    'Personal Care',
    'Household & Cleaning Supplies',
    'Baby Items',
    'Pet Care',
    'Deli',
    'Pasta, Rice & Potato'
  )
  AND (is_default IS NULL OR is_default = false);

-- ====================
-- VERIFICATION QUERIES
-- ====================

-- Check transaction categories
SELECT 
  is_default,
  COUNT(*) as count,
  STRING_AGG(name, ', ' ORDER BY name) as categories
FROM categories
WHERE user_id = 'user_372ixFhrDnQ0SAn4bEwyw59iuti' -- Replace with your user ID
GROUP BY is_default
ORDER BY is_default DESC;

-- Check receipt categories
SELECT 
  is_default,
  COUNT(*) as count
FROM receipt_categories
WHERE user_id = 'user_372ixFhrDnQ0SAn4bEwyw59iuti' -- Replace with your user ID
GROUP BY is_default
ORDER BY is_default DESC;

-- Show categories that are NOT marked as default (these are your custom ones)
SELECT name, created_at
FROM receipt_categories
WHERE user_id = 'user_372ixFhrDnQ0SAn4bEwyw59iuti' -- Replace with your user ID
  AND (is_default IS NULL OR is_default = false)
ORDER BY created_at DESC;
