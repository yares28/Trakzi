import { NextResponse } from 'next/server'
import { MOCK_RECEIPT_TRANSACTIONS } from '@/lib/demo/mock-data'

export const GET = async (request: Request) => {
    const { searchParams } = new URL(request.url)
    const filter = searchParams.get('filter')

    let filteredTransactions = [...MOCK_RECEIPT_TRANSACTIONS]

    if (filter) {
        const now = new Date()
        const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
        
        const formatDate = (date: Date): string => {
            const year = date.getUTCFullYear()
            const month = String(date.getUTCMonth() + 1).padStart(2, '0')
            const day = String(date.getUTCDate()).padStart(2, '0')
            return `${year}-${month}-${day}`
        }

        let startDate: Date | null = null
        let endDate: Date = today

        switch (filter) {
            case 'last7days':
                startDate = new Date(today)
                startDate.setUTCDate(startDate.getUTCDate() - 7)
                break
            case 'last30days':
                startDate = new Date(today)
                startDate.setUTCDate(startDate.getUTCDate() - 30)
                break
            case 'last3months':
                startDate = new Date(today)
                startDate.setUTCMonth(startDate.getUTCMonth() - 3)
                break
            case 'last6months':
                startDate = new Date(today)
                startDate.setUTCMonth(startDate.getUTCMonth() - 6)
                break
            case 'lastyear':
                startDate = new Date(today)
                startDate.setUTCFullYear(startDate.getUTCFullYear() - 1)
                break
            case 'ytd':
                startDate = new Date(today.getFullYear(), 0, 1)
                break
            default:
                const year = parseInt(filter)
                if (!Number.isNaN(year)) {
                    startDate = new Date(year, 0, 1)
                    endDate = new Date(year, 11, 31)
                }
        }

        if (startDate) {
            const startStr = formatDate(startDate)
            const endStr = formatDate(endDate)
            filteredTransactions = filteredTransactions.filter(
                t => t.receiptDate >= startStr && t.receiptDate <= endStr
            )
        }
    }

    return NextResponse.json(filteredTransactions, {
        headers: {
            'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
        },
    })
}
