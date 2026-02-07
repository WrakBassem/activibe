import { NextResponse } from 'next/server'
import sql from '@/lib/db'

// Types for daily log
interface DailyLogInput {
  log_date: string
  sleep_hours?: number
  sleep_quality?: number
  food_quality?: number
  activity_level?: number
  focus_minutes?: number
  habits_score?: number
  tasks_done?: number
  mood?: number
}

// GET /api/logs - Fetch all logs with scores
export async function GET() {
  try {
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
        s.final_score,
        s.sleep_duration_pts,
        s.sleep_quality_pts,
        s.food_pts,
        s.activity_pts,
        s.focus_pts,
        s.habits_pts,
        s.tasks_pts,
        s.mood_pts,
        s.fatigue_penalty,
        s.imbalance_penalty,
        s.discipline_bonus
      FROM daily_logs d
      LEFT JOIN daily_final_score s ON d.log_date = s.log_date
      ORDER BY d.log_date DESC
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

// POST /api/logs - Create new daily log
export async function POST(request: Request) {
  try {
    const body: DailyLogInput = await request.json()

    // Validate required field
    if (!body.log_date) {
      return NextResponse.json(
        { error: 'log_date is required (format: YYYY-MM-DD)' },
        { status: 400 }
      )
    }

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

    // Insert into database
    const result = await sql`
      INSERT INTO daily_logs (
        log_date,
        sleep_hours,
        sleep_quality,
        food_quality,
        activity_level,
        focus_minutes,
        habits_score,
        tasks_done,
        mood
      ) VALUES (
        ${body.log_date},
        ${body.sleep_hours ?? null},
        ${body.sleep_quality ?? null},
        ${body.food_quality ?? null},
        ${body.activity_level ?? null},
        ${body.focus_minutes ?? null},
        ${body.habits_score ?? null},
        ${body.tasks_done ?? null},
        ${body.mood ?? null}
      )
      RETURNING *
    `

    return NextResponse.json({
      success: true,
      message: 'Daily log created',
      data: result[0]
    }, { status: 201 })

  } catch (error: any) {
    console.error('[POST /api/logs] Error:', error)
    
    // Handle duplicate date
    if (error.code === '23505') {
      return NextResponse.json(
        { error: 'A log for this date already exists' },
        { status: 409 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to create log', details: error.message },
      { status: 500 }
    )
  }
}
