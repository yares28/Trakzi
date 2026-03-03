import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getCurrentUserId } from '@/lib/auth'
import { getSharingPreferences, updateSharingPreferences } from '@/lib/friends/sharing'

const PatchSchema = z.object({
    share_with_friends: z.boolean().optional(),
    share_publicly: z.boolean().optional(),
}).refine(
    data => data.share_with_friends !== undefined || data.share_publicly !== undefined,
    { message: 'At least one preference must be provided' }
)

export async function GET() {
    try {
        const userId = await getCurrentUserId()
        const prefs = await getSharingPreferences(userId)
        return NextResponse.json(prefs)
    } catch (error: any) {
        if (error.message?.includes('Unauthorized')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }
        return NextResponse.json({ error: 'Failed to fetch sharing preferences' }, { status: 500 })
    }
}

export async function PATCH(req: NextRequest) {
    try {
        const userId = await getCurrentUserId()
        const body = await req.json().catch(() => ({}))

        const parsed = PatchSchema.safeParse(body)
        if (!parsed.success) {
            return NextResponse.json(
                { error: parsed.error.issues[0]?.message || 'Invalid input' },
                { status: 400 }
            )
        }

        const updated = await updateSharingPreferences(userId, parsed.data)
        return NextResponse.json(updated)
    } catch (error: any) {
        if (error.message?.includes('Unauthorized')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }
        return NextResponse.json({ error: 'Failed to update sharing preferences' }, { status: 500 })
    }
}
