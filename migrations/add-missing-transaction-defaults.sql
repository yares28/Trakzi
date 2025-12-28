-- Migration: Add missing transaction default categories
-- These are new defaults from v2.0 that were never seeded

-- Get the user's current categories to avoid duplicates
-- Then insert the missing ones

INSERT INTO categories (user_id, name, color, is_default)
SELECT 
  'user_372ixFhrDnQ0SAn4bEwyw59iuti',
  cat.name,
  cat.color,
  true
FROM (VALUES
  -- Food & Drink
  ('Coffee', '#8b4513'),
  ('Takeaway/Delivery', '#ff6347'),
  
  -- Housing
  ('Home Maintenance', '#4682b4'),
  ('Home Supplies', '#5f9ea0'),
  
  -- Bills & Utilities
  ('Electricity', '#ffd700'),
  ('Gas', '#ff8c00'),
  ('Water', '#1e90ff'),
  ('Internet', '#9370db'),
  ('Mobile', '#ff69b4'),
  
  -- Transportation
  ('Public Transport', '#32cd32'),
  ('Taxi/Rideshare', '#ffff00'),
  ('Parking/Tolls', '#daa520'),
  ('Car Maintenance', '#696969'),
  
  -- Health & Fitness
  ('Pharmacy', '#00ced1'),
  ('Medical', '#dc143c'),
  ('Fitness', '#ff1493'),
  
  -- Shopping
  ('Clothing', '#ff00ff'),
  ('Electronics', '#00bfff'),
  ('Home Goods', '#adff2f'),
  ('Gifts', '#ff69b4'),
  
  -- Finance & Insurance
  ('Bank Fees', '#8b0000'),
  
  -- Income
  ('Salary', '#228b22'),
  ('Bonus', '#ffa500'),
  ('Freelance', '#9370db'),
  ('Refunds/Reimbursements', '#20b2aa'),
  
  -- Savings & Investments
  ('Investments', '#2e8b57')
) AS cat(name, color)
WHERE NOT EXISTS (
  SELECT 1 FROM categories c
  WHERE c.user_id = 'user_372ixFhrDnQ0SAn4bEwyw59iuti'
    AND c.name = cat.name
);

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

-- Should show 41 defaults, 1 user_created (Deliveries)
SELECT COUNT(*) as total_categories
FROM categories
WHERE user_id = 'user_372ixFhrDnQ0SAn4bEwyw59iuti';

-- Show user-created only
SELECT name, created_at
FROM categories
WHERE user_id = 'user_372ixFhrDnQ0SAn4bEwyw59iuti'
  AND (is_default IS NULL OR is_default = false);
