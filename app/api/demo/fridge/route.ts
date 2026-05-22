import { NextResponse } from 'next/server'
import { MOCK_RECEIPT_TRANSACTIONS, filterByPeriod } from '@/lib/demo/mock-data'

export const GET = async (request: Request) => {
    const { searchParams } = new URL(request.url)
    const filter = searchParams.get('filter')

    const filteredTransactions = filterByPeriod(MOCK_RECEIPT_TRANSACTIONS, filter)

    return NextResponse.json(filteredTransactions, {
        headers: {
            'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
        },
    })
}
