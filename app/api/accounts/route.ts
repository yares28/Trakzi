import { NextResponse } from 'next/server'
import { getCurrentUserId } from '@/lib/auth'
import { getUserAccounts, createAccount } from '@/lib/accounts'
import { CreateAccountDto } from '@/lib/types/accounts'
import { z } from 'zod'

const createAccountSchema = z.object({
    name: z.string().min(1, 'Name is required').max(100),
    accountType: z.enum(['checking', 'savings', 'credit_card', 'cash', 'investment', 'loan']),
    currency: z.string().length(3).optional(),
    currentBalance: z.number().nullable().optional(),
    institution: z.string().max(100).nullable().optional(),
    color: z.string().max(20).nullable().optional(),
})

export async function GET() {
    try {
        const userId = await getCurrentUserId()
        const accounts = await getUserAccounts(userId)
        return NextResponse.json({ success: true, accounts })
    } catch (error: any) {
        return NextResponse.json(
            { success: false, error: error.message },
            { status: error.message?.includes('401') ? 401 : 500 }
        )
    }
}

export async function POST(request: Request) {
    try {
        const userId = await getCurrentUserId()
        const body = await request.json()

        const parsed = createAccountSchema.safeParse(body)
        if (!parsed.success) {
            return NextResponse.json(
                { success: false, error: parsed.error.errors[0]?.message ?? 'Invalid input' },
                { status: 400 }
            )
        }

        const data: CreateAccountDto = parsed.data
        const account = await createAccount(userId, data)
        return NextResponse.json({ success: true, account }, { status: 201 })
    } catch (error: any) {
        const isLimitError = error.message?.includes('limit') || error.message?.includes('reached')
        return NextResponse.json(
            { success: false, error: error.message },
            { status: isLimitError ? 403 : 500 }
        )
    }
}
