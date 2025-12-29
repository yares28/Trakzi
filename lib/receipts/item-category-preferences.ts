import { neonQuery } from "@/lib/neonClient"

export type ReceiptItemCategoryPreferenceRow = {
  store_key: string
  description_key: string
  category_id: number
}

let ensurePreferencesSchemaPromise: Promise<void> | null = null

export async function ensureReceiptItemCategoryPreferencesSchema(): Promise<void> {
  if (ensurePreferencesSchemaPromise) return ensurePreferencesSchemaPromise

  ensurePreferencesSchemaPromise = (async () => {
    try {
      await neonQuery(
        `
          CREATE TABLE IF NOT EXISTS receipt_item_category_preferences (
            id SERIAL PRIMARY KEY,
            user_id TEXT NOT NULL,
            store_key TEXT NOT NULL,
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
          CREATE UNIQUE INDEX IF NOT EXISTS receipt_item_category_preferences_unique
          ON receipt_item_category_preferences (user_id, store_key, description_key)
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

export function normalizeReceiptStoreKey(storeName: string | null | undefined): string {
  return (storeName ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .slice(0, 120)
}

export function normalizeReceiptItemDescriptionKey(description: string): string {
  const trimmed = description.trim()
  if (!trimmed) return ""

  return trimmed
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\b\d+(?:[.,]\d+)?\b/g, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\b(kg|g|gr|l|ml|cl|oz|lb|x|pcs|pc|uds|ud|unit|units)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 160)
}

export async function getReceiptItemCategoryPreferences(params: {
  userId: string
  limit?: number
}): Promise<ReceiptItemCategoryPreferenceRow[]> {
  await ensureReceiptItemCategoryPreferencesSchema()

  const limit = Math.min(Math.max(params.limit ?? 500, 1), 2000)

  return neonQuery<ReceiptItemCategoryPreferenceRow>(
    `
      SELECT store_key, description_key, category_id
      FROM receipt_item_category_preferences
      WHERE user_id = $1
      ORDER BY updated_at DESC
      LIMIT $2
    `,
    [params.userId, limit]
  )
}

export async function upsertReceiptItemCategoryPreferences(params: {
  userId: string
  storeName: string | null
  entries: Array<{ description: string; categoryId: number }>
}): Promise<void> {
  await ensureReceiptItemCategoryPreferencesSchema()

  const storeKey = normalizeReceiptStoreKey(params.storeName)

  const deduped = new Map<
    string,
    { storeKey: string; descriptionKey: string; exampleDescription: string | null; categoryId: number }
  >()

  for (const entry of params.entries) {
    const categoryId = entry.categoryId
    if (!Number.isFinite(categoryId) || categoryId <= 0) continue

    const descriptionKey = normalizeReceiptItemDescriptionKey(entry.description)
    if (!descriptionKey) continue

    const exampleDescription = entry.description.trim().slice(0, 160) || null
    const storeKeysToWrite = storeKey ? [storeKey, ""] : [""]

    for (const key of storeKeysToWrite) {
      deduped.set(`${key}::${descriptionKey}`, {
        storeKey: key,
        descriptionKey,
        exampleDescription,
        categoryId,
      })
    }
  }

  const rows = Array.from(deduped.values())
  if (rows.length === 0) return

  const singleUpsertQuery = `
    INSERT INTO receipt_item_category_preferences (
      user_id,
      store_key,
      description_key,
      example_description,
      category_id,
      use_count,
      last_used_at,
      updated_at
    )
    VALUES ($1, $2, $3, $4, $5, 1, now(), now())
    ON CONFLICT (user_id, store_key, description_key)
    DO UPDATE SET
      category_id = EXCLUDED.category_id,
      example_description = EXCLUDED.example_description,
      use_count = receipt_item_category_preferences.use_count + 1,
      last_used_at = now(),
      updated_at = now()
  `

  const chunkSize = 200
  for (let start = 0; start < rows.length; start += chunkSize) {
    const chunk = rows.slice(start, start + chunkSize)
    const valuesClause = chunk
      .map((_, index) => {
        const base = index * 5
        return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, 1, now(), now())`
      })
      .join(", ")

    const paramsList: Array<string | number | null> = []
    chunk.forEach((row) => {
      paramsList.push(params.userId, row.storeKey, row.descriptionKey, row.exampleDescription, row.categoryId)
    })

    try {
      await neonQuery(
        `
          INSERT INTO receipt_item_category_preferences (
            user_id,
            store_key,
            description_key,
            example_description,
            category_id,
            use_count,
            last_used_at,
            updated_at
          )
          VALUES ${valuesClause}
          ON CONFLICT (user_id, store_key, description_key)
          DO UPDATE SET
            category_id = EXCLUDED.category_id,
            example_description = EXCLUDED.example_description,
            use_count = receipt_item_category_preferences.use_count + 1,
            last_used_at = now(),
            updated_at = now()
        `,
        paramsList
      )
    } catch {
      // Best-effort: if a bulk upsert fails, fall back to row-by-row attempts.
      for (const row of chunk) {
        try {
          await neonQuery(singleUpsertQuery, [
            params.userId,
            row.storeKey,
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
