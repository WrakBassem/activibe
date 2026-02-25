import { NextResponse } from 'next/server'
import { getAuthUserId } from '@/lib/auth-utils'
import { analyzeDifficulty } from '@/lib/adaptive'
import sql from '@/lib/db'

// GET /api/coach/adaptive - Get suggestions for current user
export async function GET() {
  try {
    const userId = await getAuthUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const suggestions = await analyzeDifficulty(userId)

    return NextResponse.json({
      success: true,
      data: suggestions
    })
  } catch (error: any) {
    console.error('[GET /api/coach/adaptive] Error:', error)
    return NextResponse.json(
      { error: 'Failed to generate suggestions', details: error.message },
      { status: 500 }
    )
  }
}

// POST /api/coach/adaptive - Apply a suggestion (owner-only)
export async function POST(request: Request) {
    try {
        const userId = await getAuthUserId()
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const { metric_id, new_difficulty } = body

        if (!metric_id || !new_difficulty) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
        }

        // Ownership check — only update if this metric belongs to the current user
        const result = await sql`
            UPDATE metrics
            SET difficulty_level = ${new_difficulty}
            WHERE id = ${metric_id} AND user_id = ${userId}
            RETURNING id
        `

        if (result.length === 0) {
            return NextResponse.json({ error: 'Metric not found or access denied' }, { status: 403 })
        }

        return NextResponse.json({ success: true, message: 'Difficulty updated' })

    } catch (error: any) {
        console.error('[POST /api/coach/adaptive/apply] Error:', error)
        return NextResponse.json(
            { error: 'Failed to apply suggestion', details: error.message },
            { status: 500 }
        )
    }
}
