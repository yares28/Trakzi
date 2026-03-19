import { NextResponse } from 'next/server'
import { neonQuery } from '@/lib/neonClient'

/**
 * Health check endpoint for Neon database warmup
 * Called by Vercel Cron to keep database connection warm
 */
export async function GET() {
    try {
        // Simple query to keep Neon connection alive
        const startTime = Date.now()
        const result = await neonQuery('SELECT 1 as ping')
        const duration = Date.now() - startTime

        console.log(`[Health] Database ping: ${duration}ms`)

        return NextResponse.json({ status: 'ok' })
    } catch (error: any) {
        console.error('[Health] Database error:', error)
        return NextResponse.json({ status: 'error' }, { status: 503 })
    }
}
