// app/api/user-preferences/route.ts
// GET  — return the authenticated user's preferences (or {} if none)
// PUT  — upsert the authenticated user's preferences (full replace)

import { NextResponse } from "next/server"
import { getCurrentUserId } from "@/lib/auth"
import { neonQuery } from "@/lib/neonClient"
import type { UserPreferences } from "@/lib/types/user-preferences"

// ---------------------------------------------------------------------------
// GET /api/user-preferences
// ---------------------------------------------------------------------------
export async function GET() {
  try {
    const userId = await getCurrentUserId()

    const rows = await neonQuery<{ preferences: UserPreferences }>(
      "SELECT preferences FROM user_preferences WHERE user_id = $1",
      [userId]
    )

    const preferences: UserPreferences = rows[0]?.preferences ?? {}

    return NextResponse.json({ preferences })
  } catch (error: any) {
    if (error?.message?.includes("Unauthorized")) {
      return NextResponse.json({ preferences: {} }, { status: 401 })
    }
    console.error("[user-preferences] GET error:", error)
    return NextResponse.json(
      { error: "Failed to load preferences" },
      { status: 500 }
    )
  }
}

// ---------------------------------------------------------------------------
// PUT /api/user-preferences
// ---------------------------------------------------------------------------
export async function PUT(request: Request) {
  try {
    const userId = await getCurrentUserId()

    const body = await request.json()
    const preferences: UserPreferences = body?.preferences

    if (!preferences || typeof preferences !== "object") {
      return NextResponse.json(
        { error: "Missing or invalid preferences object" },
        { status: 400 }
      )
    }

    // Full-replace upsert — the client always sends the complete state.
    await neonQuery(
      `INSERT INTO user_preferences (user_id, preferences)
       VALUES ($1, $2::jsonb)
       ON CONFLICT (user_id) DO UPDATE
       SET preferences = $2::jsonb`,
      [userId, JSON.stringify(preferences)]
    )

    return NextResponse.json({ ok: true })
  } catch (error: any) {
    if (error?.message?.includes("Unauthorized")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    console.error("[user-preferences] PUT error:", error)
    return NextResponse.json(
      { error: "Failed to save preferences" },
      { status: 500 }
    )
  }
}
