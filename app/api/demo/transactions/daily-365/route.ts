import { NextResponse } from 'next/server'
import { MOCK_ANALYTICS_BUNDLE } from '@/lib/demo/mock-data'

export async function GET() {
    // The heatmap expects an array of { date, count, level } 
    // We can derive this from MOCK_ANALYTICS_BUNDLE.dailySpending or generate a new one
    // For simplicity, let's use a dayMonthHeatmap structure or similar if available, 
    // but the component likely expects a flat array of days.

    // Let's generate a full year of data based on the mock transaction distribution
    const data = Array.from({ length: 365 }, (_, i) => {
        const d = new Date()
        d.setDate(d.getDate() - (364 - i))
        return {
            date: d.toISOString().split('T')[0],
            count: Math.floor(Math.random() * 5), // Mock count
            level: Math.floor(Math.random() * 5), // 0-4
        }
    })

    return NextResponse.json(data)
}
