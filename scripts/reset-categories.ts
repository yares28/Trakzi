#!/usr/bin/env tsx
// Script to reset categories in the database to match lib/categories.ts
// Usage: npx tsx scripts/reset-categories.ts

import { readFileSync } from 'fs'
import { resolve } from 'path'
import { neon } from '@neondatabase/serverless'
import { DEFAULT_CATEGORIES } from '../lib/categories'

// Load environment variables from .env.local or .env
function loadEnv() {
  const envFiles = ['.env.local', '.env']
  for (const file of envFiles) {
    try {
      const envPath = resolve(process.cwd(), file)
      const content = readFileSync(envPath, 'utf-8')
      content.split('\n').forEach(line => {
        const match = line.match(/^([^=:#]+)=(.*)$/)
        if (match) {
          const key = match[1].trim()
          const value = match[2].trim().replace(/^["']|["']$/g, '')
          if (!process.env[key]) {
            process.env[key] = value
          }
        }
      })
      console.log(`Loaded environment from ${file}`)
      break
    } catch (e) {
      // File doesn't exist, continue
    }
  }
}

loadEnv()

const CONNECTION_STRING = process.env.DATABASE_URL ?? process.env.NEON_CONNECTION_STRING ?? ""
const DEMO_USER_ID = process.env.DEMO_USER_ID ?? ""

if (!CONNECTION_STRING) {
  console.error('Error: DATABASE_URL or NEON_CONNECTION_STRING not set in environment')
  process.exit(1)
}

if (!DEMO_USER_ID) {
  console.error('Error: DEMO_USER_ID not set in environment')
  process.exit(1)
}

const CATEGORY_COLORS = [
  "#f97316",
  "#6366f1",
  "#10b981",
  "#ec4899",
  "#0ea5e9",
  "#facc15",
  "#14b8a6",
  "#8b5cf6",
  "#f43f5e",
]

async function resetCategories() {
  const sql = neon(CONNECTION_STRING)
  
  try {
    console.log(`Resetting categories for user: ${DEMO_USER_ID}`)
    console.log(`Categories to insert: ${DEFAULT_CATEGORIES.length}`)
    console.log('Categories:', DEFAULT_CATEGORIES.join(', '))
    
    // Delete all existing categories for this user
    console.log('\nDeleting existing categories...')
    const deleteResult = await (sql as any).query(
      `DELETE FROM categories WHERE user_id = $1`,
      [DEMO_USER_ID]
    )
    console.log(`Deleted existing categories`)
    
    // Insert categories from lib/categories.ts
    console.log('\nInserting categories from lib/categories.ts...')
    const defaultRows = DEFAULT_CATEGORIES.map((name, index) => ({
      user_id: DEMO_USER_ID,
      name,
      color: CATEGORY_COLORS[index % CATEGORY_COLORS.length],
    }))
    
    // Insert each category
    for (const row of defaultRows) {
      await (sql as any).query(
        `INSERT INTO categories (user_id, name, color) VALUES ($1, $2, $3)`,
        [row.user_id, row.name, row.color]
      )
      console.log(`  ✓ Inserted: ${row.name}`)
    }
    
    console.log(`\n✅ Successfully reset ${DEFAULT_CATEGORIES.length} categories`)
    console.log('\nCategories in database:')
    DEFAULT_CATEGORIES.forEach((cat, idx) => {
      console.log(`  ${idx + 1}. ${cat}`)
    })
    
  } catch (error) {
    console.error('Error resetting categories:', error)
    process.exit(1)
  }
}

resetCategories()

