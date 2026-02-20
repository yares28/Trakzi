import { NextResponse } from 'next/server'
import { buildFilteredAnalyticsBundle } from '@/lib/demo/mock-data'

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url)
    const filter = searchParams.get('filter')
    return NextResponse.json(buildFilteredAnalyticsBundle(filter))
}
