import { NextResponse } from "next/server"

import { getCurrentUserId } from "@/lib/auth"
import { neonQuery } from "@/lib/neonClient"

type FileRow = {
  id: string
  file_name: string
  mime_type: string
  extension: string | null
  size_bytes: number
  source: string | null
  uploaded_at: string
  raw_format: string | null
  bank_name: string | null
  account_name: string | null
}

export const GET = async () => {
  try {
    const userId = await getCurrentUserId()

    const files = await neonQuery<FileRow>(
      `
        SELECT 
          uf.id,
          uf.file_name,
          uf.mime_type,
          uf.extension,
          uf.size_bytes,
          uf.source,
          uf.uploaded_at,
          s.raw_format,
          s.bank_name,
          s.account_name
        FROM user_files uf
        LEFT JOIN statements s ON s.id = uf.statement_id
        WHERE uf.user_id = $1
        ORDER BY uf.uploaded_at DESC
      `,
      [userId]
    )

    const payload = files.map((file) => ({
      id: file.id,
      fileName: file.file_name,
      mimeType: file.mime_type,
      extension: file.extension,
      sizeBytes: Number(file.size_bytes),
      source: file.source,
      uploadedAt:
        typeof file.uploaded_at === "string"
          ? file.uploaded_at
          : new Date(file.uploaded_at).toISOString(),
      rawFormat: file.raw_format,
      bankName: file.bank_name,
      accountName: file.account_name,
    }))

    // Add caching headers - files change infrequently
    // Cache for 2 minutes, revalidate in background
    return NextResponse.json(payload, {
      headers: {
        'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=300',
      },
    })
  } catch (error) {
    console.error("[Files API] Error:", error)
    return NextResponse.json({ error: "Failed to load files" }, { status: 500 })
  }
}
















