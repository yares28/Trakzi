import { NextResponse } from 'next/server'

// Demo mode: no transfer suggestions — demo data comes from a single clean statement.
export async function GET() {
    return NextResponse.json({ success: true, transfers: [] })
}
