import { NextResponse } from 'next/server'
import { getCurrentUserId } from '@/lib/auth'
import { getFriendsBundle, type FriendsBundleSummary } from '@/lib/charts/friends-aggregations'
import { getCachedOrCompute, buildCacheKey } from '@/lib/cache/upstash'

const FRIENDS_BUNDLE_TTL = 2 * 60 // 2 minutes

export const GET = async () => {
    try {
        const userId = await getCurrentUserId()

        const cacheKey = buildCacheKey('friends', userId, null, 'bundle')

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
