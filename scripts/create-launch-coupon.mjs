// Product Hunt launch coupon setup — run once before launch:
//   node scripts/create-launch-coupon.mjs
//
// Creates (idempotently) the Stripe Coupons and customer-facing Promotion Codes
// for the Product Hunt launch:
//   1. 1MPRO4PH — 100% off for 1 month  (first 50 redeemers only)
//   2. PH30OFF  — 30% off for 3 months  (fallback after 1MPRO4PH sells out)
//
// Safe to re-run — anything that already exists is skipped, not duplicated.
// Patterned after app/api/billing/apply-retention-coupon/route.ts but moved
// out of the request path so a flaky first redemption can't break launch day.

import Stripe from 'stripe'
import { readFileSync } from 'fs'

// ─── Configuration (edit here, not in the logic below) ─────────────────────────
const REDEEM_BY = new Date('2026-05-31T23:59:59Z')

const COUPONS = [
    {
        // Tier 1: headline launch offer. FIXED-amount discount equal to one PRO Monthly
        // cycle (€4.99). Restricted to the PRO product so MAX checkouts get rejected.
        // On PRO Monthly: zeroes out the invoice (free month). On PRO Annual: shaves
        // €4.99 off the €49.99 invoice — small unintended bonus, intentionally accepted.
        couponId: 'ph_launch_1mo',
        couponName: 'Product Hunt Launch – 1 Month PRO Free',
        promoCode: '1MPRO4PH',
        amountOffCents: 499,
        currency: 'eur',
        duration: 'once',
        restrictToProProduct: true,
        maxRedemptions: 50,
    },
    {
        // Tier 2: fallback once Tier 1's cap is hit. Percentage, applies to all paid plans.
        couponId: 'ph_launch_30off_3mo',
        couponName: 'Product Hunt Launch – 30% Off for 3 Months',
        promoCode: 'PH30OFF',
        percentOff: 30,
        duration: 'repeating',
        durationInMonths: 3,
        restrictToProProduct: false,
        maxRedemptions: 500,
    },
]

// ─── Env loading (matches scripts/migrate-phase5.mjs convention) ───────────────
const envContent = readFileSync('.env', 'utf8')
const STRIPE_SECRET_KEY = envContent.match(/^STRIPE_SECRET_KEY="?([^"\n]+)"?/m)?.[1]
const PRO_MONTHLY_PRICE_ID = envContent.match(/^STRIPE_PRICE_ID_PRO_MONTHLY="?([^"\n]+)"?/m)?.[1]

if (!STRIPE_SECRET_KEY) {
    console.error('✗ STRIPE_SECRET_KEY not found in .env')
    process.exit(1)
}
if (!PRO_MONTHLY_PRICE_ID) {
    console.error('✗ STRIPE_PRICE_ID_PRO_MONTHLY not found in .env')
    process.exit(1)
}

const stripe = new Stripe(STRIPE_SECRET_KEY)

async function setupCoupon(proProductId, config) {
    const { couponId, couponName, promoCode, maxRedemptions, restrictToProProduct } = config
    console.log(`\n── ${promoCode} ──────────────────────────────`)

    // Step 1 — Create the Coupon (the discount object). Skip if already there.
    let coupon
    try {
        coupon = await stripe.coupons.retrieve(couponId)
        console.log(`✓ Coupon "${couponId}" already exists — skipping create`)
    } catch (err) {
        if (err.code !== 'resource_missing') throw err

        const couponPayload = {
            id: couponId,
            name: couponName,
            duration: config.duration,
            max_redemptions: maxRedemptions,
            redeem_by: Math.floor(REDEEM_BY.getTime() / 1000),
        }

        // Discount shape: either fixed-amount-off (with currency) or percent-off
        if (config.amountOffCents !== undefined) {
            couponPayload.amount_off = config.amountOffCents
            couponPayload.currency = config.currency
        } else {
            couponPayload.percent_off = config.percentOff
        }
        if (config.durationInMonths) {
            couponPayload.duration_in_months = config.durationInMonths
        }
        if (restrictToProProduct) {
            couponPayload.applies_to = { products: [proProductId] }
        }

        coupon = await stripe.coupons.create(couponPayload)
        console.log(`✓ Created coupon "${couponId}"`)
    }

    // Step 2 — Create the Promotion Code (the customer-facing string).
    // Promotion Codes can't be retrieved by a custom ID; we look them up by the
    // user-facing `code` field instead.
    const existingCodes = await stripe.promotionCodes.list({
        code: promoCode,
        limit: 1,
    })

    if (existingCodes.data.length > 0) {
        console.log(`✓ Promotion code "${promoCode}" already exists — skipping create`)
    } else {
        await stripe.promotionCodes.create({
            coupon: coupon.id,
            code: promoCode,
            max_redemptions: maxRedemptions,
            expires_at: Math.floor(REDEEM_BY.getTime() / 1000),
        })
        console.log(`✓ Created promotion code "${promoCode}" → ${couponId}`)
    }
}

async function setupLaunchCoupons() {
    console.log('Setting up Product Hunt launch coupons...\n')

    // Resolve the PRO product ID once (shared by all coupons).
    // We need the *product* (not price) for Coupon.applies_to. Doing the lookup
    // here keeps the script self-contained and avoids a new env var.
    const proPrice = await stripe.prices.retrieve(PRO_MONTHLY_PRICE_ID)
    const proProductId = typeof proPrice.product === 'string'
        ? proPrice.product
        : proPrice.product.id
    console.log(`✓ Resolved PRO product: ${proProductId}`)

    for (const config of COUPONS) {
        await setupCoupon(proProductId, config)
    }

    console.log('\n✅ Launch coupons setup complete.')
    console.log(`   Active until ${REDEEM_BY.toISOString().slice(0, 10)}`)
    for (const c of COUPONS) {
        const discount = c.amountOffCents !== undefined
            ? `€${(c.amountOffCents / 100).toFixed(2)} off once`
            : `${c.percentOff}% off ${c.durationInMonths}mo`
        const scope = c.restrictToProProduct ? 'PRO only' : 'all paid plans'
        console.log(`   • ${c.promoCode.padEnd(10)} → ${discount} · ${scope} · ${c.maxRedemptions} redemptions`)
    }
}

setupLaunchCoupons().catch((err) => {
    console.error('\n✗ Setup failed:', err.message ?? err)
    process.exit(1)
})
