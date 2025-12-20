import { neonQuery } from "@/lib/neonClient"

export type TransactionCategoryPreferenceRow = {
  description_key: string
  example_description: string | null
  category_id: number
  category_name: string | null
}

let ensurePreferencesSchemaPromise: Promise<void> | null = null

export async function ensureTransactionCategoryPreferencesSchema(): Promise<void> {
  if (ensurePreferencesSchemaPromise) return ensurePreferencesSchemaPromise

  ensurePreferencesSchemaPromise = (async () => {
    try {
      await neonQuery(
        `
          CREATE TABLE IF NOT EXISTS transaction_category_preferences (
            id SERIAL PRIMARY KEY,
            user_id TEXT NOT NULL,
            description_key TEXT NOT NULL,
            example_description TEXT NULL,
            category_id INTEGER NOT NULL,
            use_count INTEGER NOT NULL DEFAULT 0,
            last_used_at TIMESTAMPTZ NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
          )
        `,
        []
      )

      await neonQuery(
        `
          CREATE UNIQUE INDEX IF NOT EXISTS transaction_category_preferences_unique
          ON transaction_category_preferences (user_id, description_key)
        `,
        []
      )
    } catch (error) {
      ensurePreferencesSchemaPromise = null
      throw error
    }
  })()

  return ensurePreferencesSchemaPromise
}

export function normalizeTransactionDescriptionKey(description: string): string {
  const trimmed = description.trim()
  if (!trimmed) return ""

  return trimmed
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\b\d{1,4}[/-]\d{1,2}[/-]\d{1,4}\b/g, " ")
    .replace(/\b\d+(?:[.,]\d+)?\b/g, " ")
    .replace(/\b(eur|usd|gbp|mxn|ars|cop|brl|chf|cad|aud|nzd)\b/g, " ")
    .replace(/\b(pos|tpv|tarjeta|card|debito|credito)\b/g, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 160)
}

export async function getTransactionCategoryPreferences(params: {
  userId: string
  limit?: number
}): Promise<TransactionCategoryPreferenceRow[]> {
  await ensureTransactionCategoryPreferencesSchema()

  const limit = Math.min(Math.max(params.limit ?? 500, 1), 2000)

  return neonQuery<TransactionCategoryPreferenceRow>(
    `
      SELECT
        p.description_key,
        p.example_description,
        p.category_id,
        c.name as category_name
      FROM transaction_category_preferences p
      LEFT JOIN categories c ON c.id = p.category_id
      WHERE p.user_id = $1
      ORDER BY p.updated_at DESC
      LIMIT $2
    `,
    [params.userId, limit]
  )
}

export async function upsertTransactionCategoryPreferences(params: {
  userId: string
  entries: Array<{ description: string; categoryId: number }>
}): Promise<void> {
  await ensureTransactionCategoryPreferencesSchema()

  const deduped = new Map<
    string,
    { descriptionKey: string; exampleDescription: string | null; categoryId: number }
  >()

  for (const entry of params.entries) {
    const categoryId = entry.categoryId
    if (!Number.isFinite(categoryId) || categoryId <= 0) continue

    const descriptionKey = normalizeTransactionDescriptionKey(entry.description)
    if (!descriptionKey) continue

    const exampleDescription = entry.description.trim().slice(0, 160) || null
    deduped.set(descriptionKey, { descriptionKey, exampleDescription, categoryId })
  }

  const rows = Array.from(deduped.values())
  if (rows.length === 0) return

  const singleUpsertQuery = `
    INSERT INTO transaction_category_preferences (
      user_id,
      description_key,
      example_description,
      category_id,
      use_count,
      last_used_at,
      updated_at
    )
    VALUES ($1, $2, $3, $4, 1, now(), now())
    ON CONFLICT (user_id, description_key)
    DO UPDATE SET
      category_id = EXCLUDED.category_id,
      example_description = EXCLUDED.example_description,
      use_count = transaction_category_preferences.use_count + 1,
      last_used_at = now(),
      updated_at = now()
  `

  const chunkSize = 200
  for (let start = 0; start < rows.length; start += chunkSize) {
    const chunk = rows.slice(start, start + chunkSize)
    const valuesClause = chunk
      .map((_, index) => {
        const base = index * 4
        return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, 1, now(), now())`
      })
      .join(", ")

    const paramsList: Array<string | number | null> = []
    chunk.forEach((row) => {
      paramsList.push(params.userId, row.descriptionKey, row.exampleDescription, row.categoryId)
    })

    try {
      await neonQuery(
        `
          INSERT INTO transaction_category_preferences (
            user_id,
            description_key,
            example_description,
            category_id,
            use_count,
            last_used_at,
            updated_at
          )
          VALUES ${valuesClause}
          ON CONFLICT (user_id, description_key)
          DO UPDATE SET
            category_id = EXCLUDED.category_id,
            example_description = EXCLUDED.example_description,
            use_count = transaction_category_preferences.use_count + 1,
            last_used_at = now(),
            updated_at = now()
        `,
        paramsList
      )
    } catch {
      for (const row of chunk) {
        try {
          await neonQuery(singleUpsertQuery, [
            params.userId,
            row.descriptionKey,
            row.exampleDescription,
            row.categoryId,
          ])
        } catch {
          // Ignore
        }
      }
    }
  }
}
