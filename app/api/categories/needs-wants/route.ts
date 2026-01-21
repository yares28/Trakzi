"use server"

import { NextRequest, NextResponse } from "next/server"

import { getCurrentUserId } from "@/lib/auth"
import { neonQuery } from "@/lib/neonClient"
import { invalidateUserCachePrefix } from "@/lib/cache/upstash"

type SpendingTier = "Essentials" | "Mandatory" | "Wants" | "Other"

type CategoryTierRow = {
  id: number
  name: string
  broad_type: string | null
}

export const GET = async () => {
  try {
    const userId = await getCurrentUserId()

    const rows = await neonQuery<CategoryTierRow>(
      `
        SELECT 
          c.id,
          c.name,
          c.broad_type
        FROM categories c
        WHERE c.user_id = $1
        ORDER BY c.name ASC
      `,
      [userId],
    )

    const payload = rows.map((row) => {
      const bt = row.broad_type
      const tier: SpendingTier | null =
        bt === "Essentials" ||
        bt === "Mandatory" ||
        bt === "Wants" ||
        bt === "Other"
          ? bt
          : null

      return {
        id: row.id,
        name: row.name,
        tier,
      }
    })

    return NextResponse.json(payload, {
      headers: {
        "Cache-Control": "no-store",
      },
    })
  } catch (error: any) {
    const message = String(error?.message || "")
    if (message.toLowerCase().includes("unauthorized") || message.toLowerCase().includes("sign in")) {
      return NextResponse.json({ error: "Please sign in to manage category tiers." }, { status: 401 })
    }

    console.error("[Categories Needs/Wants API] GET error:", error)
    return NextResponse.json({ error: "Failed to load category tiers" }, { status: 500 })
  }
}

export const PATCH = async (req: NextRequest) => {
  try {
    const userId = await getCurrentUserId()
    const body = await req.json().catch(() => ({}))

    const id = Number(body?.id)
    const tier = body?.tier as SpendingTier | null

    if (!Number.isFinite(id) || id <= 0) {
      return NextResponse.json({ error: "Invalid category id" }, { status: 400 })
    }

    if (
      tier !== "Essentials" &&
      tier !== "Mandatory" &&
      tier !== "Wants" &&
      tier !== "Other"
    ) {
      return NextResponse.json({ error: "Invalid tier value" }, { status: 400 })
    }

    const rows = await neonQuery<CategoryTierRow>(
      `
        UPDATE categories
        SET broad_type = $3,
            updated_at = now()
        WHERE id = $1 AND user_id = $2
        RETURNING id, name, broad_type
      `,
      [id, userId, tier],
    )

    if (rows.length === 0) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 })
    }

    // Invalidate cached analytics so Needs vs Wants recomputes with new mapping
    invalidateUserCachePrefix(userId, "analytics").catch((err) => {
      console.error("[Categories Needs/Wants API] Analytics cache invalidation error:", err)
    })

    const updated = rows[0]
    return NextResponse.json(
      {
        id: updated.id,
        name: updated.name,
        tier: updated.broad_type as SpendingTier,
      },
      { status: 200 },
    )
  } catch (error: any) {
    const message = String(error?.message || "")
    if (message.toLowerCase().includes("unauthorized") || message.toLowerCase().includes("sign in")) {
      return NextResponse.json({ error: "Please sign in to manage category tiers." }, { status: 401 })
    }

    console.error("[Categories Needs/Wants API] PATCH error:", error)
    return NextResponse.json({ error: "Failed to update category tier" }, { status: 500 })
  }
}

