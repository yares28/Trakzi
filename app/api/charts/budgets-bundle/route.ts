import { NextResponse } from 'next/server'
import { getCurrentUserId } from '@/lib/auth'
import { getBudgetsBundle } from '@/lib/charts/budgets-aggregations'
import { getCachedOrCompute, buildCacheKey, CACHE_TTL } from '@/lib/cache/upstash'
import { checkRateLimit, createRateLimitResponse } from '@/lib/security/rate-limiter'

export const GET = async (request: Request) => {
  try {
    const userId = await getCurrentUserId()

    const rateLimitResult = await checkRateLimit(userId, 'bundle')
    if (rateLimitResult.limited) {
      return createRateLimitResponse(rateLimitResult.resetIn)
    }

    const { searchParams } = new URL(request.url)
    const filter = searchParams.get('filter')

    const cacheKey = buildCacheKey('budgets', userId, filter, 'bundle')

    const data = await getCachedOrCompute(
      cacheKey,
      () => getBudgetsBundle(userId, filter),
      CACHE_TTL['budgets']
    )

    return NextResponse.json(data)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    if (message.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('[budgets-bundle] GET error:', error)
    return NextResponse.json({ error: 'Failed to load budgets bundle' }, { status: 500 })
  }
}
