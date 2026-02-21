import { NextResponse } from 'next/server'
import sql from '@/lib/db'
import { getAuthUserId } from '@/lib/auth-utils'

// GET /api/logs - Fetch all daily scores with metric summaries (new data model)
export async function GET() {
  try {
    const userId = await getAuthUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch scores from daily_scores (replaces daily_logs + daily_final_score)
    const logs = await sql`
      SELECT 
        ds.id,
        ds.date as log_date,
        ds.total_score as final_score,
        ds.mode,
        ds.burnout_flag,
        ds.procrastination_flag,
        ds.created_at,
        (SELECT COUNT(*) FROM daily_entries de 
         WHERE de.user_id = ds.user_id AND de.date = ds.date AND de.completed = TRUE
        ) as completed_metrics,
        (SELECT COUNT(*) FROM daily_entries de 
         WHERE de.user_id = ds.user_id AND de.date = ds.date
        ) as total_metrics
      FROM daily_scores ds
      WHERE ds.user_id = ${userId}
      ORDER BY ds.date DESC
    `

    return NextResponse.json({
      success: true,
      count: logs.length,
      data: logs
    })
  } catch (error: any) {
    console.error('[GET /api/logs] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch logs', details: error.message },
      { status: 500 }
    )
  }
}

// POST /api/logs - Redirect to /api/daily (new primary endpoint)
export async function POST(request: Request) {
  try {
    const userId = await getAuthUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    return NextResponse.json({ 
      error: 'This endpoint is deprecated. Use POST /api/daily instead.',
      redirect: '/api/daily'
    }, { status: 301 })

  } catch (error: any) {
    console.error('[POST /api/logs] Error:', error)
    return NextResponse.json(
      { error: 'Failed to process', details: error.message },
      { status: 500 }
    )
  }
}

// PUT /api/logs - Redirect to /api/daily (new primary endpoint)
export async function PUT(request: Request) {
  try {
    const userId = await getAuthUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    return NextResponse.json({ 
      error: 'This endpoint is deprecated. Use POST /api/daily instead.',
      redirect: '/api/daily'
    }, { status: 301 })

  } catch (error: any) {
    console.error('[PUT /api/logs] Error:', error)
    return NextResponse.json(
      { error: 'Failed to process', details: error.message },
      { status: 500 }
    )
  }
}
