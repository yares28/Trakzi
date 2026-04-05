// app/api/accounts/net-worth/route.ts
// Returns a net worth snapshot based on current_balance of active accounts.
import { NextResponse } from 'next/server'
import { getCurrentUserId } from '@/lib/auth'
import { neonQuery } from '@/lib/neonClient'

type AccountRow = {
    id: string
    name: string
    account_type: string
    currency: string
    current_balance: string | null
    institution: string | null
}

// Account types that count as assets (positive contribution)
const ASSET_TYPES = new Set(['checking', 'savings', 'cash', 'investment'])
// Account types that count as liabilities (negative contribution)
const LIABILITY_TYPES = new Set(['credit_card', 'loan'])

export async function GET() {
    try {
        const userId = await getCurrentUserId()

        const accounts = await neonQuery<AccountRow>(
            `SELECT id, name, account_type, currency, current_balance, institution
             FROM bank_accounts
             WHERE user_id = $1 AND is_active = true AND current_balance IS NOT NULL
             ORDER BY display_order ASC, created_at ASC`,
            [userId]
        )

        let totalAssets = 0
        let totalLiabilities = 0
        const breakdown: Array<{
            id: string
            name: string
            accountType: string
            currency: string
            balance: number
            isAsset: boolean
        }> = []

        for (const acc of accounts) {
            const balance = parseFloat(acc.current_balance ?? '0')
            const isAsset = ASSET_TYPES.has(acc.account_type)
            const isLiability = LIABILITY_TYPES.has(acc.account_type)

            if (isAsset) {
                totalAssets += balance
            } else if (isLiability) {
                // Credit card / loan balances are typically positive numbers representing what you owe
                totalLiabilities += Math.abs(balance)
            }

            breakdown.push({
                id: acc.id,
                name: acc.name,
                accountType: acc.account_type,
                currency: acc.currency,
                balance,
                isAsset: isAsset || !isLiability,
            })
        }

        const netWorth = totalAssets - totalLiabilities

        return NextResponse.json({
            success: true,
            netWorth,
            totalAssets,
            totalLiabilities,
            breakdown,
        })
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}
