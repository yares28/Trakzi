import { NextResponse } from 'next/server'

export async function GET() {
    // Return a list of years available in the mock data
    // Since we generate 7 months back from "now", it will likely span 2 years (e.g., 2025, 2026)
    const currentYear = new Date().getFullYear()
    return NextResponse.json([currentYear, currentYear - 1])
}
