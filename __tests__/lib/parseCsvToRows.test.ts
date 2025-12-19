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
20250115,Compact,-40`

    const rows = parseCsvToRows(csv)

    expect(rows).toHaveLength(4)
    expect(rows[0].date).toBe('2025-01-15')
    expect(rows[1].date).toBe('2025-01-15')
    expect(rows[2].date).toBe('2025-01-15')
    expect(rows[3].date).toBe('2025-01-15')
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

  // NEW: Tests for datetime parsing
  describe('datetime parsing', () => {
    it('parses US-style date with time (M/D/YYYY HH:MM)', () => {
      const csv = `date,description,amount
8/31/2024 12:57,Mercadona,-60.38
9/1/2024 12:10,Amazon,-25.00`

      const rows = parseCsvToRows(csv)

      expect(rows).toHaveLength(2)
      expect(rows[0].date).toBe('2024-08-31')
      expect(rows[0].time).toBe('12:57')
      expect(rows[1].date).toBe('2024-09-01')
      expect(rows[1].time).toBe('12:10')
    })

    it('parses dates with seconds in time', () => {
      const csv = `date,description,amount
2024-08-31 14:30:45,Transaction,-100`

      const rows = parseCsvToRows(csv)

      expect(rows[0].date).toBe('2024-08-31')
      expect(rows[0].time).toBe('14:30:45')
    })

    it('parses ISO datetime with T separator', () => {
      const csv = `date,description,amount
2024-08-31T14:30:00,Transaction,-100`

      const rows = parseCsvToRows(csv)

      expect(rows[0].date).toBe('2024-08-31')
      expect(rows[0].time).toBe('14:30:00')
    })

    it('handles pipe-separated date and time', () => {
      const csv = `date,description,amount
2024-08-31 | 14:30:00,Transaction,-100`

      const rows = parseCsvToRows(csv)

      expect(rows[0].date).toBe('2024-08-31')
      expect(rows[0].time).toBe('14:30:00')
    })

    it('handles 2-digit year with time', () => {
      const csv = `date,description,amount
8/31/24 12:57,Transaction,-100`

      const rows = parseCsvToRows(csv)

      expect(rows[0].date).toBe('2024-08-31')
      expect(rows[0].time).toBe('12:57')
    })

    it('handles European date format with time (D/M/YYYY HH:MM)', () => {
      const csv = `date,description,amount
31/8/2024 14:30,Transaction,-100`

      const rows = parseCsvToRows(csv)

      expect(rows[0].date).toBe('2024-08-31')
      expect(rows[0].time).toBe('14:30')
    })

    it('handles dates without time (time should be undefined)', () => {
      const csv = `date,description,amount
2024-08-31,No Time,-100`

      const rows = parseCsvToRows(csv)

      expect(rows[0].date).toBe('2024-08-31')
      expect(rows[0].time).toBeUndefined()
    })

    it('parses real-world Revolut format with multiple date columns', () => {
      // Simulating: Card Payment,Current,8/31/2024 12:57,9/1/2024 12:10,Mercadona,-60.38,0,EUR,COMPLETED,230.81
      const csv = `Type,Account,Started Date,Completed Date,Description,Amount,Fee,Currency,State,Balance
Card Payment,Current,8/31/2024 12:57,9/1/2024 12:10,Mercadona,-60.38,0,EUR,COMPLETED,230.81`

      const rows = parseCsvToRows(csv)

      expect(rows).toHaveLength(1)
      expect(rows[0].date).toBe('2024-08-31')
      expect(rows[0].time).toBe('12:57')
      expect(rows[0].description).toBe('Mercadona')
      expect(rows[0].amount).toBe(-60.38)
    })
  })
})


