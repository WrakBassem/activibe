import { NextResponse } from 'next/server'
import sql from '@/lib/db'
import { getAuthUserId } from '@/lib/auth-utils'

// GET /api/reports/insights - Fetch the latest saved AI insights for the current user
export async function GET(request: Request) {
  try {
    const userId = await getAuthUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'daily' // 'daily' | 'weekly'

    const rows = await sql`
      SELECT id, report_type, report_date, tips, strategies, focus_areas, raw_text, created_at
      FROM ai_insights
      WHERE user_id = ${userId}
        AND report_type = ${type}
      ORDER BY report_date DESC
      LIMIT 1
    `

    if (rows.length === 0) {
      return NextResponse.json({ success: true, data: null })
    }

    const row = rows[0]
    return NextResponse.json({
      success: true,
      data: {
        ...row,
        tips: typeof row.tips === 'string' ? JSON.parse(row.tips) : (row.tips || []),
        strategies: typeof row.strategies === 'string' ? JSON.parse(row.strategies) : (row.strategies || []),
        focus_areas: typeof row.focus_areas === 'string' ? JSON.parse(row.focus_areas) : (row.focus_areas || []),
      }
    })
  } catch (error: any) {
    console.error('[GET /api/reports/insights] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch insights', details: error.message },
      { status: 500 }
    )
  }
}
