import { NextResponse } from 'next/server'
import { buildFilteredDashboardStats } from '@/lib/demo/mock-data'

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url)
    const filter = searchParams.get('filter')
    return NextResponse.json(buildFilteredDashboardStats(filter))
}
