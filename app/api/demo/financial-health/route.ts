import { NextResponse } from 'next/server'
import { MOCK_FINANCIAL_HEALTH } from '@/lib/demo/mock-data'

export async function GET() {
    return NextResponse.json(MOCK_FINANCIAL_HEALTH)
}
