import { NextResponse } from 'next/server'
import { MOCK_GROCERY_VS_RESTAURANT } from '@/lib/demo/mock-data'

export const GET = () => {
    return NextResponse.json({ data: MOCK_GROCERY_VS_RESTAURANT })
}
