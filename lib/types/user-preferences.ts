// lib/types/user-preferences.ts
// TypeScript types for the user_preferences JSONB stored in Neon.

/** Size of a chart card in the grid (GridStack units). */
export interface ChartSizePreference {
  w: number
  h: number
  x?: number
  y?: number
}

/** Home page preferences (favourites dashboard). */
export interface HomePreferences {
  /** Chart IDs the user has starred. */
  favorites: string[]
  /** Display order of the starred charts. */
  order: string[]
  /** Per-chart custom grid sizes. */
  sizes: Record<string, { w: number; h: number }>
}

/** Layout preferences for Analytics / Fridge pages. */
export interface PageLayoutPreferences {
  /** Display order of charts. */
  order: string[]
  /** Chart sizes (may include x/y positions from GridStack). */
  sizes: Record<string, ChartSizePreference>
  /** User-overridden resize sizes (analytics only). */
  user_sizes?: Record<string, { w: number; h: number }>
  /** Size version string for default-size reset logic. */
  sizes_version?: string
}

/** Global user settings (appearance, currency, time period, theme). */
export interface SettingsPreferences {
  /** Color scheme name, e.g. "sunset", "dark", "chrome". */
  color_scheme?: string
  /** Theme mode — "light" or "dark". */
  theme?: string
  /** Currency code — "USD", "EUR", "GBP". */
  currency?: string
  /** Default date filter — "lastyear", "last3months", "2025", etc. */
  date_filter?: string
  /** Font family — "geist-sans" | "geist-mono". */
  font?: string
}

/**
 * Root preferences object stored in the `preferences` JSONB column
 * of the `user_preferences` table.  Each key is a page namespace.
 */
export interface UserPreferences {
  home?: HomePreferences
  analytics?: PageLayoutPreferences
  fridge?: PageLayoutPreferences
  settings?: SettingsPreferences
}

/** Shape returned by GET /api/user-preferences. */
export interface UserPreferencesResponse {
  preferences: UserPreferences
}
