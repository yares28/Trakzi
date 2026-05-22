// app/api/accounts/net-worth/route.ts
// Net-worth snapshot computed from transactions (no manual current_balance).
// Per OQ-2: balance = SUM(t.amount) excluding transfer/pending_transfer.
// Per M4: per-currency totals only — no FX conversion in v1.
// Per U9: respects the sidebar account filter; response carries
// totalAccountCount + filteredAccountCount so the UI can show
// "Viewing N of M accounts" with a one-click "Show all" override.
import { NextResponse } from 'next/server'
import { getCurrentUserId } from '@/lib/auth'
import { neonQuery } from '@/lib/neonClient'
import { canonicalizeAccountFilter, hasAccountFilter } from '@/lib/charts/account-filter'

type Row = {
    id: string
    name: string
    account_type: string
    currency: string
    institution: string | null
    balance: string
}

const ASSET_TYPES = new Set(['checking', 'savings', 'cash', 'investment'])
const LIABILITY_TYPES = new Set(['credit_card', 'loan'])

// Top-level totals reflect this single currency in v1; the full per-currency
// breakdown is returned in `byCurrency` for Phase 7's UI rebuild.
const PRIMARY_CURRENCY = 'EUR'

export async function GET(request: Request) {
    try {
        const userId = await getCurrentUserId()

        // Parse the optional account filter from query params.
        const { searchParams } = new URL(request.url)
        const accountsParam = searchParams.get('accounts')
        const accountIds = canonicalizeAccountFilter(
            accountsParam ? accountsParam.split(',').filter(Boolean) : null
        )

        // Build params + clauses: the filter narrows BOTH bank_accounts (so the
        // breakdown only includes selected accounts) AND the joined transactions
        // (defensive — the join is already constrained by `t.account_id = a.id`,
        // but keeping it consistent makes EXPLAIN plans simpler).
        const params: unknown[] = [userId]
        let bankAccountClause = ''
        if (hasAccountFilter(accountIds)) {
            params.push(accountIds as string[])
            bankAccountClause = ` AND a.id = ANY($${params.length})`
        }

        const accounts = await neonQuery<Row>(
            `SELECT
                a.id,
                a.name,
                a.account_type,
                a.currency,
                a.institution,
                COALESCE(SUM(t.amount) FILTER (
                    WHERE t.tx_type IS NULL OR t.tx_type NOT IN ('transfer', 'pending_transfer')
                ), 0)::text AS balance
             FROM bank_accounts a
             LEFT JOIN transactions t
                 ON t.account_id = a.id AND t.user_id = $1
             WHERE a.user_id = $1 AND a.is_active = true
             ${bankAccountClause}
             GROUP BY a.id, a.name, a.account_type, a.currency, a.institution, a.display_order, a.created_at
             HAVING COUNT(t.id) FILTER (
                 WHERE t.tx_type IS NULL OR t.tx_type NOT IN ('transfer', 'pending_transfer')
             ) > 0
             ORDER BY a.display_order ASC, a.created_at ASC`,
            params
        )

        // Companion query: total active account count, ignoring the filter.
        // The UI uses this to show "Viewing N of M accounts" and offer
        // a "Show all" reset action.
        const totalCountRows = await neonQuery<{ total: string }>(
            `SELECT COUNT(*)::text AS total
             FROM bank_accounts
             WHERE user_id = $1 AND is_active = true`,
            [userId]
        )
        const totalAccountCount = parseInt(totalCountRows[0]?.total ?? '0', 10)
        const filterActive = hasAccountFilter(accountIds)

        const breakdown: Array<{
            id: string
            name: string
            accountType: string
            currency: string
            balance: number
            isAsset: boolean
        }> = []
        const byCurrency: Record<string, { assets: number; liabilities: number; netWorth: number }> = {}

        for (const acc of accounts) {
            const balance = parseFloat(acc.balance ?? '0')
            const isAsset = ASSET_TYPES.has(acc.account_type)
            const isLiability = LIABILITY_TYPES.has(acc.account_type)

            const cur = acc.currency
            if (!byCurrency[cur]) byCurrency[cur] = { assets: 0, liabilities: 0, netWorth: 0 }

            if (isAsset) {
                byCurrency[cur].assets += balance
            } else if (isLiability) {
                // Credit-card / loan amounts are typically negative (owed); abs gives the liability size.
                byCurrency[cur].liabilities += Math.abs(balance)
            }
            byCurrency[cur].netWorth = byCurrency[cur].assets - byCurrency[cur].liabilities

            breakdown.push({
                id: acc.id,
                name: acc.name,
                accountType: acc.account_type,
                currency: acc.currency,
                balance,
                isAsset: isAsset || !isLiability,
            })
        }

        const primary = byCurrency[PRIMARY_CURRENCY] ?? { assets: 0, liabilities: 0, netWorth: 0 }

        return NextResponse.json({
            success: true,
            netWorth: primary.netWorth,
            totalAssets: primary.assets,
            totalLiabilities: primary.liabilities,
            primaryCurrency: PRIMARY_CURRENCY,
            byCurrency,
            breakdown,
            // U9: scope metadata for the "Viewing N of M • Show all" pill.
            totalAccountCount,
            filteredAccountCount: breakdown.length,
            filterActive,
        })
    } catch (error: any) {
        if (error.message?.includes('relation') && error.message?.includes('does not exist')) {
            return NextResponse.json({
                success: true,
                netWorth: 0, totalAssets: 0, totalLiabilities: 0,
                primaryCurrency: 'EUR', byCurrency: {}, breakdown: [],
                totalAccountCount: 0, filteredAccountCount: 0, filterActive: false,
            })
        }
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}
