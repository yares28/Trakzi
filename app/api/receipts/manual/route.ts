import { NextResponse } from "next/server"
import { getCurrentUserId } from "@/lib/auth"
import { neonInsert } from "@/lib/neonClient"

export async function POST(request: Request) {
    try {
        const userId = await getCurrentUserId()
        const { date, time, storeName, description, amount, quantity, categoryId, categoryTypeId } = await request.json()

        const receiptDate = date || new Date().toISOString().split('T')[0]
        const receiptTime = time || new Date().toTimeString().split(' ')[0]

        // 1. Create Receipt
        // We create a "Completed" receipt representing this manual entry.
        // If the user enters multiple items, this simplistic endpoint creates one receipt per item if called multiple times.
        // For a quick add, this is acceptable. Ideally, a bulk add UI would be better.
        const totalAmount = Number(amount) * (Number(quantity) || 1)

        const [receipt] = await neonInsert("receipts", {
            user_id: userId,
            store_name: storeName || "Manual Entry",
            receipt_date: receiptDate,
            receipt_time: receiptTime,
            total_amount: totalAmount,
            status: 'completed',
            receipt_file_id: null, // No file associated
        }) as any

        if (!receipt) throw new Error("Failed to create receipt")

        // 2. Create Receipt Transaction
        const [transaction] = await neonInsert("receipt_transactions", {
            user_id: userId,
            receipt_id: receipt.id,
            description: description,
            quantity: Number(quantity) || 1,
            price_per_unit: Number(amount),
            total_price: totalAmount,
            category_id: categoryId === "none" ? null : Number(categoryId),
            category_type_id: categoryTypeId ? Number(categoryTypeId) : null,
            receipt_date: receiptDate, // Denormalized
            receipt_time: receiptTime, // Denormalized
        })

        return NextResponse.json({ receipt, transaction }, { status: 201 })

    } catch (error: any) {
        console.error("Error creating manual receipt transaction:", error)
        return NextResponse.json({ error: error.message || "Failed to create receipt transaction" }, { status: 500 })
    }
}
