import { NextResponse } from 'next/server'
import sql from '@/lib/db'
import { getAuthUserId } from '@/lib/auth-utils'

// GET /api/items - Fetch all active items
export async function GET() {
  try {
    const userId = await getAuthUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const items = await sql`
      SELECT * FROM tracking_items 
      WHERE is_active = TRUE 
        AND user_id = ${userId}
      ORDER BY 
        CASE WHEN priority = 'high' THEN 1 
             WHEN priority = 'medium' THEN 2 
             WHEN priority = 'low' THEN 3 
             ELSE 4 END,
        target_time ASC NULLS LAST,
        created_at DESC
    `

    return NextResponse.json({
      success: true,
      data: items
    })
  } catch (error: any) {
    console.error('[GET /api/items] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch items', details: error.message },
      { status: 500 }
    )
  }
}

// POST /api/items - Create new item
export async function POST(request: Request) {
  try {
    const userId = await getAuthUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    
    // Basic validation
    if (!body.title || !body.type) {
      return NextResponse.json(
        { error: 'Title and Type (habit/task) are required' },
        { status: 400 }
      )
    }

    const newItem = await sql`
      INSERT INTO tracking_items (
        title, 
        type, 
        frequency_days, 
        target_time, 
        duration_minutes, 
        priority,
        start_date,
        end_date,
        is_active,
        user_id
      ) VALUES (
        ${body.title}, 
        ${body.type}, 
        ${JSON.stringify(body.frequency_days || [0,1,2,3,4,5,6])}, 
        ${body.target_time || null}, 
        ${body.duration_minutes || 0}, 
        ${body.priority || 'none'},
        ${body.start_date || null},
        ${body.end_date || null},
        TRUE,
        ${userId}
      )
      RETURNING *
    `

    return NextResponse.json({
      success: true,
      data: newItem[0]
    }, { status: 201 })

  } catch (error: any) {
    console.error('[POST /api/items] Error:', error)
    return NextResponse.json(
      { error: 'Failed to create item', details: error.message },
      { status: 500 }
    )
  }
}
