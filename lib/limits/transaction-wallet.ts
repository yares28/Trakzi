// lib/limits/transaction-wallet.ts
// ============================================================================
// TRANSACTION WALLET SERVICE
// ============================================================================
//
// Manages per-user transaction capacity using a wallet model:
//
//   total_capacity = base_capacity               (plan allocation, permanent)
//                  + monthly_bonus_earned         (accumulated used monthly slots, permanent)
//                  + purchased_capacity           (one-time packs, permanent)
//                  + max(0, monthly_allotment - monthly_used)  (current month remaining)
//
// Key invariants:
//  - monthly_used is ONE-WAY (never decrements — deleting transactions does NOT free slots)
//  - Rollover is LAZY (detected on request, no cron needed)
//  - On rollover: monthly_used is added to monthly_bonus_earned, then reset to 0
//  - NEVER auto-delete user data — block writes and show a helpful error instead
// ============================================================================

import { neonQuery } from '../neonClient';
import { PlanType, getUserSubscription } from '../subscriptions';
import { getUserPlan } from '../subscriptions';
import { PLAN_LIMITS, getBaseCapacity } from '../plan-limits';

// ============================================================================
// TYPES
// ============================================================================

export interface TransactionWallet {
    userId: string;
    baseCapacity: number;        // permanent: plan base allocation
    monthlyBonusEarned: number;  // permanent: sum of all past monthly_used values
    purchasedCapacity: number;   // permanent: from one-time pack purchases
    monthlyUsed: number;         // current period: one-way usage counter
    monthlyPeriodStart: Date;    // when the current monthly period started
    updatedAt: Date;
}

export interface WalletCapacity {
    // Permanent components
    baseCapacity: number;
    monthlyBonusEarned: number;
    purchasedCapacity: number;
    // Current period
    monthlyAllotment: number;    // monthly bonus from plan limits
    monthlyUsed: number;
    monthlyAvailable: number;    // max(0, allotment - used)
    // Totals
    totalCapacity: number;       // base + earned + purchased + monthly_available
    used: number;                // actual stored transaction count
    remaining: number;           // totalCapacity - used
    plan: PlanType;
}

interface WalletRow {
    user_id: string;
    base_capacity: number;
    monthly_bonus_earned: number;
    purchased_capacity: number;
    monthly_used: number;
    monthly_period_start: string;
    updated_at: string;
}

// ============================================================================
// PERIOD CALCULATION
// ============================================================================

/**
 * Determine the start of the current monthly period for a user.
 * - Paid plans: uses Stripe billing period start
 * - Free plan: uses calendar month (1st of current month)
 */
function getCurrentPeriodStart(
    plan: PlanType,
    currentPeriodEnd: Date | null
): Date {
    if (plan !== 'free' && currentPeriodEnd) {
        // Stripe billing is monthly: period start = period_end - 31 days (approx)
        const periodStart = new Date(currentPeriodEnd);
        periodStart.setDate(periodStart.getDate() - 31);
        return periodStart;
    }

    // Free plan: calendar month
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
}

/**
 * Check if the stored period start is before the current period start,
 * meaning a rollover is needed.
 */
function needsRollover(storedPeriodStart: Date, currentPeriodStart: Date): boolean {
    return storedPeriodStart < currentPeriodStart;
}

// ============================================================================
// CORE FUNCTIONS
// ============================================================================

/**
 * Get or create a wallet row for a user.
 * Initializes with plan defaults if the wallet doesn't exist yet.
 */
export async function getOrCreateWallet(userId: string, plan: PlanType): Promise<TransactionWallet> {
    const baseCapacity = getBaseCapacity(plan);

    const rows = await neonQuery<WalletRow>(`
        INSERT INTO transaction_wallet (
            user_id,
            base_capacity,
            monthly_bonus_earned,
            purchased_capacity,
            monthly_used,
            monthly_period_start
        ) VALUES ($1, $2, 0, 0, 0, DATE_TRUNC('month', NOW()))
        ON CONFLICT (user_id) DO UPDATE
            SET updated_at = NOW()
        RETURNING *
    `, [userId, baseCapacity]);

    return rowToWallet(rows[0]);
}

/**
 * Apply a monthly rollover to the wallet if the period has expired.
 * - Adds monthly_used to monthly_bonus_earned (used slots become permanent)
 * - Resets monthly_used to 0
 * - Updates monthly_period_start to the new period
 *
 * This is idempotent — safe to call multiple times.
 */
async function applyRollover(
    userId: string,
    newPeriodStart: Date
): Promise<TransactionWallet> {
    const rows = await neonQuery<WalletRow>(`
        UPDATE transaction_wallet
        SET
            monthly_bonus_earned = monthly_bonus_earned + monthly_used,
            monthly_used         = 0,
            monthly_period_start = $2,
            updated_at           = NOW()
        WHERE user_id = $1
        RETURNING *
    `, [userId, newPeriodStart.toISOString()]);

    return rowToWallet(rows[0]);
}

/**
 * Get the wallet, applying a rollover if the current period has expired.
 * This is the primary way to read wallet state.
 */
export async function getWalletWithRollover(
    userId: string,
    plan: PlanType,
    currentPeriodEnd: Date | null
): Promise<TransactionWallet> {
    let wallet = await getOrCreateWallet(userId, plan);
    const currentPeriodStart = getCurrentPeriodStart(plan, currentPeriodEnd);

    if (needsRollover(wallet.monthlyPeriodStart, currentPeriodStart)) {
        wallet = await applyRollover(userId, currentPeriodStart);
    }

    return wallet;
}

/**
 * Get full wallet capacity breakdown for a user.
 * Handles rollover, counts actual usage, and returns all capacity components.
 */
export async function getWalletCapacity(userId: string): Promise<WalletCapacity> {
    const subscription = await getUserSubscription(userId);
    const plan = (subscription?.plan ?? 'free') as PlanType;
    const currentPeriodEnd = subscription?.currentPeriodEnd ?? null;

    const wallet = await getWalletWithRollover(userId, plan, currentPeriodEnd);
    const planLimits = PLAN_LIMITS[plan];

    const monthlyAllotment = planLimits.monthlyTransactions;
    const monthlyAvailable = Math.max(0, monthlyAllotment - wallet.monthlyUsed);
    const totalCapacity =
        wallet.baseCapacity +
        wallet.monthlyBonusEarned +
        wallet.purchasedCapacity +
        monthlyAvailable;

    // Count actual stored transactions
    const countResult = await neonQuery<{ bank: string; receipts: string }>(`
        SELECT
            (SELECT COUNT(*) FROM transactions WHERE user_id = $1)::text AS bank,
            (SELECT COUNT(*) FROM receipts WHERE user_id = $1)::text AS receipts
    `, [userId]);

    const bankCount = parseInt(countResult[0]?.bank || '0');
    const receiptCount = parseInt(countResult[0]?.receipts || '0');
    const used = bankCount + receiptCount;
    const remaining = Math.max(0, totalCapacity - used);

    return {
        baseCapacity: wallet.baseCapacity,
        monthlyBonusEarned: wallet.monthlyBonusEarned,
        purchasedCapacity: wallet.purchasedCapacity,
        monthlyAllotment,
        monthlyUsed: wallet.monthlyUsed,
        monthlyAvailable,
        totalCapacity,
        used,
        remaining,
        plan,
    };
}

/**
 * Increment monthly_used by count (one-way counter).
 * Call this after successfully adding transactions.
 * Respects the one-way invariant — only increments, never decrements.
 */
export async function recordMonthlyUsage(userId: string, count: number): Promise<void> {
    if (count <= 0) return;

    await neonQuery(`
        UPDATE transaction_wallet
        SET monthly_used = monthly_used + $2,
            updated_at   = NOW()
        WHERE user_id = $1
    `, [userId, count]);
}

/**
 * Add purchased capacity from a transaction pack.
 * Call this after a successful one-time Stripe payment.
 */
export async function addPurchasedCapacity(userId: string, amount: number): Promise<TransactionWallet> {
    const rows = await neonQuery<WalletRow>(`
        UPDATE transaction_wallet
        SET purchased_capacity = purchased_capacity + $2,
            updated_at         = NOW()
        WHERE user_id = $1
        RETURNING *
    `, [userId, amount]);

    return rowToWallet(rows[0]);
}

/**
 * Sync the wallet's base_capacity when a user changes plans.
 * Call this from the Stripe webhook when plan changes.
 *
 * On upgrade: base_capacity increases to new plan's base
 * On downgrade: base_capacity stays (we never reduce capacity per plan doc)
 *               monthly_period_start resets to now
 */
export async function syncWalletForPlan(
    userId: string,
    newPlan: PlanType,
    newPeriodStart: Date
): Promise<TransactionWallet> {
    const newBase = getBaseCapacity(newPlan);

    // Ensure wallet exists first
    await getOrCreateWallet(userId, newPlan);

    const rows = await neonQuery<WalletRow>(`
        UPDATE transaction_wallet
        SET
            base_capacity        = GREATEST(base_capacity, $2),
            monthly_bonus_earned = monthly_bonus_earned + monthly_used,
            monthly_used         = 0,
            monthly_period_start = $3,
            updated_at           = NOW()
        WHERE user_id = $1
        RETURNING *
    `, [userId, newBase, newPeriodStart.toISOString()]);

    return rowToWallet(rows[0]);
}

// ============================================================================
// ROW MAPPER
// ============================================================================

function rowToWallet(row: WalletRow): TransactionWallet {
    return {
        userId: row.user_id,
        baseCapacity: row.base_capacity,
        monthlyBonusEarned: row.monthly_bonus_earned,
        purchasedCapacity: row.purchased_capacity,
        monthlyUsed: row.monthly_used,
        monthlyPeriodStart: new Date(row.monthly_period_start),
        updatedAt: new Date(row.updated_at),
    };
}
