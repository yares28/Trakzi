import { NextResponse } from "next/server"

import { getCurrentUserId } from "@/lib/auth"
import { neonQuery } from "@/lib/neonClient"

type FileRow = {
  id: string
  file_name: string
  mime_type: string
  source: string | null
  created_at: string
}

export const GET = async () => {
  try {
    const userId = await getCurrentUserId()

    // Query files from user_files table - using actual schema columns
    const files = await neonQuery<FileRow>(
      `
        SELECT 
          id,
          file_name,
          mime_type,
          source,
          created_at
        FROM user_files
        WHERE user_id = $1
        ORDER BY created_at DESC
      `,
      [userId]
    )

    const payload = files.map((file) => ({
      id: file.id,
      fileName: file.file_name,
      mimeType: file.mime_type,
      source: file.source || 'Upload',
      uploadedAt:
        typeof file.created_at === "string"
          ? file.created_at
          : new Date(file.created_at).toISOString(),
    }))

    // Add caching headers
    return NextResponse.json(payload, {
      headers: {
        'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=300',
      },
    })
  } catch (error: any) {
    console.error("[Files API] Error:", error)

    // User-friendly error messages
    if (error.message?.includes("Unauthorized")) {
      return NextResponse.json(
        { error: "Please sign in to view your files." },
        { status: 401 }
      )
    }

    // Return empty array for "relation does not exist" errors (table not created yet)
    if (error.message?.includes("does not exist")) {
      return NextResponse.json([], {
        headers: {
          'Cache-Control': 'public, s-maxage=60',
        },
      })
    }

    return NextResponse.json(
      { error: "Unable to load your files. Please try again." },
      { status: 500 }
    )
  }
}
