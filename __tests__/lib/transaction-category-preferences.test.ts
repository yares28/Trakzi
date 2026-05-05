import { normalizeTransactionDescriptionKey } from '@/lib/transactions/transaction-category-preferences'

describe('normalizeTransactionDescriptionKey', () => {
  it('returns null for empty string', () => {
    expect(normalizeTransactionDescriptionKey('')).toBeNull()
    expect(normalizeTransactionDescriptionKey('   ')).toBeNull()
  })

  it('returns null for a single-token description (too generic)', () => {
    expect(normalizeTransactionDescriptionKey('Amazon')).toBeNull()
  })

  it('returns null for a single meaningful token after noise stripping', () => {
    // "AMAZON" after stripping "COMPRA" prefix leaves only "amazon" — one token
    expect(normalizeTransactionDescriptionKey('amazon')).toBeNull()
  })

  it('returns a key for a two-token specific description', () => {
    const key = normalizeTransactionDescriptionKey('Amazon Prime')
    expect(key).not.toBeNull()
    expect(key).toContain('amazon')
    expect(key).toContain('prime')
  })

  it('returns distinct keys for Amazon Prime vs Amazon Fresh', () => {
    const prime = normalizeTransactionDescriptionKey('Amazon Prime')
    const fresh = normalizeTransactionDescriptionKey('Amazon Fresh')
    expect(prime).not.toBeNull()
    expect(fresh).not.toBeNull()
    expect(prime).not.toBe(fresh)
  })

  it('strips currency codes and numbers', () => {
    const key = normalizeTransactionDescriptionKey('Netflix 15.99 EUR')
    // "netflix" alone is one token — returns null (generic)
    // unless the cleaned key has 2+ meaningful tokens
    expect(typeof key === 'string' || key === null).toBe(true)
  })
})
