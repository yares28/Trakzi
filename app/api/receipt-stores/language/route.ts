import { NextRequest, NextResponse } from "next/server"

import { getCurrentUserId } from "@/lib/auth"
import {
  getReceiptStoreLanguagePreference,
  upsertReceiptStoreLanguagePreference,
} from "@/lib/receipts/receipt-store-language-preferences"

const SUPPORTED_LANGUAGES = new Set(["auto", "es", "en", "pt", "fr", "it", "de", "nl", "ca"])

export const GET = async (req: NextRequest) => {
  try {
    const userId = await getCurrentUserId()
    const storeName = req.nextUrl.searchParams.get("storeName")?.trim() ?? ""

    if (!storeName) {
      return NextResponse.json({ language: null }, { headers: { "Cache-Control": "no-store" } })
    }

    const preference = await getReceiptStoreLanguagePreference({
      userId,
      storeName,
    })

    return NextResponse.json(
      {
        storeName,
        language: preference?.language ?? null,
      },
      { headers: { "Cache-Control": "no-store" } }
    )
  } catch (error: any) {
    const message = String(error?.message || "")
    if (message.includes("Unauthorized")) {
      return NextResponse.json({ error: "Please sign in to view preferences." }, { status: 401 })
    }

    console.error("[Receipt Store Language API] Error:", error)
    return NextResponse.json({ error: "Failed to load store language preference" }, { status: 500 })
  }
}

export const POST = async (req: NextRequest) => {
  try {
    const userId = await getCurrentUserId()
    const body = await req.json().catch(() => ({}))
    const storeName = typeof body?.storeName === "string" ? body.storeName.trim() : ""
    const language = typeof body?.language === "string" ? body.language.trim().toLowerCase() : ""

    if (!storeName) {
      return NextResponse.json({ error: "Missing storeName" }, { status: 400 })
    }

    if (!SUPPORTED_LANGUAGES.has(language)) {
      return NextResponse.json({ error: "Unsupported language" }, { status: 400 })
    }

    await upsertReceiptStoreLanguagePreference({
      userId,
      storeName,
      language,
    })

    return NextResponse.json(
      { storeName, language },
      { headers: { "Cache-Control": "no-store" } }
    )
  } catch (error: any) {
    const message = String(error?.message || "")
    if (message.includes("Unauthorized")) {
      return NextResponse.json({ error: "Please sign in to update preferences." }, { status: 401 })
    }

    console.error("[Receipt Store Language API] Error:", error)
    return NextResponse.json({ error: "Failed to update store language preference" }, { status: 500 })
  }
}
