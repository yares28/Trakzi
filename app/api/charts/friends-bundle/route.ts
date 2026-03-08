import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserId } from '@/lib/auth'
import { getFriendsBundle, type FriendsBundleSummary } from '@/lib/charts/friends-aggregations'
import { getCachedOrCompute, buildCacheKey, invalidateExactKeys } from '@/lib/cache/upstash'

const FRIENDS_BUNDLE_TTL = 2 * 60 // 2 minutes

export const GET = async (req: NextRequest) => {
    try {
        const userId = await getCurrentUserId()
        const cacheKey = buildCacheKey('friends', userId, null, 'bundle')

        // Allow cache bypass via ?fresh=1 (used after friendship changes)
        const fresh = req.nextUrl.searchParams.get('fresh') === '1'
        if (fresh) {
            await invalidateExactKeys(cacheKey)
        }

        const data = await getCachedOrCompute<FriendsBundleSummary>(
            cacheKey,
            () => getFriendsBundle(userId),
            FRIENDS_BUNDLE_TTL
        )

        return NextResponse.json(data, {
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'private, no-store',
            },
        })
    } catch (error: any) {
        if (error.message?.includes('Unauthorized')) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            )
        }
        console.error('[FriendsBundle] Error:', error)
        return NextResponse.json(
            { error: 'Failed to fetch friends bundle' },
            { status: 500 }
        )
    }
}
