import { NextRequest, NextResponse } from "next/server"

import { getCurrentUserId } from "@/lib/auth"
import { verifyRoomMember } from "@/lib/rooms/permissions"
import { parseReceiptFile } from "@/lib/receipts/ingestion"

const MAX_FILE_BYTES = 10 * 1024 * 1024 // 10 MB

function parseNumber(value: unknown): number {
    if (typeof value === "number") return Number.isFinite(value) ? value : 0
    if (typeof value === "string") {
        const normalized = value.replace(",", ".").replace(/[^0-9.+-]/g, "")
        const parsed = Number(normalized)
        return Number.isFinite(parsed) ? parsed : 0
    }
    return 0
}

function normalizeDate(value: unknown): string | null {
    if (typeof value !== "string") return null
    const trimmed = value.trim()
    // YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed
    // DD-MM-YYYY or DD/MM/YYYY
    const ddmm = trimmed.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})$/)
    if (ddmm) {
        const [, day, month, year] = ddmm
        return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`
    }
    return null
}

function todayIso(): string {
    const now = new Date()
    return now.toISOString().slice(0, 10)
}

// POST /api/rooms/[roomId]/transactions/parse-receipt
// Upload a receipt image or PDF, parse it, return items (no DB write).
export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ roomId: string }> }
) {
    try {
        const userId = await getCurrentUserId()
        const { roomId } = await params

        const isMember = await verifyRoomMember(roomId, userId)
        if (!isMember) {
            return NextResponse.json(
                { success: false, error: "Room not found" },
                { status: 404 }
            )
        }

        const formData = await req.formData()
        const file = formData.get("file")
        if (!(file instanceof File)) {
            return NextResponse.json(
                { success: false, error: "No file provided" },
                { status: 400 }
            )
        }

        // Validate file type
        const mimeType = (file.type || "").toLowerCase()
        const ext = file.name.split(".").pop()?.toLowerCase() ?? ""
        const isImage = mimeType.startsWith("image/") || ["jpg", "jpeg", "png", "webp"].includes(ext)
        const isPdf = mimeType === "application/pdf" || ext === "pdf"
        if (!isImage && !isPdf) {
            return NextResponse.json(
                { success: false, error: "Unsupported file type. Use JPG, PNG, WebP, or PDF." },
                { status: 400 }
            )
        }

        // Validate file size
        if (file.size > MAX_FILE_BYTES) {
            return NextResponse.json(
                { success: false, error: "File too large. Maximum size is 10 MB." },
                { status: 400 }
            )
        }

        const arrayBuffer = await file.arrayBuffer()
        const data = new Uint8Array(arrayBuffer)
        const resolvedMime = isPdf ? "application/pdf" : (mimeType || "image/jpeg")

        // Use deterministic parsers only (no AI) — fast and synchronous
        // For unsupported merchants, items will be empty and user can add manually
        const parseResult = await parseReceiptFile({
            data,
            mimeType: resolvedMime,
            fileName: file.name,
            allowedCategories: [],
            // No AI fallbacks — deterministic parsing only for rooms
        })

        const extracted = parseResult.extracted

        const storeName = typeof extracted?.store_name === "string"
            ? extracted.store_name.trim() || null
            : null

        const receiptDateIso = (extracted as any)?.receipt_date_iso
            ?? normalizeDate(extracted?.receipt_date)
            ?? todayIso()

        const totalAmount = extracted?.total_amount != null
            ? parseNumber(extracted.total_amount)
            : null

        const currency = typeof extracted?.currency === "string" && extracted.currency.trim()
            ? extracted.currency.trim().toUpperCase()
            : null

        const rawItems = Array.isArray(extracted?.items) ? extracted.items : []
        const items = rawItems
            .map(item => {
                const name = typeof item?.description === "string" ? item.description.trim() : ""
                if (!name) return null
                const amount = parseNumber(item?.total_price ?? item?.price_per_unit ?? 0)
                const quantity = Math.max(1, Math.round(parseNumber(item?.quantity ?? 1)))
                const category = typeof item?.category === "string" ? item.category.trim() || null : null
                return { name, amount, quantity, category }
            })
            .filter((item): item is NonNullable<typeof item> => item !== null && item.amount > 0)

        const warnings = parseResult.warnings.map(w => w.message)

        return NextResponse.json({
            success: true,
            data: {
                store_name: storeName,
                receipt_date: receiptDateIso,
                total_amount: totalAmount,
                currency,
                items,
                warnings,
            },
        })
    } catch (error: any) {
        if (error.message?.includes("Unauthorized")) {
            return NextResponse.json(
                { success: false, error: "Unauthorized" },
                { status: 401 }
            )
        }
        return NextResponse.json(
            { success: false, error: "Failed to parse receipt" },
            { status: 500 }
        )
    }
}
