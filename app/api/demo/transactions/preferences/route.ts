import { NextResponse } from 'next/server'

export async function GET() {
    // Mock user transaction preferences
    return NextResponse.json({
        defaultCurrency: "EUR",
        startOfWeek: "monday",
        showHidden: false,
        density: "comfortable"
    })
}
