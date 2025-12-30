import { neonInsert, neonQuery } from "@/lib/neonClient"

export type AiCategoryFeedbackScope = "receipt" | "transaction"

export type AiCategoryFeedbackEntry = {
  userId: string
  scope: AiCategoryFeedbackScope
  inputText?: string | null
  rawCategory?: string | null
  normalizedCategory?: string | null
  locale?: string | null
  storeName?: string | null
  receiptFileName?: string | null
}

let ensureAiCategoryFeedbackSchemaPromise: Promise<void> | null = null

async function ensureAiCategoryFeedbackSchema(): Promise<void> {
  if (ensureAiCategoryFeedbackSchemaPromise) return ensureAiCategoryFeedbackSchemaPromise

  ensureAiCategoryFeedbackSchemaPromise = (async () => {
    try {
      await neonQuery(
        `
          CREATE TABLE IF NOT EXISTS ai_category_feedback (
            id SERIAL PRIMARY KEY,
            user_id TEXT NOT NULL,
            scope TEXT NOT NULL,
            input_text TEXT NULL,
            raw_category TEXT NULL,
            normalized_category TEXT NULL,
            locale TEXT NULL,
            store_name TEXT NULL,
            receipt_file_name TEXT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now()
          )
        `,
        []
      )

      await neonQuery(
        `
          CREATE INDEX IF NOT EXISTS ai_category_feedback_user_scope_idx
          ON ai_category_feedback (user_id, scope, created_at DESC)
        `,
        []
      )
    } catch (error) {
      ensureAiCategoryFeedbackSchemaPromise = null
      throw error
    }
  })()

  return ensureAiCategoryFeedbackSchemaPromise
}

function truncate(value: string | null | undefined, limit: number): string | null {
  if (!value) return null
  const trimmed = value.trim()
  if (!trimmed) return null
  return trimmed.length > limit ? trimmed.slice(0, limit) : trimmed
}

export async function logAiCategoryFeedbackBatch(entries: AiCategoryFeedbackEntry[]): Promise<void> {
  if (!entries.length) return

  try {
    await ensureAiCategoryFeedbackSchema()
  } catch {
    return
  }

  const rows = entries.map((entry) => ({
    user_id: entry.userId,
    scope: entry.scope,
    input_text: truncate(entry.inputText ?? null, 240),
    raw_category: truncate(entry.rawCategory ?? null, 120),
    normalized_category: truncate(entry.normalizedCategory ?? null, 120),
    locale: truncate(entry.locale ?? null, 16),
    store_name: truncate(entry.storeName ?? null, 120),
    receipt_file_name: truncate(entry.receiptFileName ?? null, 120),
  }))

  try {
    await neonInsert("ai_category_feedback", rows, { returnRepresentation: false })
  } catch (error) {
    console.warn("[AI Category Feedback] Insert failed:", error)
  }
}
