# Phase 3: Parse Route Integration Guide

## File: `app/api/statements/parse/route.ts`

### Changes Required

**Line 7**: Add new import
```typescript
// OLD:
import { categoriseTransactions } from "@/lib/ai/categoriseTransactions";

// NEW (add both):
import { categoriseTransactions } from "@/lib/ai/categoriseTransactions";
import { processHybridPipelineV2 } from "@/lib/ai/hybrid-pipeline-v2";
```

**Lines 1117-1124**: Replace categorization logic

```typescript
// OLD CODE (Lines 1117-1124):
console.log(`[PARSE API] Calling categoriseTransactions with ${rows.length} rows`);
withCategories = await categoriseTransactions(rows, customCategories, {
    preferencesByKey,
    userId: userId ?? undefined,
});
const categorizedCount = withCategories.filter(r => r.category && r.category !== "Other").length;
console.log(`[PARSE API] Categorization complete: ${categorizedCount}/${withCategories.length} have non-Other categories`);
console.log(`[PARSE API] Sample categories:`, withCategories.slice(0, 5).map(r => ({ desc: r.description.substring(0, 30), cat: r.category })));

// NEW CODE:
// Feature flag for v2 pipeline
const useV2Pipeline = process.env.ENABLE_HYBRID_PIPELINE_V2 === "true";

if (useV2Pipeline) {
    console.log(`[PARSE API] Using Hybrid Pipeline v2 for ${rows.length} rows`);
    
    // Use new v2 pipeline
    withCategories = await processHybridPipelineV2(rows, {
        preferencesByKey,
        userId: userId ?? undefined,
        customCategories,
        enableV2: true,
    });
    
    const categorizedCount = withCategories.filter(r => r.category && r.category !== "Other").length;
    const simplifiedCount = withCategories.filter(r => r.simplifiedDescription).length;
    
    console.log(`[PARSE API] v2 Pipeline complete: ${categorizedCount}/${withCategories.length} categorized, ${simplifiedCount} simplified`);
    console.log(`[PARSE API] Sample:`, withCategories.slice(0, 3).map(r => ({ 
        desc: r.description.substring(0, 30), 
        simplified: r.simplifiedDescription,
        cat: r.category 
    })));
} else {
    // Fall back to v1 (existing) pipeline
    console.log(`[PARSE API] Using v1 pipeline (ENABLE_HYBRID_PIPELINE_V2 not enabled)`);
    
    withCategories = await categoriseTransactions(rows, customCategories, {
        preferencesByKey,
        userId: userId ?? undefined,
    });
    
    const categorizedCount = withCategories.filter(r => r.category && r.category !== "Other").length;
    console.log(`[PARSE API] Categorization complete: ${categorizedCount}/${withCategories.length} have non-Other categories`);
}
```

### Environment Variable

Add to `.env.local`:
```bash
# Enable Hybrid Import Pipeline v2 (default: false)
ENABLE_HYBRID_PIPELINE_V2=true
```

---

## Testing After Integration

1. **Start dev server**:
   ```bash
   npm run dev
   ```

2. **Upload a test CSV** with these descriptions:
   - "COMPRA MERCADONA VALENCIA CARD*1234"
   - "BIZUM A SR JUAN PEREZ"
   - "RECIBO SPOTIFY PREMIUM"
   -"COMISION MANTENIMIENTO"

3. **Check console logs** for:
   ```
   [Hybrid Pipeline v2] Processing 4 transactions
   [Hybrid Pipeline v2] Rule coverage: 4/4 (100%)
   [Hybrid Pipeline v2] Complete in XXms
   [PARSE API] v2 Pipeline complete: 4/4 categorized, 4 simplified
   ```

4. **Verify in review dialog**:
   - Simplified descriptions appear
   - Categories are accurate
   - No sensitive data visible

---

## Rollback Plan

If issues arise, simply set:
```bash
ENABLE_HYBRID_PIPELINE_V2=false
```

The system will fall back to v1 pipeline automatically.

---

## Next: Import Route Integration

After parse route is working, update:
- `app/api/statements/import/route.ts` (persist `simplified_description` to DB)
- `components/csv-review-dialog.tsx` (show simplified descriptions)
