import { NextResponse } from 'next/server'
import { MOCK_HOME_BUNDLE } from '@/lib/demo/mock-data'

export async function GET() {
    return NextResponse.json(MOCK_HOME_BUNDLE)
}
