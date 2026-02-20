import { NextResponse } from 'next/server'
import { MOCK_DASHBOARD_STATS } from '@/lib/demo/mock-data'

export async function GET() {
    return NextResponse.json(MOCK_DASHBOARD_STATS)
}
