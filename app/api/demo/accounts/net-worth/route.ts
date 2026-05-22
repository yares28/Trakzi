import { NextResponse } from 'next/server'
import { MOCK_NET_WORTH } from '@/lib/demo/mock-data'

// Demo net worth — returns a fixed multi-account breakdown. The account
// filter query param is ignored: demo mode always shows every account.
export async function GET() {
    return NextResponse.json(MOCK_NET_WORTH)
}
