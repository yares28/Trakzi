import { NextResponse } from 'next/server'
import { MOCK_GOALS } from '@/lib/demo/mock-data'

export async function GET() {
    return NextResponse.json({ goals: MOCK_GOALS })
}
