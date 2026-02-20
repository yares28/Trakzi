import { NextResponse } from 'next/server'
import { buildFilteredGroceriesTrendsBundle } from '@/lib/demo/mock-data'

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url)
    const filter = searchParams.get('filter')
    return NextResponse.json(buildFilteredGroceriesTrendsBundle(filter))
}
