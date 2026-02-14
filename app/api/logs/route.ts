import { NextResponse } from 'next/server'
import sql from '@/lib/db'
import { auth } from '@/auth'

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
  items?: { item_id: number, completed: boolean, rating?: number }[]
}

// GET /api/logs - Fetch all logs with scores
export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

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
      LEFT JOIN daily_final_score s ON d.log_date = s.log_date AND d.user_id = s.user_id
      WHERE d.user_id = ${session.user.id}
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
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body: DailyLogInput = await request.json()

    // Validate required field
    if (!body.log_date) {
      return NextResponse.json(
        { error: 'log_date is required (format: YYYY-MM-DD)' },
        { status: 400 }
      )
    }

    // --- Dynamic Items Logic ---
    let derivedHabitsScore = body.habits_score;
    let derivedTasksDone = body.tasks_done;

    if (body.items && Array.isArray(body.items)) {
      // 1. Fetch all items to check types
      // Optimally we should filter by user_id here too to prevent logging other user's items
      const allItems = await sql`SELECT id, type FROM tracking_items WHERE user_id = ${session.user.id}`;
      const itemMap = new Map(allItems.map(i => [i.id, i.type]));

      // 2. Process completions
      let completedHabits = 0;
      let totalHabits = 0;
      let completedTasks = 0;

      // We only count items that were sent (scheduled for today)
      // client should send all scheduled items with their completion status
      for (const item of body.items) {
        if (!itemMap.has(item.item_id)) continue; // Skip if item doesn't belong to user

        const type = itemMap.get(item.item_id);
        if (type === 'habit') {
          totalHabits++;
          if (item.completed) completedHabits++;
        } else if (type === 'task') {
          if (item.completed) completedTasks++;
        }
      }

      // 3. Calculate Scores (Legacy Compat)
      // Habits: 0-5 scale based on completion %
      derivedHabitsScore = totalHabits > 0 
        ? Math.round((completedHabits / totalHabits) * 5) 
        : (body.habits_score ?? 0); // fallback if no habits scheduled

      // Tasks: Raw count (capped at 5 for the DB constraint, but let's see)
      // The DB check is tasks_done BETWEEN 0 AND 5. So we cap at 5.
      derivedTasksDone = Math.min(completedTasks, 5);

      // 4. Save Item Logs
      // We do this inside a transaction or just after. 
      // For simplicity/speed in this setup, we'll do it in parallel.
      for (const item of body.items) {
        if (!itemMap.has(item.item_id)) continue; // Double check

        await sql`
          INSERT INTO daily_item_logs (
            log_date, 
            item_id, 
            completed, 
            rating,
            completed_at,
            user_id
          )
          VALUES (
            ${body.log_date}, 
            ${item.item_id}, 
            ${item.completed},
            ${item.rating ?? null},
            ${item.completed ? new Date() : null},
            ${session.user.id}
          )
          ON CONFLICT (log_date, item_id) 
          DO UPDATE SET 
            completed = ${item.completed}, 
            rating = ${item.rating ?? null},
            completed_at = ${item.completed ? new Date() : null}
        `;
      }
    }

    // --- Regular Log Insert ---
    // Validate ranges
    if (body.sleep_quality !== undefined && (body.sleep_quality < 1 || body.sleep_quality > 5)) {
      return NextResponse.json({ error: 'sleep_quality must be 1-5' }, { status: 400 })
    }
    // ... (rest of validations handled by DB constraints too)

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
        mood,
        user_id
      ) VALUES (
        ${body.log_date},
        ${body.sleep_hours ?? null},
        ${body.sleep_quality ?? null},
        ${body.food_quality ?? null},
        ${body.activity_level ?? null},
        ${body.focus_minutes ?? null},
        ${derivedHabitsScore ?? null},
        ${derivedTasksDone ?? null},
        ${body.mood ?? null},
        ${session.user.id}
      )
      ON CONFLICT (log_date, user_id) 
      DO UPDATE SET
        sleep_hours = EXCLUDED.sleep_hours,
        sleep_quality = EXCLUDED.sleep_quality,
        food_quality = EXCLUDED.food_quality,
        activity_level = EXCLUDED.activity_level,
        focus_minutes = EXCLUDED.focus_minutes,
        habits_score = EXCLUDED.habits_score,
        tasks_done = EXCLUDED.tasks_done,
        mood = EXCLUDED.mood
      RETURNING *
    `

    return NextResponse.json({
      success: true,
      message: 'Daily log saved',
      data: result[0]
    }, { status: 201 })

  } catch (error: any) {
    console.error('[POST /api/logs] Error:', error)
    
    return NextResponse.json(
      { error: 'Failed to create log', details: error.message },
      { status: 500 }
    )
  }
}
