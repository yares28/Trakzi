// lib/files/saveFileToNeon.ts
import { neonInsert } from "../neonClient";
import { getCurrentUserId } from "../auth";

export async function saveFileToNeon(params: {
    file: File;
    source?: string;
}) {
    const userId = await getCurrentUserId();

    const arrayBuffer = await params.file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const hexData = "\\x" + buffer.toString("hex");

    const fileName = params.file.name;
    const mimeType = params.file.type || "application/octet-stream";

    const [inserted] = await neonInsert<{
        user_id: string;
        file_name: string;
        mime_type: string;
        source: string;
        data: string;
        id?: string;
    }>("user_files", {
        user_id: userId,
        file_name: fileName,
        mime_type: mimeType,
        source: params.source ?? "Upload",
        data: hexData,
    }) as Array<{
        id: string;
        user_id: string;
        file_name: string;
        mime_type: string;
        source: string;
    }>;

    return inserted; // contains id, etc.
}
