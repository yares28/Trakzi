import { NextRequest, NextResponse } from "next/server"
import { MOCK_CHALLENGE_GROUPS } from "@/lib/demo/mock-data"

export async function GET(
    _request: NextRequest,
    { params }: { params: Promise<{ groupId: string }> }
) {
    const { groupId } = await params

    const group = MOCK_CHALLENGE_GROUPS.find(g => g.id === groupId)
    if (!group) {
        return NextResponse.json({ error: "Challenge group not found" }, { status: 404 })
    }

    return NextResponse.json(group)
}
