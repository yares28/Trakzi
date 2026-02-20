import { NextResponse } from 'next/server'
import { MOCK_BUDGETS } from '@/lib/demo/mock-data'

export async function GET() {
    return NextResponse.json(MOCK_BUDGETS)
}
