import { NextResponse } from 'next/server'
import { getCurrentUserId } from '@/lib/auth'
import {
    getAccountById,
    updateAccount,
    archiveAccount,
    unarchiveAccount,
    deleteAccount,
} from '@/lib/accounts'
import { UpdateAccountDto } from '@/lib/types/accounts'
import { z } from 'zod'

const updateAccountSchema = z.object({
    name: z.string().min(1).max(100).optional(),
    accountType: z.enum(['checking', 'savings', 'credit_card', 'cash', 'investment', 'loan']).optional(),
    currency: z.string().length(3).optional(),
    currentBalance: z.number().nullable().optional(),
    institution: z.string().max(100).nullable().optional(),
    color: z.string().max(20).nullable().optional(),
    displayOrder: z.number().int().min(0).optional(),
    isActive: z.boolean().optional(),
})

export async function GET(
    _request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const userId = await getCurrentUserId()
        const { id } = await params
        const account = await getAccountById(userId, id)
        if (!account) {
            return NextResponse.json({ success: false, error: 'Account not found' }, { status: 404 })
        }
        return NextResponse.json({ success: true, account })
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const userId = await getCurrentUserId()
        const { id } = await params
        const body = await request.json()

        const parsed = updateAccountSchema.safeParse(body)
        if (!parsed.success) {
            return NextResponse.json(
                { success: false, error: parsed.error.errors[0]?.message ?? 'Invalid input' },
                { status: 400 }
            )
        }

        const { isActive, ...rest } = parsed.data

        // Handle archive/unarchive via isActive field
        if (isActive === false) {
            await archiveAccount(userId, id)
            const account = await getAccountById(userId, id)
            return NextResponse.json({ success: true, account })
        }
        if (isActive === true) {
            const account = await unarchiveAccount(userId, id)
            return NextResponse.json({ success: true, account })
        }

        const data: UpdateAccountDto = rest
        const account = await updateAccount(userId, id, data)
        return NextResponse.json({ success: true, account })
    } catch (error: any) {
        const isLimitError = error.message?.includes('limit') || error.message?.includes('reached')
        return NextResponse.json(
            { success: false, error: error.message },
            { status: isLimitError ? 403 : error.message?.includes('not found') ? 404 : 500 }
        )
    }
}

export async function DELETE(
    _request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const userId = await getCurrentUserId()
        const { id } = await params
        await deleteAccount(userId, id)
        return NextResponse.json({ success: true })
    } catch (error: any) {
        const isTxError = error.message?.includes('transactions')
        return NextResponse.json(
            { success: false, error: error.message },
            { status: isTxError ? 409 : error.message?.includes('not found') ? 404 : 500 }
        )
    }
}
