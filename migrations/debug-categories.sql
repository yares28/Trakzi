-- DEBUG: Find ALL receipt categories (including NULL is_default)
SELECT 
  id,
  name,
  is_default,
  created_at
FROM receipt_categories
WHERE user_id = 'user_372ixFhrDnQ0SAn4bEwyw59iuti'
ORDER BY 
  CASE 
    WHEN is_default = true THEN 1
    WHEN is_default = false THEN 2
    ELSE 3
  END,
  created_at ASC;

-- Count by is_default including NULL
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

-- Check what the count API actually sees
SELECT COUNT(DISTINCT id) as count
FROM receipt_categories
WHERE user_id = 'user_372ixFhrDnQ0SAn4bEwyw59iuti'
  AND (is_default IS NULL OR is_default = false);
