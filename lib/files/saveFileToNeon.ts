// lib/files/saveFileToNeon.ts
import crypto from "crypto";
import { neonInsert } from "../neonClient";
import { getCurrentUserId } from "../auth";

export async function saveFileToNeon(params: {
    file: File;
    source?: string;
    statementId?: number;
}) {
    const userId = await getCurrentUserId();

    const arrayBuffer = await params.file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const hexData = "\\x" + buffer.toString("hex");
    const checksum = crypto.createHash("sha256").update(buffer).digest("hex");

    const fileName = params.file.name;
    const sizeBytes = params.file.size;
    const mimeType = params.file.type || "application/octet-stream";
    const extension = fileName.split(".").pop()?.toLowerCase() ?? null;

    const result = await neonInsert("user_files", {
        user_id: userId,
        file_name: fileName,
        mime_type: mimeType,
        extension,
        size_bytes: sizeBytes,
        data: hexData,
        checksum,
        source: params.source ?? "upload",
        statement_id: params.statementId ?? null
    }) as Array<{
        id: string
        user_id: string
        file_name: string
        mime_type: string
        extension: string | null
        size_bytes: number
        data: string
        checksum: string
        source: string | null
        statement_id: number | null
        uploaded_at: string
        raw_format: string | null
        bank_name: string | null
        account_name: string | null
    }>;

    if (!result || result.length === 0) {
        throw new Error("Failed to save file to database");
    }

    return result[0]; // contains id, etc.
}
