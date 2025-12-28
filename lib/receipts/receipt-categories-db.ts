import { neonInsert, neonQuery } from "@/lib/neonClient"
import {
  DEFAULT_RECEIPT_CATEGORIES,
  DEFAULT_RECEIPT_CATEGORY_TYPES,
} from "@/lib/receipt-categories"

export type ReceiptCategoryTypeRow = {
  id: number
  name: string
  color: string | null
}

export type ReceiptCategoryRow = {
  id: number
  name: string
  color: string | null
  type_id: number
  broad_type: string | null
}

export type ReceiptCategoryWithTypeRow = ReceiptCategoryRow & {
  type_name: string
  type_color: string | null
}

export function normalizeReceiptCategoryName(name: string): string {
  return name.trim().replace(/\s+/g, " ")
}

async function getReceiptCategoryTypes(userId: string): Promise<ReceiptCategoryTypeRow[]> {
  return neonQuery<ReceiptCategoryTypeRow>(
    `SELECT id, name, color FROM receipt_category_types WHERE user_id = $1 ORDER BY name`,
    [userId]
  )
}

async function getReceiptCategories(userId: string): Promise<ReceiptCategoryRow[]> {
  await ensureReceiptCategorySchema()
  return neonQuery<ReceiptCategoryRow>(
    `SELECT id, name, color, type_id, broad_type FROM receipt_categories WHERE user_id = $1 ORDER BY name`,
    [userId]
  )
}

let ensureReceiptCategorySchemaPromise: Promise<void> | null = null
async function ensureReceiptCategorySchema(): Promise<void> {
  if (ensureReceiptCategorySchemaPromise) return ensureReceiptCategorySchemaPromise

  ensureReceiptCategorySchemaPromise = (async () => {
    try {
      await neonQuery(`ALTER TABLE receipt_categories ADD COLUMN IF NOT EXISTS broad_type text`, [])
    } catch (error) {
      ensureReceiptCategorySchemaPromise = null
      throw error
    }
  })()

  return ensureReceiptCategorySchemaPromise
}

export async function ensureReceiptCategoryTypes(userId: string): Promise<ReceiptCategoryTypeRow[]> {
  let types = await getReceiptCategoryTypes(userId)
  const byName = new Map(types.map((type) => [type.name.toLowerCase(), type]))

  if (types.length === 0) {
    const rows = DEFAULT_RECEIPT_CATEGORY_TYPES.map((type) => ({
      user_id: userId,
      name: type.name,
      color: type.color,
    }))
    await neonInsert("receipt_category_types", rows, { returnRepresentation: false })
    types = await getReceiptCategoryTypes(userId)
    return types
  }

  const missing = DEFAULT_RECEIPT_CATEGORY_TYPES.filter(
    (type) => !byName.has(type.name.toLowerCase())
  )
  if (missing.length === 0) return types

  for (const type of missing) {
    try {
      await neonQuery(
        `INSERT INTO receipt_category_types (user_id, name, color) VALUES ($1, $2, $3)`,
        [userId, type.name, type.color]
      )
    } catch {
      // Ignore conflicts; user may have created it concurrently.
    }
  }

  return getReceiptCategoryTypes(userId)
}

export async function ensureReceiptCategories(userId: string): Promise<ReceiptCategoryRow[]> {
  await ensureReceiptCategorySchema()

  const types = await ensureReceiptCategoryTypes(userId)
  const typeIdByName = new Map(types.map((type) => [type.name.toLowerCase(), type.id]))

  let categories = await getReceiptCategories(userId)
  const byName = new Map(categories.map((category) => [category.name.toLowerCase(), category]))

  if (categories.length === 0) {
    const rows = DEFAULT_RECEIPT_CATEGORIES.map((category) => {
      const typeId = typeIdByName.get(category.type.toLowerCase())
      if (!typeId) return null
      return {
        user_id: userId,
        type_id: typeId,
        name: category.name,
        color: category.color,
        broad_type: category.broadType || "Other",
        is_default: true,
      }
    }).filter((row): row is NonNullable<typeof row> => Boolean(row))

    if (rows.length > 0) {
      await neonInsert("receipt_categories", rows, { returnRepresentation: false })
    }

    categories = await getReceiptCategories(userId)
    await backfillReceiptCategoryBroadTypes(userId)
    return categories
  }

  const missing = DEFAULT_RECEIPT_CATEGORIES.filter(
    (category) => !byName.has(category.name.toLowerCase())
  )
  if (missing.length === 0) return categories

  for (const category of missing) {
    const typeId = typeIdByName.get(category.type.toLowerCase())
    if (!typeId) continue
    try {
      await neonQuery(
        `INSERT INTO receipt_categories (user_id, type_id, name, color, broad_type, is_default) VALUES ($1, $2, $3, $4, $5, $6)`,
        [userId, typeId, category.name, category.color, category.broadType || "Other", true]
      )
    } catch {
      // Ignore conflicts; user may have created it concurrently.
    }
  }

  await backfillReceiptCategoryBroadTypes(userId)
  return getReceiptCategories(userId)
}

export async function getReceiptCategoriesWithTypes(userId: string): Promise<ReceiptCategoryWithTypeRow[]> {
  await ensureReceiptCategorySchema()
  return neonQuery<ReceiptCategoryWithTypeRow>(
    `
      SELECT
        rc.id,
        rc.name,
        rc.color,
        rc.type_id,
        rc.broad_type,
        rct.name as type_name,
        rct.color as type_color
      FROM receipt_categories rc
      INNER JOIN receipt_category_types rct ON rc.type_id = rct.id
      WHERE rc.user_id = $1
      ORDER BY rct.name ASC, rc.name ASC
    `,
    [userId]
  )
}

async function backfillReceiptCategoryBroadTypes(userId: string) {
  const defaultBroadTypeByName = new Map(
    DEFAULT_RECEIPT_CATEGORIES.map((category) => [
      category.name.toLowerCase(),
      category.broadType || "Other",
    ])
  )

  for (const [lowerName, broadType] of defaultBroadTypeByName.entries()) {
    try {
      await neonQuery(
        `
          UPDATE receipt_categories
          SET broad_type = $3
          WHERE user_id = $1
            AND LOWER(name) = $2
            AND (broad_type IS NULL OR broad_type <> $3)
        `,
        [userId, lowerName, broadType]
      )
    } catch {
      // Best-effort only; do not block receipt workflows if backfill fails.
    }
  }
}
