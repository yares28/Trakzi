import { neonQuery } from "@/lib/neonClient"
import { normalizeReceiptStoreKey } from "@/lib/receipts/item-category-preferences"

export type ReceiptStoreLanguagePreferenceRow = {
  store_key: string
  store_name: string | null
  language: string
}

let ensureReceiptStoreLanguageSchemaPromise: Promise<void> | null = null

async function ensureReceiptStoreLanguageSchema(): Promise<void> {
  if (ensureReceiptStoreLanguageSchemaPromise) return ensureReceiptStoreLanguageSchemaPromise

  ensureReceiptStoreLanguageSchemaPromise = (async () => {
    try {
      await neonQuery(
        `
          CREATE TABLE IF NOT EXISTS receipt_store_language_preferences (
            id SERIAL PRIMARY KEY,
            user_id TEXT NOT NULL,
            store_key TEXT NOT NULL,
            store_name TEXT NULL,
            language TEXT NOT NULL,
            use_count INTEGER NOT NULL DEFAULT 0,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
          )
        `,
        []
      )

      await neonQuery(
        `
          CREATE UNIQUE INDEX IF NOT EXISTS receipt_store_language_preferences_unique
          ON receipt_store_language_preferences (user_id, store_key)
        `,
        []
      )
    } catch (error) {
      ensureReceiptStoreLanguageSchemaPromise = null
      throw error
    }
  })()

  return ensureReceiptStoreLanguageSchemaPromise
}

export async function getReceiptStoreLanguagePreferences(params: {
  userId: string
  limit?: number
}): Promise<ReceiptStoreLanguagePreferenceRow[]> {
  await ensureReceiptStoreLanguageSchema()

  const limit = Math.min(Math.max(params.limit ?? 200, 1), 1000)

  return neonQuery<ReceiptStoreLanguagePreferenceRow>(
    `
      SELECT store_key, store_name, language
      FROM receipt_store_language_preferences
      WHERE user_id = $1
      ORDER BY updated_at DESC
      LIMIT $2
    `,
    [params.userId, limit]
  )
}

export async function getReceiptStoreLanguagePreference(params: {
  userId: string
  storeName: string | null | undefined
}): Promise<ReceiptStoreLanguagePreferenceRow | null> {
  const storeKey = normalizeReceiptStoreKey(params.storeName ?? "")
  if (!storeKey) return null

  await ensureReceiptStoreLanguageSchema()

  const rows = await neonQuery<ReceiptStoreLanguagePreferenceRow>(
    `
      SELECT store_key, store_name, language
      FROM receipt_store_language_preferences
      WHERE user_id = $1 AND store_key = $2
      LIMIT 1
    `,
    [params.userId, storeKey]
  )

  return rows[0] ?? null
}

export async function upsertReceiptStoreLanguagePreference(params: {
  userId: string
  storeName: string
  language: string
}): Promise<void> {
  const storeName = params.storeName.trim()
  const storeKey = normalizeReceiptStoreKey(storeName)
  if (!storeKey) return

  await ensureReceiptStoreLanguageSchema()

  const language = params.language.trim().toLowerCase()
  if (!language || language === "auto") {
    await neonQuery(
      `
        DELETE FROM receipt_store_language_preferences
        WHERE user_id = $1 AND store_key = $2
      `,
      [params.userId, storeKey]
    )
    return
  }

  await neonQuery(
    `
      INSERT INTO receipt_store_language_preferences (
        user_id,
        store_key,
        store_name,
        language,
        use_count,
        updated_at
      )
      VALUES ($1, $2, $3, $4, 1, now())
      ON CONFLICT (user_id, store_key)
      DO UPDATE SET
        language = EXCLUDED.language,
        store_name = EXCLUDED.store_name,
        use_count = receipt_store_language_preferences.use_count + 1,
        updated_at = now()
    `,
    [params.userId, storeKey, storeName, language]
  )
}
