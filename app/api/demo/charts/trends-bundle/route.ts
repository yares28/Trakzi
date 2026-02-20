import { NextResponse } from 'next/server'
import { MOCK_TRENDS_BUNDLE } from '@/lib/demo/mock-data'

export async function GET() {
    return NextResponse.json(MOCK_TRENDS_BUNDLE)
}
