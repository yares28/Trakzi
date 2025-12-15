import { NextRequest, NextResponse } from "next/server"

import { getCurrentUserId } from "@/lib/auth"
import { neonQuery } from "@/lib/neonClient"

function toNumber(value: unknown): number {
  if (typeof value === "number") return value
  if (typeof value === "string") {
    const normalized = value.replace(",", ".").replace(/[^0-9.+-]/g, "")
    const parsed = Number(normalized)
    return Number.isFinite(parsed) ? parsed : 0
  }
  return 0
}

export const PATCH = async (
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) => {
  try {
    const userId = await getCurrentUserId()
    const { id } = await context.params
    const receiptTransactionId = Number.parseInt(id, 10)

    if (!Number.isFinite(receiptTransactionId)) {
      return NextResponse.json({ error: "Invalid receipt transaction id" }, { status: 400 })
    }

    const body = await req.json().catch(() => ({}))
    if (body?.quantity === undefined) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 })
    }

    const nextQuantity = toNumber(body.quantity)

    if (!Number.isFinite(nextQuantity) || nextQuantity <= 0) {
      return NextResponse.json({ error: "quantity must be > 0" }, { status: 400 })
    }

    const updated = await neonQuery<{
      id: number
      quantity: string | number
      price_per_unit: string | number
      total_price: string | number
    }>(
      `
        UPDATE receipt_transactions
        SET quantity = $3,
            total_price = ROUND((COALESCE(price_per_unit, 0) * $3)::numeric, 2)
        WHERE id = $1 AND user_id = $2
        RETURNING id, quantity, price_per_unit, total_price
      `,
      [receiptTransactionId, userId, nextQuantity]
    )

    if (updated.length === 0) {
      return NextResponse.json({ error: "Receipt transaction not found" }, { status: 404 })
    }

    return NextResponse.json(
      {
        id: updated[0].id,
        quantity: toNumber(updated[0].quantity),
        pricePerUnit: toNumber(updated[0].price_per_unit),
        totalPrice: toNumber(updated[0].total_price),
      },
      { headers: { "Cache-Control": "no-store" } }
    )
  } catch (error: any) {
    const message = String(error?.message || "")
    if (message.includes("Unauthorized")) {
      return NextResponse.json({ error: "Please sign in to update receipt items." }, { status: 401 })
    }

    console.error("[Receipt Transaction API] PATCH error:", error)
    return NextResponse.json({ error: "Failed to update receipt transaction" }, { status: 500 })
  }
}
