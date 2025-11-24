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

    const [inserted] = await neonInsert("user_files", {
        user_id: userId,
        file_name: fileName,
        mime_type: mimeType,
        extension,
        size_bytes: sizeBytes,
        data: hexData,
        checksum,
        source: params.source ?? "upload",
        statement_id: params.statementId ?? null
    });

    return inserted; // contains id, etc.
}
