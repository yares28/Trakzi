# OpenRouter API Testing Guide - Phase 2

**Purpose**: Test the AI utilities (simplify + categorize) with real OpenRouter API calls

**Prerequisites**:
- OpenRouter API key configured in `.env.local`
- DATABASE_URL configured
- Node.js environment ready

---

## 1. Configure API Key

Add to your `.env.local` file:

```bash
# OpenRouter API Key (get from https://openrouter.ai/keys)
OPENROUTER_API_KEY=sk-or-v1-your-key-here

# Optional: Specific models for each task
OPENROUTER_SIMPLIFY_MODEL=anthropic/claude-3.5-sonnet
OPENROUTER_CATEGORY_MODEL=anthropic/claude-3.5-sonnet

# Site info for OpenRouter
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

---

## 2. Unit Test Verification (No API Required)

First, verify all utilities work without AI:

```bash
# Test sanitization
npm test -- sanitize-description

# Test rule simplification 
npm test -- rule-simplify

# Test AI simplify (with mocked responses)
npm test -- ai-simplify

# Test integration (no real API calls)
npm test -- import-pipeline-v2
```

**Expected**: All tests should pass ✅

---

## 3. Manual API Testing

Create a test script to verify real AI calls work:

**File**: `scripts/test-ai-pipeline.ts`

```typescript
import { sanitize Description } from "@/lib/ai/sanitize-description";
import { ruleSimplifyDescription } from "@/lib/ai/rule-simplify";
import { aiSimplifyBatch } from "@/lib/ai/ai-simplify";
import { aiCategorizeBatch } from "@/lib/ai/categorize-v2";

async function testPipeline() {
    console.log("🧪 Testing Hybrid Import Pipeline v2 with real AI...\n");

    // Test data: mix of known and unknown merchants
    const testTransactions = [
        {
            id: "tx_0",
            raw: "COMPRA MERCADONA VALENCIA CARD*1234",
            amount: -45.20
        },
        {
            id: "tx_1", 
            raw: "BIZUM A SR JUAN PEREZ REF:123456789",
            amount: -20.00
        },
        {
            id: "tx_2",
            raw: "COMPRA WWW.TIENDADESCONOCIDA.COM AUTH:ABC123",
            amount: -89.99
        },
        {
            id: "tx_3",
            raw: "NOMINA EMPRESA XYZ SA",
            amount: 2500.00
        },
        {
            id: "tx_4",
            raw: "COMPRA LOCAL BOUTIQUE RARO",
            amount: -150.00
        }
    ];

    // Step 1: Sanitize
    console.log("Step 1: Sanitization");
    console.log("-".repeat(50));
    const sanitized = testTransactions.map(tx => ({
        ...tx,
        sanitized: sanitizeDescription(tx.raw)
    }));
    sanitized.forEach(tx => {
        console.log(`${tx.id}: ${tx.raw}`);
        console.log(`   → ${tx.sanitized}\n`);
    });

    // Step 2: Rule Simplify
    console.log("\nStep 2: Rule-Based Simplification");
    console.log("-".repeat(50));
    const simplified = sanitized.map(tx => ({
        ...tx,
        ruleResult: ruleSimplifyDescription(tx.sanitized)
    }));

    const needsAi: typeof simplified = [];
    simplified.forEach(tx => {
        if (tx.ruleResult.simplified) {
            console.log(`✅ ${tx.id}: "${tx.ruleResult.simplified}" (${tx.ruleResult.confidence})`);
        } else {
            console.log(`❌ ${tx.id}: No rule match → needs AI`);
            needsAi.push(tx);
        }
    });

    // Step 3: AI Simplify (only for unmatched)
    console.log(`\nStep 3: AI Simplification (${needsAi.length} items)`);
    console.log("-".repeat(50));
    if (needsAi.length > 0) {
        const aiSimplifyResults = await aiSimplifyBatch(
            needsAi.map(tx => ({ id: tx.id, sanitized_description: tx.sanitized }))
        );

        for (const tx of needsAi) {
            const aiResult = aiSimplifyResults.get(tx.id);
            console.log(`${tx.id}: "${aiResult?.simplified}" (confidence: ${aiResult?.confidence})`);
        }

        // Merge results
        simplified.forEach(tx => {
            if (!tx.ruleResult.simplified) {
                const aiResult = aiSimplifyResults.get(tx.id);
                tx.ruleResult = {
                    simplified: aiResult?.simplified || null,
                    confidence: aiResult?.confidence || 0,
                    matchedRule: "ai",
                    typeHint: "other"
                };
            }
        });
    }

    // Step 4: AI Categorize (all items)
    console.log("\nStep 4: AI Categorization");
    console.log("-".repeat(50));
    const categorizationInput = simplified.map(tx => ({
        id: tx.id,
        simplified_description: tx.ruleResult.simplified || tx.sanitized,
        sanitized_description: tx.sanitized,
        amount: tx.amount
    }));

    const categories = await aiCategorizeBatch(categorizationInput);

    simplified.forEach(tx => {
        const category = categories.get(tx.id);
        console.log(`${tx.id}: "${category?.category}" (confidence: ${category?.confidence})`);
    });

    // Final Summary
    console.log("\n\n📊 Pipeline Summary");
    console.log("=".repeat(50));
    simplified.forEach(tx => {
        const category = categories.get(tx.id);
        console.log(`\n${tx.id}:`);
        console.log(`  Raw: ${tx.raw}`);
        console.log(`  Sanitized: ${tx.sanitized}`);
        console.log(`  Simplified: ${tx.ruleResult.simplified} (${tx.ruleResult.matchedRule})`);
        console.log(`  Category: ${category?.category} (${category?.confidence})`);
    });

    console.log("\n✅ Test Complete!");
}

testPipeline().catch(console.error);
```

Run it:
```bash
npx tsx scripts/test-ai-pipeline.ts
```

---

## 4. Cost Estimation

Track costs during testing:

### Expected Costs (Claude 3.5 Sonnet)

**AI Simplify** (5 items):
- Input: ~100 tokens
- Output: ~50 tokens
- Cost: ~$0.001

**AI Categorize** (5 items):
- Input: ~150 tokens
- Output: ~75 tokens
- Cost: ~$0.002

**Total for 5 items**: ~$0.003 (less than 1 cent)

**Scaled to 1000 transactions**:
- Rule coverage: 80% (800 items)
- AI simplify needed: 20% (200 items) → $0.06
- AI categorize: 100% (1000 items) → $0.40
- **Total**: ~$0.46 per 1000 transactions

---

## 5. Quality Validation

Check these metrics after API testing:

### Simplification Quality
- [ ] Known merchants simplified correctly (Mercadona → "Mercadona")
- [ ] Transfers extract first names (Bizum Juan)
- [ ] Unknown merchants get reasonable names
- [ ] No sensitive data in simplified descriptions

### Categorization Accuracy
- [ ] Groceries recognized (Mercadona → Groceries)
- [ ] Subscriptions recognized (Spotify → Subscriptions)
- [ ] Transfers recognized (Bizum XX → Transfers)
- [ ] Income recognized (Salary)
- [ ] "Other" used sparingly (<10%)

### Performance
- [ ] 100 items process in <10 seconds
- [ ] No API timeouts
- [ ] Batch processing works correctly

---

## 6. Troubleshooting

### Issue: "No OPENROUTER_API_KEY found"
**Solution**: Add key to `.env.local`, restart dev server

### Issue: API returns 401 Unauthorized
**Solution**: Check API key is valid at https://openrouter.ai/keys

### Issue: API returns 429 Rate Limit
**Solution**: Wait 1 minute, reduce batch size, or upgrade plan

### Issue: Poor categorization accuracy
**Solution**: 
- Check simplified descriptions are meaningful
- Review AI prompts in `categorize-v2.ts`
- Increase temperature slightly (0.1 → 0.3)

### Issue: High costs
**Solution**:
- Verify rule coverage is >80%
- Check batch sizes (should be 100-150)
- Implement caching for repeat merchants

---

## 7. Success Criteria

✅ **Phase 2 is complete when**:

1. All unit tests pass (140+ tests)
2. Integration test passes
3. Real API test script runs successfully
4. Simplification accuracy >85%
5. Categorization accuracy >90%
6. Cost per 1000 txns \<$0.60
7. No sensitive data leaked to AI

---

## 8. Next Steps (Phase 3)

After API testing is successful:

1. Integrate into parse route (`app/api/statements/parse/route.ts`)
2. Update import route (`app/api/statements/import/route.ts`)
3. Add UI preview in review dialog
4. Deploy to staging
5. Beta test with real users

---

**Current Status**: Ready for API testing  
**Estimated Time**: 30 minutes for full API validation
