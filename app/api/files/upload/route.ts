// app/api/files/upload/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth";
import { saveFileToNeon } from "@/lib/files/saveFileToNeon";
import { checkRateLimit, createRateLimitResponse } from "@/lib/security/rate-limiter";

// 10MB cap — same as the other parse routes. Files larger than this are almost
// always misuse (image dumps, padded payloads) rather than legitimate uploads.
const MAX_FILE_SIZE = 10 * 1024 * 1024;

// MIME whitelist. The body of an uploaded file is stored as BYTEA in Postgres,
// so every accepted upload costs Neon storage indefinitely. Restricting to the
// types that legitimate flows produce (statement files, receipt images) keeps
// the surface area tight without affecting real users.
const ALLOWED_MIME_PREFIXES = ["image/"];
const ALLOWED_MIME_EXACT = new Set([
    "application/pdf",
    "text/csv",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);

function isAllowedMime(mime: string): boolean {
    if (!mime) return false;
    const lower = mime.toLowerCase();
    if (ALLOWED_MIME_EXACT.has(lower)) return true;
    return ALLOWED_MIME_PREFIXES.some((p) => lower.startsWith(p));
}

export const POST = async (req: NextRequest) => {
    // Authenticate first — throws 401 before any body parsing.
    const userId = await getCurrentUserId();

    // Rate limit second. This endpoint writes BYTEA rows to Postgres; without a
    // limiter a single attacker could mass-upload to inflate storage cost and
    // function-invocation duration during the Product Hunt launch window.
    const rl = await checkRateLimit(userId, "upload");
    if (rl.limited) return createRateLimitResponse(rl.resetIn);

    const formData = await req.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
        return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
            { error: "File too large. Maximum size is 10MB." },
            { status: 413 }
        );
    }

    if (!isAllowedMime(file.type)) {
        return NextResponse.json(
            { error: `Unsupported file type: ${file.type || "unknown"}` },
            { status: 415 }
        );
    }

    try {
        const stored = await saveFileToNeon({ file, source: "manual-upload" });
        return NextResponse.json({ fileId: stored.id, stored }, { status: 201 });
    } catch (err: any) {
        console.error(err);
        return NextResponse.json({ error: "File upload failed. Please try again." }, { status: 500 });
    }
};
