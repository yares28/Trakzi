import { NextRequest, NextResponse } from "next/server"

import { getCurrentUserId } from "@/lib/auth"
import { verifyRoomMember } from "@/lib/rooms/permissions"
import { parseCsvToRows } from "@/lib/parsing/parseCsvToRows"

const MAX_FILE_BYTES = 20 * 1024 * 1024 // 20 MB

// POST /api/rooms/[roomId]/transactions/parse-statement
// Upload a bank statement (CSV, XLSX, or PDF), parse it, return transaction rows (no DB write).
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

        if (file.size > MAX_FILE_BYTES) {
            return NextResponse.json(
                { success: false, error: "File too large. Maximum size is 20 MB." },
                { status: 400 }
            )
        }

        const mimeType = (file.type || "").toLowerCase()
        const ext = file.name.split(".").pop()?.toLowerCase() ?? ""
        const isCsv = mimeType === "text/csv" || ext === "csv"
        const isXlsx = mimeType.includes("spreadsheet") || mimeType.includes("excel") || ext === "xlsx" || ext === "xls"
        const isPdf = mimeType === "application/pdf" || ext === "pdf"

        if (!isCsv && !isXlsx && !isPdf) {
            return NextResponse.json(
                { success: false, error: "Unsupported file type. Use CSV, XLSX, or PDF." },
                { status: 400 }
            )
        }

        let csvText: string

        if (isCsv) {
            csvText = await file.text()
        } else if (isXlsx) {
            // Convert XLSX to CSV using the xlsx library
            const arrayBuffer = await file.arrayBuffer()
            const XLSX = await import("xlsx")
            const workbook = XLSX.read(arrayBuffer, { type: "array" })
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
            csvText = XLSX.utils.sheet_to_csv(firstSheet)
        } else {
            // PDF: extract text using unpdf
            const arrayBuffer = await file.arrayBuffer()
            const { extractText } = await import("unpdf")
            const result = await extractText(new Uint8Array(arrayBuffer))
            const pages = result.text || []
            csvText = Array.isArray(pages) ? pages.join("\n") : String(pages)
        }

        if (!csvText.trim()) {
            return NextResponse.json(
                { success: false, error: "Could not extract text from the file." },
                { status: 422 }
            )
        }

        const { rows, diagnostics } = parseCsvToRows(csvText, { returnDiagnostics: true })

        const parsedRows = rows.map(row => ({
            date: row.date,
            description: row.summary ?? row.description,
            amount: row.amount,
            category: row.category ?? null,
        }))

        return NextResponse.json({
            success: true,
            data: {
                rows: parsedRows,
                diagnostics: {
                    totalRows: diagnostics.totalRowsInFile,
                    validRows: diagnostics.rowsAfterFiltering,
                    warnings: diagnostics.warnings,
                },
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
            { success: false, error: "Failed to parse statement" },
            { status: 500 }
        )
    }
}
