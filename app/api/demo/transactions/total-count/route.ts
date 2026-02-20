import { NextResponse } from 'next/server'
import { MOCK_TOTAL_TRANSACTION_COUNT } from '@/lib/demo/mock-data'

export async function GET() {
    return NextResponse.json(MOCK_TOTAL_TRANSACTION_COUNT)
}
