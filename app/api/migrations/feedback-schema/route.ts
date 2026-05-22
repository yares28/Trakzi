import { NextResponse } from 'next/server'
import { getCurrentUserId } from '@/lib/auth'
import { isAdminUser } from '@/lib/admin'
import { neonQuery } from '@/lib/neonClient'

export const POST = async () => {
    try {
        const userId = await getCurrentUserId()

        if (!isAdminUser(userId)) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized - admin access required' },
                { status: 403 }
            )
        }

        const steps: { name: string; status: 'ok' | 'skipped' | 'error'; detail?: string }[] = []

        try {
            await neonQuery(`
                CREATE TABLE IF NOT EXISTS feedback_features (
                    id              text PRIMARY KEY DEFAULT gen_random_uuid()::text,
                    user_id         text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    title           text NOT NULL CHECK (char_length(title) BETWEEN 3 AND 100),
                    body            text CHECK (body IS NULL OR char_length(body) <= 1000),
                    upvotes_count   int NOT NULL DEFAULT 0,
                    downvotes_count int NOT NULL DEFAULT 0,
                    score           int GENERATED ALWAYS AS (upvotes_count - downvotes_count) STORED,
                    created_at      timestamptz NOT NULL DEFAULT NOW(),
                    updated_at      timestamptz NOT NULL DEFAULT NOW()
                )
            `)
            await neonQuery(`CREATE INDEX IF NOT EXISTS idx_feedback_features_score ON feedback_features (score DESC, created_at DESC)`)
            await neonQuery(`CREATE INDEX IF NOT EXISTS idx_feedback_features_created ON feedback_features (created_at DESC)`)
            await neonQuery(`CREATE INDEX IF NOT EXISTS idx_feedback_features_user ON feedback_features (user_id)`)
            steps.push({ name: 'feedback_features table', status: 'ok' })
        } catch (err: any) {
            steps.push({ name: 'feedback_features table', status: 'error', detail: err.message })
        }

        try {
            await neonQuery(`
                CREATE TABLE IF NOT EXISTS feedback_votes (
                    feature_id text NOT NULL REFERENCES feedback_features(id) ON DELETE CASCADE,
                    user_id    text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    value      smallint NOT NULL CHECK (value IN (-1, 1)),
                    created_at timestamptz NOT NULL DEFAULT NOW(),
                    PRIMARY KEY (feature_id, user_id)
                )
            `)
            await neonQuery(`CREATE INDEX IF NOT EXISTS idx_feedback_votes_feature_created ON feedback_votes (feature_id, created_at DESC)`)
            await neonQuery(`CREATE INDEX IF NOT EXISTS idx_feedback_votes_user ON feedback_votes (user_id)`)
            steps.push({ name: 'feedback_votes table', status: 'ok' })
        } catch (err: any) {
            steps.push({ name: 'feedback_votes table', status: 'error', detail: err.message })
        }

        const errors = steps.filter(s => s.status === 'error')
        return NextResponse.json({
            success: errors.length === 0,
            steps,
            message: errors.length === 0
                ? 'Migration completed successfully'
                : `Migration completed with ${errors.length} error(s)`,
        })
    } catch (error: any) {
        return NextResponse.json(
            { success: false, error: error.message || 'Migration failed' },
            { status: 500 }
        )
    }
}
