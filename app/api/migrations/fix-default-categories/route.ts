import { NextResponse } from 'next/server'
import { getCurrentUserId } from '@/lib/auth'
import { neonQuery } from '@/lib/neonClient'
import { DEFAULT_CATEGORIES } from '@/lib/categories'
import { DEFAULT_RECEIPT_CATEGORIES } from '@/lib/receipt-categories'

export const POST = async (request: Request) => {
    try {
        const userId = await getCurrentUserId()

        const { searchParams } = new URL(request.url)
        const dryRun = searchParams.get('dryRun') === 'true'

        // Get all default category names
        const defaultTransactionNames = DEFAULT_CATEGORIES
        const defaultReceiptNames = DEFAULT_RECEIPT_CATEGORIES.map(c => c.name)

        let results = {
            dryRun,
            transactionCategories: {
                found: 0,
                updated: 0,
                skipped: 0,
            },
            receiptCategories: {
                found: 0,
                updated: 0,
                skipped: 0,
            },
        }

        // Fix transaction categories
        if (defaultTransactionNames.length > 0) {
            // Find matching categories
            const txCategories = await neonQuery<{ id: number, name: string, is_default: boolean | null }>(
                `SELECT id, name, is_default 
         FROM categories 
         WHERE user_id = $1 AND name = ANY($2)`,
                [userId, defaultTransactionNames]
            )

            results.transactionCategories.found = txCategories.length

            if (!dryRun) {
                for (const cat of txCategories) {
                    if (cat.is_default !== true) {
                        await neonQuery(
                            `UPDATE categories 
               SET is_default = true 
               WHERE id = $1 AND user_id = $2`,
                            [cat.id, userId]
                        )
                        results.transactionCategories.updated++
                    } else {
                        results.transactionCategories.skipped++
                    }
                }
            }
        }

        // Fix receipt categories
        if (defaultReceiptNames.length > 0) {
            // Find matching categories
            const rcCategories = await neonQuery<{ id: number, name: string, is_default: boolean | null }>(
                `SELECT id, name, is_default 
         FROM receipt_categories 
         WHERE user_id = $1 AND name = ANY($2)`,
                [userId, defaultReceiptNames]
            )

            results.receiptCategories.found = rcCategories.length

            if (!dryRun) {
                for (const cat of rcCategories) {
                    if (cat.is_default !== true) {
                        await neonQuery(
                            `UPDATE receipt_categories 
               SET is_default = true 
               WHERE id = $1 AND user_id = $2`,
                            [cat.id, userId]
                        )
                        results.receiptCategories.updated++
                    } else {
                        results.receiptCategories.skipped++
                    }
                }
            }
        }

        return NextResponse.json({
            success: true,
            ...results,
            message: dryRun
                ? 'Dry run completed - no changes made'
                : 'Migration completed successfully',
        })

    } catch (error: any) {
        console.error('[Fix Default Categories Migration] Error:', error)
        return NextResponse.json(
            {
                success: false,
                error: error.message || 'Migration failed',
            },
            { status: 500 }
        )
    }
}
