# Phase 4: Testing Guide - Hybrid Import Pipeline v2

**Date**: 2025-12-31  
**Status**: Ready for Testing  
**Build**: ✅ Successful

---

## Prerequisites

### 1. Database Setup
```bash
# Apply the migration
npx prisma migrate dev

# Or apply to production/staging
npx prisma migrate deploy
```

### 2. Environment Variables
Required in `.env` or `.env.local`:
```env
# OpenRouter API (for AI simplification fallback)
OPENROUTER_API_KEY=your_key_here
OPENROUTER_SIMPLIFY_MODEL=anthropic/claude-3-5-haiku:beta    # Optional
OPENROUTER_CATEGORY_MODEL=anthropic/claude-3-5-haiku:beta    # Optional
```

**Note**: The pipeline works WITHOUT API keys - 80%+ transactions use rules (free!). AI is only for unknown merchants.

---

## Test Plan

### Test 1: Known Merchants (Rules Only - Free!)

**Upload CSV with**:
```csv
date,description,amount
2024-12-31,COMPRA MERCADONA VALENCIA CARD*1234,25.50
2024-12-31,SPOTIFY PREMIUM MONTHLY,9.99
2024-12-31,NETFLIX STANDARD PLAN,13.99
2024-12-31,RECIBO VODAFONE MOVIL,35.00
```

**Expected Results**:
- ✅ `simplified_description`: "Mercadona", "Spotify", "Netflix", "Vodafone"
- ✅ Categories: "Groceries", "Entertainment", "Entertainment", "Utilities"
- ✅ Console: "Rule coverage: 4/4 (100%)"
- ✅ NO AI calls (cost: $0)

**How to Verify**:
1. Upload CSV via UI
2. Check browser console for pipeline logs
3. After import, check database:
```sql
SELECT 
  description,
  simplified_description,
  raw_csv_row::jsonb->'simplify'->>'source' as source,
  raw_csv_row::jsonb->'simplify'->>'confidence' as confidence
FROM transactions
ORDER BY created_at DESC
LIMIT 5;
```

---

### Test 2: Transfers with Names

**Upload CSV with**:
```csv
date,description,amount
2024-12-31,BIZUM A SR JUAN PEREZ GARCIA,-50.00
2024-12-31,TRANSFERENCIA A MARIA LOPEZ,100.00
2024-12-31,INGRESO DE PEDRO SANCHEZ,200.00
```

**Expected Results**:
- ✅ `simplified_description`: "Bizum Juan", "Transfer Maria", "Transfer Pedro"
- ✅ First names extracted (privacy!)
- ✅ Categories: "Transfers"
- ✅ Source: "rules"

---

### Test 3: Unknown Merchants (AI Fallback)

**Upload CSV with** (if you have API key):
```csv
date,description,amount
2024-12-31,COMPRA TIENDA DESCONOCIDA 123,45.00
2024-12-31,PAGO COMERCIO XYZ SL,30.00
```

**Expected Results**:
- ✅ AI tries to simplify
- ✅ If fails: uses sanitized description (truncated)
- ✅ Console: "AI Simplify (2 items)"
- ✅ Cost: ~$0.0006 (very cheap!)

**Without API Key**:
- ✅ Falls back to sanitized description
- ✅ Still categorized
- ✅ Cost: $0

---

### Test 4: Bank Operations

**Upload CSV with**:
```csv
date,description,amount
2024-12-31,COMISION MANTENIMIENTO CUENTA,-6.00
2024-12-31,CARGO TARJETA CREDITO,-500.00
2024-12-31,CUOTA PRESTAMO HIPOTECARIO,-800.00
```

**Expected Results**:
- ✅ `simplified_description`: "Maintenance Fee", "Credit Card", "Mortgage"
- ✅ Categories: "Bank Fees", "Bank Fees", "Housing"
- ✅ Source: "rules"

---

## Console Output to Look For

### Successful v2 Pipeline
```
[PARSE API] Using Hybrid Pipeline v2 for 10 rows
[Hybrid Pipeline v2] Processing 10 transactions
[Hybrid Pipeline v2] Step 1+2: Sanitize + Rule Simplify
[Hybrid Pipeline v2] Rule coverage: 8/10 (80%)
[Hybrid Pipeline v2] Step 3: AI Simplify (2 items)
[Hybrid Pipeline v2] Step 4: AI Categorize
[Hybrid Pipeline v2] Complete in 1234ms
[Hybrid Pipeline v2] Results: 10/10 categorized (100%)
[PARSE API] v2 Pipeline complete: 10/10 categorized, 10 simplified
[PARSE API] Sample: [
  { desc: 'COMPRA MERCADONA VALENCIA CAR', simplified: 'Mercadona', cat: 'Groceries' },
  { desc: 'SPOTIFY PREMIUM MONTHLY', simplified: 'Spotify', cat: 'Entertainment' },
  ...
]
```

---

## Database Verification

### Check Pipeline Metadata
```sql
SELECT 
  id,
  description,
  simplified_description,
  raw_csv_row::jsonb->'pipeline_version' as version,
  raw_csv_row::jsonb->'simplify'->>'source' as simplify_source,
  raw_csv_row::jsonb->'simplify'->>'confidence' as confidence,
  raw_csv_row::jsonb->'categorize'->>'source' as categorize_source
FROM transactions
WHERE created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC;
```

**Expected**:
- `version`: "v2_hybrid"
- `simplify_source`: "rules" or "ai"
- `confidence`: 0.7 - 1.0
- `categorize_source`: "ai", "preference", or "manual"

### Check Index Performance
```sql
-- Should use index!
EXPLAIN ANALYZE
SELECT * FROM transactions
WHERE simplified_description ILIKE '%mercadona%';
```

---

## Success Criteria

| Criterion | Target | How to Verify |
|-----------|--------|---------------|
| Rule Coverage | ≥70% | Console logs |
| Categorization | ≥90% | Database check |
| Simplified Descriptions | 100% | All rows have value |
| API Costs | <$0.50/1000 txns | OpenRouter dashboard |
| Build Time | <60s | Vercel/local build |
| No Errors | 0 | Console/logs |

---

## Troubleshooting

### Issue: No simplified_description in DB
**Fix**: Migration not applied
```bash
npx prisma migrate dev
```

### Issue: "Cannot read property 'simplified_description'"
**Fix**: Old transactions don't have it (expected)
```sql
-- Only check new imports
WHERE created_at > '2025-12-31'
```

### Issue: All simplified_descriptions are long
**Fix**: Rules not matching, add more patterns to `rule-simplify.ts`

### Issue: High AI costs
**Fix**: 
1. Check rule coverage (should be 70%+)
2. Add more merchant patterns
3. Disable AI: remove `OPENROUTER_API_KEY`

---

## Quick Start Testing

### Option 1: Use Test CSV (Recommended)
```bash
# 1. Create test CSV
cat > test-transactions.csv << EOF
date,description,amount
2024-12-31,COMPRA MERCADONA VALENCIA,25.50
2024-12-31,SPOTIFY PREMIUM,9.99
2024-12-31,BIZUM A SR JUAN PEREZ,-50.00
EOF

# 2. Upload via UI or API
curl -X POST http://localhost:3000/api/statements/parse \
  -F "file=@test-transactions.csv"
```

### Option 2: Use Real CSV
Just upload any bank CSV through the UI!

---

## Next Steps After Testing

1. ✅ Verify all tests pass
2. ✅ Check database has correct data
3. ✅ Review console logs  
4. 🚀 Ready for staging/production!

---

**Status**: Phase 4 testing ready to begin! 🧪
