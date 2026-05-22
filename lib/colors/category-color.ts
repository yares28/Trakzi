/**
 * Category color resolution.
 *
 * `categories.color` in Neon stores one of three things:
 *   1. A token name like `category-3` (new rows, written by /api/budgets and
 *      eventually all category-creation paths).
 *   2. A legacy hex string like `#f97316` (existing rows pre-migration).
 *   3. NULL (unset).
 *
 * This module is the single resolver. Use `categoryColorCss` in HTML/CSS
 * contexts (inline style, className, etc.) and `categoryColorSvg` for
 * Recharts/SVG `fill` attributes, which do NOT evaluate CSS var().
 */

const TOKEN_NAMES = [
  "category-1",
  "category-2",
  "category-3",
  "category-4",
  "category-5",
  "category-6",
  "category-7",
  "category-8",
] as const

export type CategoryToken = (typeof TOKEN_NAMES)[number]

const TOKEN_SET: ReadonlySet<string> = new Set(TOKEN_NAMES)

// Mirrors the --category-N values in app/globals.css :root.
// Kept in sync manually — 8 entries × 2 themes is a bounded duplication.
const TOKEN_OKLCH_LIGHT: Record<CategoryToken, string> = {
  "category-1": "oklch(0.65 0.16 30)",
  "category-2": "oklch(0.65 0.16 75)",
  "category-3": "oklch(0.65 0.16 140)",
  "category-4": "oklch(0.65 0.13 195)",
  "category-5": "oklch(0.62 0.15 240)",
  "category-6": "oklch(0.65 0.16 285)",
  "category-7": "oklch(0.65 0.16 330)",
  "category-8": "oklch(0.68 0.14 110)",
}

const TOKEN_OKLCH_DARK: Record<CategoryToken, string> = {
  "category-1": "oklch(0.74 0.14 30)",
  "category-2": "oklch(0.74 0.14 75)",
  "category-3": "oklch(0.74 0.14 140)",
  "category-4": "oklch(0.74 0.12 195)",
  "category-5": "oklch(0.78 0.14 240)",
  "category-6": "oklch(0.74 0.14 285)",
  "category-7": "oklch(0.74 0.14 330)",
  "category-8": "oklch(0.76 0.13 110)",
}

function isToken(value: string): value is CategoryToken {
  return TOKEN_SET.has(value)
}

// Known legacy hex values → closest perceptual token in the palette.
// Kept in sync with the historical CATEGORY_COLORS list used by category-creation
// paths so existing DB rows resolve consistently, never rendering as raw hex.
const HEX_TO_TOKEN: Record<string, CategoryToken> = {
  "#f97316": "category-2", // orange → warm yellow-orange
  "#6366f1": "category-6", // indigo → purple
  "#10b981": "category-3", // emerald → green
  "#ec4899": "category-7", // pink → magenta
  "#0ea5e9": "category-5", // sky → blue
  "#facc15": "category-8", // yellow → olive
  "#14b8a6": "category-4", // teal → teal
  "#8b5cf6": "category-6", // violet → purple
  "#f43f5e": "category-1", // rose → warm red-orange
}

/**
 * Deterministic hash → token for unknown inputs. Keeps the same input mapped
 * to the same token across renders/sessions so charts and badges agree.
 */
function hashToToken(value: string): CategoryToken {
  let h = 0
  for (let i = 0; i < value.length; i++) {
    h = (h * 31 + value.charCodeAt(i)) | 0
  }
  const idx = Math.abs(h) % TOKEN_NAMES.length
  return TOKEN_NAMES[idx]
}

/**
 * Map any stored value to a palette token. Three cases:
 *   1. Already a token → return as-is.
 *   2. Known legacy hex → look up in HEX_TO_TOKEN.
 *   3. Anything else (unknown hex, garbage, etc.) → deterministic hash.
 * Returns null only for null/empty input, so the caller can render a
 * neutral fallback for "no color set."
 */
function resolveToken(stored: string | null | undefined): CategoryToken | null {
  if (!stored) return null
  const trimmed = stored.trim()
  if (!trimmed) return null
  if (isToken(trimmed)) return trimmed
  const lower = trimmed.toLowerCase()
  if (lower in HEX_TO_TOKEN) return HEX_TO_TOKEN[lower]
  return hashToToken(lower)
}

/**
 * Resolve a stored color value to a CSS-safe string for HTML/CSS contexts.
 * Always returns a palette token reference — never the raw stored hex —
 * so dark mode and light mode both look correct without touching the DB.
 */
export function categoryColorCss(stored: string | null | undefined): string {
  const token = resolveToken(stored)
  if (!token) return "var(--muted-foreground)"
  return `var(--${token})`
}

/**
 * Resolve a stored color value to a literal color string for SVG `fill`/`stroke`,
 * which cannot evaluate `var()`. Caller passes `isDark` (typically from
 * `useTheme()` resolvedTheme === "dark"). Like `categoryColorCss`, always
 * returns a palette value — never raw stored hex.
 */
export function categoryColorSvg(
  stored: string | null | undefined,
  isDark: boolean
): string {
  const token = resolveToken(stored)
  if (!token) return isDark ? "oklch(0.6268 0 0)" : "oklch(0.551 0.0234 264.3637)"
  return isDark ? TOKEN_OKLCH_DARK[token] : TOKEN_OKLCH_LIGHT[token]
}

export { TOKEN_NAMES }
