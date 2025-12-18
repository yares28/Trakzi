// app/api/debug/sync-user/route.ts
// Debug endpoint to manually sync the current user to the database
// This helps diagnose user sync issues

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { neonQuery } from '@/lib/neonClient';
import { ensureUserExists } from '@/lib/user-sync';

export async function GET() {
    const { userId } = await auth();

    if (!userId) {
        return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    try {
        // Try to sync the user
        const syncedUserId = await ensureUserExists();

        // Check if user exists in database now
        const users = await neonQuery<{ id: string; email: string; name: string }>(
            `SELECT id, email, name FROM users WHERE id = $1`,
            [userId]
        );

        return NextResponse.json({
            success: true,
            clerkUserId: userId,
            syncedUserId,
            userInDatabase: users[0] || null,
        });
    } catch (error: any) {
        return NextResponse.json({
            success: false,
            clerkUserId: userId,
            error: error.message,
            stack: error.stack,
        }, { status: 500 });
    }
}
