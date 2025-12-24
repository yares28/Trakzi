import { parseCsvToRows } from '@/lib/parsing/parseCsvToRows'

describe('parseCsvToRows', () => {
  it('parses tab-delimited CSV exports that include metadata rows', () => {
    const sampleCsv = `
"Account";"Placeholder"
"Generated";"2025-11-25"
"Transactions"
Date\tDescription\tAmount\tBalance
2025-11-24 | 08:00:00\t"WWW.AMAZON.* CW4WE8Q35"\t-120,50\t1.234,56
24/11/2025\tHotel at Booking.com\t-200,00\t1.034,56
`.trim()

    const rows = parseCsvToRows(sampleCsv)

    expect(rows).toHaveLength(2)
    expect(rows[0]).toMatchObject({
      date: '2025-11-24',
      time: '08:00:00',
      description: 'WWW.AMAZON.* CW4WE8Q35',
      amount: -120.5,
    })
    expect(rows[1]).toMatchObject({
      date: '2025-11-24',
      time: null,
      description: 'Hotel at Booking.com',
      amount: -200,
    })
  })

  it('throws error for empty file', () => {
    expect(() => parseCsvToRows('')).toThrow('Empty file')
    expect(() => parseCsvToRows('   ')).toThrow('Empty file')
    expect(() => parseCsvToRows('\n\n')).toThrow('Empty file')
  })

  it('keeps transactions with zero amount', () => {
    const csv = `date,description,amount
2025-01-01,Fee Reversal,0
2025-01-02,Adjustment,0.00
2025-01-03,Regular,-50.00`

    const rows = parseCsvToRows(csv)

    expect(rows).toHaveLength(3)
    expect(rows[0].amount).toBe(0)
    expect(rows[1].amount).toBe(0)
    expect(rows[2].amount).toBe(-50)
  })

  it('detects duplicate transactions in diagnostics', () => {
    const csv = `date,description,amount
2025-01-01,Grocery Store,-50
2025-01-01,Grocery Store,-50
2025-01-02,Different,-30`

    const { rows, diagnostics } = parseCsvToRows(csv, { returnDiagnostics: true })

    expect(rows).toHaveLength(3)
    expect(diagnostics.duplicatesDetected).toBe(1)
    expect(diagnostics.warnings).toContain('1 potential duplicate transaction(s) detected.')
  })

  it('handles European number format (comma as decimal)', () => {
    const csv = `date,description,amount,balance
2025-01-01,Test,-123,45,1.234,56`

    const rows = parseCsvToRows(csv)

    expect(rows[0].amount).toBe(-123.45)
    expect(rows[0].balance).toBe(1234.56)
  })

  it('handles various date formats', () => {
    const csv = `date,description,amount
2025-01-15,ISO Format,-10
15/01/2025,Slash Format,-20
01/15/2025,US Format,-30
20250115,Compact,-40
15/01/25,Short Year Slash,-50
15-01-25,Short Year Dash,-60`

    const rows = parseCsvToRows(csv)

    expect(rows).toHaveLength(6)
    expect(rows[0].date).toBe('2025-01-15')
    expect(rows[1].date).toBe('2025-01-15')
    expect(rows[2].date).toBe('2025-01-15')
    expect(rows[3].date).toBe('2025-01-15')
    expect(rows[4].date).toBe('2025-01-15')
    expect(rows[5].date).toBe('2025-01-15')
  })

  it('handles negative amounts with different formats', () => {
    const csv = `date,description,amount
2025-01-01,Minus prefix,-50
2025-01-02,Minus suffix,50-
2025-01-03,With currency,-€25.00`

    const rows = parseCsvToRows(csv)

    expect(rows).toHaveLength(3)
    expect(rows[0].amount).toBe(-50)
    expect(rows[1].amount).toBe(-50)
    expect(rows[2].amount).toBe(-25)
  })

  it('returns diagnostics with column info when requested', () => {
    const csv = `date,description,amount,balance
2025-01-01,Test,-10,100`

    const { rows, diagnostics } = parseCsvToRows(csv, { returnDiagnostics: true })

    expect(diagnostics.availableColumns).toContain('date')
    expect(diagnostics.availableColumns).toContain('description')
    expect(diagnostics.availableColumns).toContain('amount')
    expect(diagnostics.totalRowsInFile).toBe(1)
    expect(diagnostics.rowsAfterFiltering).toBe(1)
  })
})








