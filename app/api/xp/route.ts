import { NextResponse } from 'next/server'
import { getAuthUserId } from '@/lib/auth-utils'
import { getUserXPStatus } from '@/lib/gamification'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const userId = await getAuthUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const status = await getUserXPStatus(userId)
    if (!status) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: status })
  } catch (error: any) {
    console.error('[GET /api/xp] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch XP status', details: error.message },
      { status: 500 }
    )
  }
}
