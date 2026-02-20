import { NextResponse } from 'next/server'

export async function GET() {
    // Mock wallet/balance data
    // In a real app this might return current balance per account
    return NextResponse.json({
        totalBalance: 4250.50,
        currency: "EUR",
        accounts: [
            { id: "1", name: "Main Account", balance: 3100.50, type: "checking" },
            { id: "2", name: "Savings", balance: 1150.00, type: "savings" }
        ]
    })
}
