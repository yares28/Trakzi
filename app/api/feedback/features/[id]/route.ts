import { NextResponse } from "next/server"
import { getCurrentUserId } from "@/lib/auth"
import { neonQuery } from "@/lib/neonClient"
import { isAdminUser } from "@/lib/admin"

type FeatureOwner = {
    user_id: string
}

export async function DELETE(
    _req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const userId = await getCurrentUserId()
        const { id } = await params

        const rows = await neonQuery<FeatureOwner>(
            "SELECT user_id FROM feedback_features WHERE id = $1",
            [id]
        )

        if (rows.length === 0) {
            return NextResponse.json({ error: "Feature not found" }, { status: 404 })
        }

        const feature = rows[0]

        if (feature.user_id !== userId && !isAdminUser(userId)) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 })
        }

        await neonQuery("DELETE FROM feedback_features WHERE id = $1", [id])

        return NextResponse.json({ success: true })
    } catch (error: unknown) {
        const msg = String((error as Error)?.message ?? "")
        if (msg.includes("Unauthorized")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }
        console.error("[DELETE /api/feedback/features/[id]]", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}
