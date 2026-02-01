-- fix-default-categories.sql
-- Backfill is_default = true for existing rows whose name matches the app's
-- canonical default lists. Run once manually (e.g. in Neon SQL Editor).
-- Default categories (is_default = true) do not count toward user category limits.
--
-- Source: lib/categories.ts (DEFAULT_CATEGORIES), lib/receipt-categories.ts (DEFAULT_RECEIPT_CATEGORIES)

-- 1. Transaction categories (spending categories)
UPDATE categories
SET is_default = true
WHERE (is_default IS NULL OR is_default = false)
  AND name IN (
    'Groceries', 'Restaurants', 'Coffee', 'Bars', 'Takeaway/Delivery',
    'Rent', 'Mortgage', 'Home Maintenance', 'Home Supplies',
    'Electricity', 'Gas', 'Water', 'Internet', 'Mobile', 'Utilities',
    'Transport', 'Fuel', 'Public Transport', 'Taxi/Rideshare', 'Parking/Tolls', 'Car Maintenance',
    'Health & Fitness', 'Pharmacy', 'Medical/Healthcare', 'Fitness',
    'Shopping', 'Clothing', 'Electronics', 'Home Goods', 'Gifts',
    'Bank Fees', 'Taxes & Fees', 'Insurance', 'Donation',
    'Income', 'Salary', 'Bonus', 'Freelance', 'Refunds', 'Cashback', 'Top-ups',
    'Savings', 'Investments', 'Transfers', 'Loan', 'Credit', 'Wealth',
    'Entertainment', 'Education', 'Subscriptions', 'Travel', 'Services',
    'Cash', 'Other'
  );

-- 2. Receipt categories (fridge / grocery categories)
UPDATE receipt_categories
SET is_default = true
WHERE (is_default IS NULL OR is_default = false)
  AND name IN (
    'Fruits', 'Vegetables', 'Herbs & Fresh Aromatics', 'Meat & Poultry', 'Fish & Seafood',
    'Eggs', 'Dairy (Milk/Yogurt)', 'Cheese', 'Deli / Cold Cuts', 'Fresh Ready-to-Eat',
    'Bread', 'Pastries', 'Wraps & Buns',
    'Pasta, Rice & Grains', 'Legumes', 'Canned & Jarred', 'Sauces', 'Condiments',
    'Spices & Seasonings', 'Oils & Vinegars', 'Baking Ingredients', 'Breakfast & Spreads',
    'Salty Snacks', 'Cookies & Biscuits', 'Chocolate & Candy', 'Nuts & Seeds', 'Ice Cream & Desserts',
    'Water', 'Soft Drinks', 'Juice', 'Coffee & Tea', 'Energy & Sports Drinks',
    'Beer', 'Wine', 'Spirits', 'Low/No Alcohol',
    'Frozen Vegetables & Fruit', 'Frozen Meals',
    'Ready Meals', 'Prepared Salads', 'Sandwiches / Takeaway',
    'OTC Medicine', 'Supplements', 'First Aid', 'Hygiene & Toiletries', 'Hair Care',
    'Skin Care', 'Oral Care', 'Cosmetics', 'Cleaning Supplies', 'Laundry',
    'Paper Goods', 'Kitchen Consumables', 'Storage (containers, zip bags)',
    'Baby (Diapers & Wipes)', 'Baby Food', 'Pet Food', 'Pet Supplies', 'Bags', 'Other'
  );
