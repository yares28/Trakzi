-- Simple direct count of receipt categories
SELECT 
  COUNT(*) as total_categories,
  COUNT(CASE WHEN is_default = true THEN 1 END) as defaults,
  COUNT(CASE WHEN is_default = false THEN 1 END) as user_created,
  COUNT(CASE WHEN is_default IS NULL THEN 1 END) as null_flag
FROM receipt_categories
WHERE user_id = 'user_372ixFhrDnQ0SAn4bEwyw59iuti';

-- List ALL receipt categories
SELECT 
  id,
  name,
  is_default,
  created_at
FROM receipt_categories
WHERE user_id = 'user_372ixFhrDnQ0SAn4bEwyw59iuti'
ORDER BY is_default DESC NULLS LAST, name ASC;
