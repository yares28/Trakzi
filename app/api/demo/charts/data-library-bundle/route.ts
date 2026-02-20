import { NextResponse } from 'next/server'
import { MOCK_DATA_LIBRARY_BUNDLE } from '@/lib/demo/mock-data'

export async function GET() {
    return NextResponse.json(MOCK_DATA_LIBRARY_BUNDLE)
}
