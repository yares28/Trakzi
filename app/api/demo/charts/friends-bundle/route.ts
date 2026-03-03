import { NextResponse } from 'next/server'
import { MOCK_FRIENDS_BUNDLE } from '@/lib/demo/mock-data'

export const GET = async () => NextResponse.json(MOCK_FRIENDS_BUNDLE)
