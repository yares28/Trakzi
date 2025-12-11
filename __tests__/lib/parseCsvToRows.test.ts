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
      description: 'WWW.AMAZON.* CW4WE8Q35',
      amount: -120.5,
    })
    expect(rows[1]).toMatchObject({
      date: '2025-11-24',
      description: 'Hotel at Booking.com',
      amount: -200,
    })
  })
})



































