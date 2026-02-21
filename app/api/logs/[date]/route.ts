import { NextResponse } from 'next/server'
import sql from '@/lib/db'
import { getAuthUserId } from '@/lib/auth-utils'

interface RouteParams {
  params: Promise<{ date: string }>
}

// GET /api/logs/[date] - Fetch single day's score and entries (new data model)
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const userId = await getAuthUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { date } = await params

    // Fetch score from daily_scores
    const scores = await sql`
      SELECT id, date as log_date, total_score as final_score, mode,
             burnout_flag, procrastination_flag, created_at
      FROM daily_scores
      WHERE date = ${date} AND user_id = ${userId}
    `

    if (scores.length === 0) {
      return NextResponse.json(
        { error: 'No data found for this date' },
        { status: 404 }
      )
    }

    // Fetch metric entries from daily_entries
    const entries = await sql`
      SELECT de.metric_id, de.completed, de.score_awarded, de.score_value, 
             de.review, de.time_spent_minutes,
             m.name as metric_name, m.input_type, m.max_points,
             a.name as axis_name
      FROM daily_entries de
      JOIN metrics m ON de.metric_id = m.id
      JOIN axes a ON m.axis_id = a.id
      WHERE de.date = ${date} AND de.user_id = ${userId}
      ORDER BY a.name, m.name
    `

    // Fetch sub-field entries
    const fieldEntries = await sql`
      SELECT dfe.metric_id, mf.label as field_label, mf.name as field_name,
             mf.field_type, dfe.value_int, dfe.value_bool, dfe.value_text
      FROM daily_field_entries dfe
      JOIN metric_fields mf ON dfe.field_id = mf.id
      WHERE dfe.date = ${date} AND dfe.user_id = ${userId}
      ORDER BY mf.sort_order
    `

    return NextResponse.json({
      success: true,
      data: {
        ...scores[0],
        entries,
        field_entries: fieldEntries,
      }
    })
  } catch (error: any) {
    console.error('[GET /api/logs/date] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch log', details: error.message },
      { status: 500 }
    )
  }
}

// PUT /api/logs/[date] - Deprecated, use POST /api/daily
export async function PUT(request: Request, { params }: RouteParams) {
  return NextResponse.json({ 
    error: 'This endpoint is deprecated. Use POST /api/daily instead.',
    redirect: '/api/daily'
  }, { status: 301 })
}

// DELETE /api/logs/[date] - Delete a day's score and entries
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const userId = await getAuthUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { date } = await params

    // Delete entries first (FK constraint), then score
    await sql`DELETE FROM daily_field_entries WHERE date = ${date} AND user_id = ${userId}`
    await sql`DELETE FROM daily_entries WHERE date = ${date} AND user_id = ${userId}`
    const result = await sql`
      DELETE FROM daily_scores
      WHERE date = ${date} AND user_id = ${userId}
      RETURNING id, date as log_date
    `

    if (result.length === 0) {
      return NextResponse.json(
        { error: 'No data found for this date' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Daily data deleted',
      data: result[0]
    })
  } catch (error: any) {
    console.error('[DELETE /api/logs/date] Error:', error)
    return NextResponse.json(
      { error: 'Failed to delete log', details: error.message },
      { status: 500 }
    )
  }
}
