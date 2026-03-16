// app/api/chat/histories/route.ts
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { getCurrentUserId } from "@/lib/auth"
import { neonQuery } from "@/lib/neonClient"
import type { ChatHistoryListItem, ChatHistoryMessage } from "@/lib/types/chat"

const SaveChatSchema = z.object({
  title: z.string().min(1).max(200),
  messages: z
    .array(
      z.object({
        id: z.string(),
        role: z.enum(["user", "assistant"]),
        content: z.string().max(50_000),
        timestamp: z.string(),
      })
    )
    .min(1)
    .max(200),
})

// GET — list saved chats (newest first, no full message payload)
export async function GET() {
  try {
    const userId = await getCurrentUserId()

    const rows = await neonQuery<{
      id: string
      title: string
      message_count: number
      preview: string
      created_at: string
      updated_at: string
    }>(
      `SELECT id, title, message_count, preview, created_at, updated_at
       FROM chat_histories
       WHERE user_id = $1
       ORDER BY updated_at DESC
       LIMIT 50`,
      [userId]
    )

    const items: ChatHistoryListItem[] = rows.map((r) => ({
      id: r.id,
      title: r.title,
      message_count: r.message_count,
      preview: r.preview,
      created_at: r.created_at,
      updated_at: r.updated_at,
    }))

    return NextResponse.json({ histories: items })
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
}

// POST — save current conversation
export async function POST(req: NextRequest) {
  try {
    const userId = await getCurrentUserId()
    const body = await req.json()
    const parsed = SaveChatSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid input" },
        { status: 400 }
      )
    }

    const { title, messages } = parsed.data

    // Derive preview from the first user message
    const firstUserMsg = messages.find((m) => m.role === "user")
    const preview = (firstUserMsg?.content ?? "").slice(0, 120)
    const messageCount = messages.length

    const rows = await neonQuery<{ id: string }>(
      `INSERT INTO chat_histories (user_id, title, messages, message_count, preview)
       VALUES ($1, $2, $3::jsonb, $4, $5)
       RETURNING id`,
      [userId, title, JSON.stringify(messages as ChatHistoryMessage[]), messageCount, preview]
    )

    const id = rows[0]?.id
    if (!id) {
      return NextResponse.json({ error: "Failed to save chat" }, { status: 500 })
    }

    return NextResponse.json({ id }, { status: 201 })
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
}
