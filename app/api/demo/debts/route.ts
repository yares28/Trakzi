import { NextResponse } from "next/server"
import { MOCK_DEBTS } from "@/lib/demo/mock-data"

export async function GET() {
  return NextResponse.json({ debts: MOCK_DEBTS })
}
