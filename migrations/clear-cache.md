-- OPTIONAL: Clear the Upstash cache for data-library-bundle
-- This forces the bundle API to fetch fresh data
-- 
-- You can either:
-- 1. Wait 5 minutes for cache to expire naturally
-- 2. Run this in your Upstash Redis CLI or via API
-- 3. Hard refresh the page (Ctrl+Shift+R)

-- Redis command (if using Upstash Redis CLI):
-- DEL user:user_372ixFhrDnQ0SAn4bEwyw59iuti:data-library:null:bundle

-- Or just hard refresh your browser (Ctrl+Shift+R) and wait 5 minutes
