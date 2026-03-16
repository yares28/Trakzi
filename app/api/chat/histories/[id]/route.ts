// app/api/chat/histories/[id]/route.ts
import { NextRequest, NextResponse } from "next/server"
import { getCurrentUserId } from "@/lib/auth"
import { neonQuery } from "@/lib/neonClient"
import type { ChatHistory } from "@/lib/types/chat"

// GET — load full chat (messages included)
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getCurrentUserId()
    const { id } = await params

    const rows = await neonQuery<{
      id: string
      title: string
      messages: string
      message_count: number
      preview: string
      created_at: string
      updated_at: string
    }>(
      `SELECT id, title, messages, message_count, preview, created_at, updated_at
       FROM chat_histories
       WHERE id = $1 AND user_id = $2
       LIMIT 1`,
      [id, userId]
    )

    if (!rows[0]) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    const row = rows[0]
    const history: ChatHistory = {
      id: row.id,
      user_id: userId,
      title: row.title,
      messages: typeof row.messages === "string" ? JSON.parse(row.messages) : row.messages,
      message_count: row.message_count,
      created_at: row.created_at,
      updated_at: row.updated_at,
    }

    return NextResponse.json({ history })
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
}

// DELETE — remove saved chat
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getCurrentUserId()
    const { id } = await params

    await neonQuery(
      `DELETE FROM chat_histories WHERE id = $1 AND user_id = $2`,
      [id, userId]
    )

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
}
