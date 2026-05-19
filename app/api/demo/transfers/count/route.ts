import { NextResponse } from 'next/server'

export async function GET() {
    return NextResponse.json({ success: true, openCount: 0, staleCount: 0, staleAgeDays: 7 })
}
