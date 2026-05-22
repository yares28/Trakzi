import { normaliseMerchantName } from '@/lib/parsing/merchant-normalisation'

describe('normaliseMerchantName', () => {
  it('strips Spanish bank prefix and trailing reference code', () => {
    expect(normaliseMerchantName('COMPRA WWW.AMAZON.* CW4WE8Q35')).toBe('Amazon')
  })

  it('strips English bank prefix and amount suffix', () => {
    expect(normaliseMerchantName("CARD PURCHASE SAINSBURY'S 41.30 GBP")).toBe("Sainsbury's")
  })

  it('preserves multi-word merchant names without hard truncation', () => {
    expect(normaliseMerchantName('POS PURCHASE WHOLE FOODS MARKET 35.50')).toBe('Whole Foods Market')
  })

  it('extracts domain from URL-style descriptions', () => {
    expect(normaliseMerchantName('PAGO EN NETFLIX.COM REF:X123')).toBe('Netflix')
  })

  it('strips trailing IBAN fragment', () => {
    const result = normaliseMerchantName('TRANSFERENCIA UNICAJA ES21 2103 0001 1234')
    expect(result).not.toMatch(/ES21/)
  })

  it('returns non-empty result for short clean names', () => {
    expect(normaliseMerchantName('Spotify').length).toBeGreaterThan(0)
  })

  it('title-cases the result', () => {
    const result = normaliseMerchantName('PAGO EN MERCADONA')
    expect(result[0]).toBe(result[0].toUpperCase())
  })
})
