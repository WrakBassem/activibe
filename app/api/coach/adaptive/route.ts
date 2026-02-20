
import { NextResponse } from 'next/server'
import { getAuthUserId } from '@/lib/auth-utils'
import { analyzeDifficulty } from '@/lib/adaptive'
import sql from '@/lib/db'

// GET /api/coach/adaptive - Get suggestions
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

// POST /api/coach/adaptive/apply - Apply a suggestion
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

        await sql`
            UPDATE metrics
            SET difficulty_level = ${new_difficulty}
            WHERE id = ${metric_id}
        `

        return NextResponse.json({ success: true, message: 'Difficulty updated' })

    } catch (error: any) {
        console.error('[POST /api/coach/adaptive/apply] Error:', error)
        return NextResponse.json(
            { error: 'Failed to apply suggestion', details: error.message },
            { status: 500 }
        )
    }
}
