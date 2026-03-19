// app/api/files/upload/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth";
import { saveFileToNeon } from "@/lib/files/saveFileToNeon";

export const POST = async (req: NextRequest) => {
    await getCurrentUserId(); // Throws 401 before parsing body if unauthenticated

    const formData = await req.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
        return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    try {
        const stored = await saveFileToNeon({ file, source: "manual-upload" });
        return NextResponse.json({ fileId: stored.id, stored }, { status: 201 });
    } catch (err: any) {
        console.error(err);
        return NextResponse.json({ error: "File upload failed. Please try again." }, { status: 500 });
    }
};
