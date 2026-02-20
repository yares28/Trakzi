import { NextResponse } from 'next/server'
import { MOCK_POCKETS_BUNDLE } from '@/lib/demo/mock-data'

export async function GET() {
    return NextResponse.json(MOCK_POCKETS_BUNDLE)
}
