-- Clear all CUSTOM categories for all users
-- "Custom" = category name is NOT in the official default list (lib/categories.ts).
-- Default categories are kept; only user-created category names are removed.
-- Run in a transaction so you can ROLLBACK if needed.

BEGIN;

-- 1. Unlink transactions from custom categories (by name)
UPDATE transactions t
SET category_id = NULL
FROM categories c
WHERE t.category_id = c.id
  AND c.name NOT IN (
    'Groceries', 'Restaurants', 'Coffee', 'Bars', 'Takeaway/Delivery',
    'Rent', 'Mortgage', 'Home Maintenance', 'Home Supplies',
    'Electricity', 'Gas', 'Water', 'Internet', 'Mobile', 'Utilities',
    'Fuel', 'Public Transport', 'Taxi/Rideshare', 'Parking/Tolls', 'Car Maintenance',
    'Transport',
    'Pharmacy', 'Medical/Healthcare', 'Fitness', 'Health & Fitness',
    'Shopping', 'Clothing', 'Electronics', 'Home Goods', 'Gifts',
    'Bank Fees', 'Taxes & Fees', 'Insurance', 'Donation',
    'Income', 'Salary', 'Bonus', 'Freelance', 'Refunds', 'Cashback', 'Top-ups',
    'Savings', 'Investments', 'Transfers', 'Loan', 'Credit', 'Wealth',
    'Entertainment', 'Education', 'Subscriptions', 'Travel', 'Services',
    'Cash', 'Other'
  );

-- 2. Delete budget rows for custom categories
DELETE FROM category_budgets
WHERE category_id IN (
  SELECT id FROM categories
  WHERE name NOT IN (
    'Groceries', 'Restaurants', 'Coffee', 'Bars', 'Takeaway/Delivery',
    'Rent', 'Mortgage', 'Home Maintenance', 'Home Supplies',
    'Electricity', 'Gas', 'Water', 'Internet', 'Mobile', 'Utilities',
    'Fuel', 'Public Transport', 'Taxi/Rideshare', 'Parking/Tolls', 'Car Maintenance',
    'Transport',
    'Pharmacy', 'Medical/Healthcare', 'Fitness', 'Health & Fitness',
    'Shopping', 'Clothing', 'Electronics', 'Home Goods', 'Gifts',
    'Bank Fees', 'Taxes & Fees', 'Insurance', 'Donation',
    'Income', 'Salary', 'Bonus', 'Freelance', 'Refunds', 'Cashback', 'Top-ups',
    'Savings', 'Investments', 'Transfers', 'Loan', 'Credit', 'Wealth',
    'Entertainment', 'Education', 'Subscriptions', 'Travel', 'Services',
    'Cash', 'Other'
  )
);

-- 3. Delete transaction category preferences that reference custom categories
DELETE FROM transaction_category_preferences
WHERE category_id IN (
  SELECT id FROM categories
  WHERE name NOT IN (
    'Groceries', 'Restaurants', 'Coffee', 'Bars', 'Takeaway/Delivery',
    'Rent', 'Mortgage', 'Home Maintenance', 'Home Supplies',
    'Electricity', 'Gas', 'Water', 'Internet', 'Mobile', 'Utilities',
    'Fuel', 'Public Transport', 'Taxi/Rideshare', 'Parking/Tolls', 'Car Maintenance',
    'Transport',
    'Pharmacy', 'Medical/Healthcare', 'Fitness', 'Health & Fitness',
    'Shopping', 'Clothing', 'Electronics', 'Home Goods', 'Gifts',
    'Bank Fees', 'Taxes & Fees', 'Insurance', 'Donation',
    'Income', 'Salary', 'Bonus', 'Freelance', 'Refunds', 'Cashback', 'Top-ups',
    'Savings', 'Investments', 'Transfers', 'Loan', 'Credit', 'Wealth',
    'Entertainment', 'Education', 'Subscriptions', 'Travel', 'Services',
    'Cash', 'Other'
  )
);

-- 4. Delete custom categories (by name: not in default list)
DELETE FROM categories
WHERE name NOT IN (
  'Groceries', 'Restaurants', 'Coffee', 'Bars', 'Takeaway/Delivery',
  'Rent', 'Mortgage', 'Home Maintenance', 'Home Supplies',
  'Electricity', 'Gas', 'Water', 'Internet', 'Mobile', 'Utilities',
  'Fuel', 'Public Transport', 'Taxi/Rideshare', 'Parking/Tolls', 'Car Maintenance',
  'Transport',
  'Pharmacy', 'Medical/Healthcare', 'Fitness', 'Health & Fitness',
  'Shopping', 'Clothing', 'Electronics', 'Home Goods', 'Gifts',
  'Bank Fees', 'Taxes & Fees', 'Insurance', 'Donation',
  'Income', 'Salary', 'Bonus', 'Freelance', 'Refunds', 'Cashback', 'Top-ups',
  'Savings', 'Investments', 'Transfers', 'Loan', 'Credit', 'Wealth',
  'Entertainment', 'Education', 'Subscriptions', 'Travel', 'Services',
  'Cash', 'Other'
);

COMMIT;
