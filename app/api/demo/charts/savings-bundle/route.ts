import { NextResponse } from 'next/server'
import { MOCK_SAVINGS_BUNDLE } from '@/lib/demo/mock-data'

export async function GET() {
    return NextResponse.json(MOCK_SAVINGS_BUNDLE)
}
