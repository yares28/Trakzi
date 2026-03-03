import { NextResponse } from 'next/server'
import { MOCK_CHALLENGE_GROUPS } from '@/lib/demo/mock-data'

export const GET = async () => NextResponse.json(MOCK_CHALLENGE_GROUPS)
