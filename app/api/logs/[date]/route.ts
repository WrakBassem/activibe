import { NextResponse } from 'next/server'
import sql from '@/lib/db'

interface RouteParams {
  params: Promise<{ date: string }>
}

// GET /api/logs/[date] - Fetch single log by date
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { date } = await params

    const logs = await sql`
      SELECT 
        d.id,
        d.log_date,
        d.sleep_hours,
        d.sleep_quality,
        d.food_quality,
        d.activity_level,
        d.focus_minutes,
        d.habits_score,
        d.tasks_done,
        d.mood,
        d.created_at,
        s.final_score
      FROM daily_logs d
      LEFT JOIN daily_final_score s ON d.log_date = s.log_date
      WHERE d.log_date = ${date}
    `

    if (logs.length === 0) {
      return NextResponse.json(
        { error: 'Log not found for this date' },
        { status: 404 }
      )
    }

    // Fetch items separately
    const items = await sql`
      SELECT item_id, completed, rating 
      FROM daily_item_logs 
      WHERE log_date = ${date}
    `

    return NextResponse.json({
      success: true,
      data: {
        ...logs[0],
        items: items
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

// PUT /api/logs/[date] - Update existing log
export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const { date } = await params
    const body = await request.json()

    // Validate ranges
    if (body.sleep_quality !== undefined && (body.sleep_quality < 1 || body.sleep_quality > 5)) {
      return NextResponse.json({ error: 'sleep_quality must be 1-5' }, { status: 400 })
    }
    if (body.food_quality !== undefined && (body.food_quality < 1 || body.food_quality > 5)) {
      return NextResponse.json({ error: 'food_quality must be 1-5' }, { status: 400 })
    }
    if (body.activity_level !== undefined && (body.activity_level < 0 || body.activity_level > 5)) {
      return NextResponse.json({ error: 'activity_level must be 0-5' }, { status: 400 })
    }
    if (body.habits_score !== undefined && (body.habits_score < 0 || body.habits_score > 5)) {
      return NextResponse.json({ error: 'habits_score must be 0-5' }, { status: 400 })
    }
    if (body.tasks_done !== undefined && (body.tasks_done < 0 || body.tasks_done > 5)) {
      return NextResponse.json({ error: 'tasks_done must be 0-5' }, { status: 400 })
    }
    if (body.mood !== undefined && (body.mood < -2 || body.mood > 2)) {
      return NextResponse.json({ error: 'mood must be -2 to 2' }, { status: 400 })
    }

    const result = await sql`
      UPDATE daily_logs SET
        sleep_hours = COALESCE(${body.sleep_hours ?? null}, sleep_hours),
        sleep_quality = COALESCE(${body.sleep_quality ?? null}, sleep_quality),
        food_quality = COALESCE(${body.food_quality ?? null}, food_quality),
        activity_level = COALESCE(${body.activity_level ?? null}, activity_level),
        focus_minutes = COALESCE(${body.focus_minutes ?? null}, focus_minutes),
        habits_score = COALESCE(${body.habits_score ?? null}, habits_score),
        tasks_done = COALESCE(${body.tasks_done ?? null}, tasks_done),
        mood = COALESCE(${body.mood ?? null}, mood)
      WHERE log_date = ${date}
      RETURNING *
    `

    if (result.length === 0) {
      return NextResponse.json(
        { error: 'Log not found for this date' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Log updated',
      data: result[0]
    })
  } catch (error: any) {
    console.error('[PUT /api/logs/date] Error:', error)
    return NextResponse.json(
      { error: 'Failed to update log', details: error.message },
      { status: 500 }
    )
  }
}

// DELETE /api/logs/[date] - Delete a log
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const { date } = await params

    const result = await sql`
      DELETE FROM daily_logs
      WHERE log_date = ${date}
      RETURNING id, log_date
    `

    if (result.length === 0) {
      return NextResponse.json(
        { error: 'Log not found for this date' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Log deleted',
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
