const ADMIN_IDS: Record<string, string | null> = {
  production:  'user_36zKDz6llX3kg6hj2RbvkNSgG32',
  preview:     'user_37lqBkuJdf7OKbtm8WZmWYhHNxO',
  development: null, // null = anyone on localhost
}

export function isAdminUser(userId: string): boolean {
  const env = (process.env.VERCEL_ENV ?? 'development') as string
  const allowed = ADMIN_IDS[env] ?? null
  return allowed === null || userId === allowed
}

export function getAdminEnv(): 'production' | 'preview' | 'development' {
  const env = process.env.VERCEL_ENV
  if (env === 'production') return 'production'
  if (env === 'preview') return 'preview'
  return 'development'
}
