import { NextResponse } from 'next/server'
import { MOCK_DAILY_TRANSACTIONS } from '@/lib/demo/mock-data'

export async function GET() {
    return NextResponse.json(MOCK_DAILY_TRANSACTIONS)
}
