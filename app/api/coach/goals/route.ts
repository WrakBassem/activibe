import { NextResponse } from 'next/server'
import sql from '@/lib/db'

// GET /api/coach/goals — Fetch all goals
export async function GET() {
  try {
    const goals = await sql`
      SELECT * FROM coach_goals
      ORDER BY 
        CASE status 
          WHEN 'active' THEN 1 
          WHEN 'paused' THEN 2 
          ELSE 3 
        END,
        created_at DESC
    `

    // For each goal, fetch linked tracking items
    const goalsWithItems = await Promise.all(
      goals.map(async (goal) => {
        const items = await sql`
          SELECT ti.*, dil.completed, dil.rating
          FROM tracking_items ti
          LEFT JOIN daily_item_logs dil ON ti.id = dil.item_id AND dil.log_date = CURRENT_DATE
          WHERE ti.goal_id = ${goal.id} AND ti.is_active = TRUE
        `
        const parsedItems = items.map((item: any) => ({
          ...item,
          frequency_days: typeof item.frequency_days === 'string' 
            ? JSON.parse(item.frequency_days) 
            : (item.frequency_days || [])
        }))

        return { 
          ...goal, 
          milestones: typeof goal.milestones === 'string'
            ? JSON.parse(goal.milestones)
            : (goal.milestones || []),
          linked_items: parsedItems 
        }
      })
    )

    return NextResponse.json({
      success: true,
      data: goalsWithItems,
    })
  } catch (error: any) {
    console.error('[GET /api/coach/goals] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch goals', details: error.message },
      { status: 500 }
    )
  }
}

// POST /api/coach/goals — Create a new goal
export async function POST(request: Request) {
  try {
    const body = await request.json()

    if (!body.title) {
      return NextResponse.json(
        { error: 'title is required' },
        { status: 400 }
      )
    }

    const newGoal = await sql`
      INSERT INTO coach_goals (title, category, deadline, milestones, motivation_why, status)
      VALUES (
        ${body.title},
        ${body.category || 'general'},
        ${body.deadline || null},
        ${JSON.stringify(body.milestones || [])}::jsonb,
        ${body.motivation_why || null},
        'active'
      )
      RETURNING *
    `

    // Create linked tracking items if provided
    if (body.daily_tasks && Array.isArray(body.daily_tasks)) {
      for (const task of body.daily_tasks) {
        await sql`
          INSERT INTO tracking_items (title, type, frequency_days, priority, goal_id)
          VALUES (
            ${task.title},
            ${task.type || 'task'},
            ${JSON.stringify(task.frequency_days || [0,1,2,3,4,5,6])}::jsonb,
            ${task.priority || 'medium'},
            ${newGoal[0].id}
          )
        `
      }
    }

    return NextResponse.json({
      success: true,
      data: newGoal[0],
    }, { status: 201 })
  } catch (error: any) {
    console.error('[POST /api/coach/goals] Error:', error)
    return NextResponse.json(
      { error: 'Failed to create goal', details: error.message },
      { status: 500 }
    )
  }
}

// PATCH /api/coach/goals — Update a goal
export async function PATCH(request: Request) {
  try {
    const body = await request.json()

    if (!body.id) {
      return NextResponse.json(
        { error: 'id is required' },
        { status: 400 }
      )
    }

    const result = await sql`
      UPDATE coach_goals SET
        title = COALESCE(${body.title || null}, title),
        category = COALESCE(${body.category || null}, category),
        deadline = COALESCE(${body.deadline || null}, deadline),
        milestones = COALESCE(${body.milestones ? JSON.stringify(body.milestones) : null}::jsonb, milestones),
        status = COALESCE(${body.status || null}, status),
        motivation_why = COALESCE(${body.motivation_why || null}, motivation_why)
      WHERE id = ${body.id}
      RETURNING *
    `

    if (result.length === 0) {
      return NextResponse.json(
        { error: 'Goal not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: result[0],
    })
  } catch (error: any) {
    console.error('[PATCH /api/coach/goals] Error:', error)
    return NextResponse.json(
      { error: 'Failed to update goal', details: error.message },
      { status: 500 }
    )
  }
}
