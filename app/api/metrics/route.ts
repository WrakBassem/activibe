import { NextResponse } from 'next/server'
import sql from '@/lib/db'
import { getAuthUserId } from '@/lib/auth-utils'

// GET /api/metrics - List all metrics with axis info
export async function GET() {
  try {
    const userId = await getAuthUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch metrics joined with axes
    const metrics = await sql`
      SELECT 
        m.*,
        a.name as axis_name
      FROM metrics m
      JOIN axes a ON m.axis_id = a.id
      ORDER BY a.name, m.name
    `

    return NextResponse.json({
      success: true,
      data: metrics
    })
  } catch (error: any) {
    console.error('[GET /api/metrics] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch metrics', details: error.message },
      { status: 500 }
    )
  }
}

// POST /api/metrics - Create new metric
export async function POST(request: Request) {
  try {
    const userId = await getAuthUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    
    // Validation
    if (!body.name || !body.axis_id || !body.max_points) {
      return NextResponse.json(
        { error: 'Name, Axis ID, and Max Points are required' },
        { status: 400 }
      )
    }

    const newMetric = await sql`
      INSERT INTO metrics (
        axis_id, 
        name, 
        rule_description, 
        max_points, 
        difficulty_level,
        active
      )
      VALUES (
        ${body.axis_id}, 
        ${body.name}, 
        ${body.rule_description || null}, 
        ${body.max_points}, 
        ${body.difficulty_level || 3},
        ${body.active !== false}
      )
      RETURNING *
    `

    return NextResponse.json({
      success: true,
      data: newMetric[0]
    }, { status: 201 })

  } catch (error: any) {
    console.error('[POST /api/metrics] Error:', error)
    return NextResponse.json(
      { error: 'Failed to create metric', details: error.message },
      { status: 500 }
    )
  }
}

// PUT /api/metrics - Update metric
export async function PUT(request: Request) {
    try {
        const userId = await getAuthUserId()
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()

        if (!body.id) {
            return NextResponse.json({ error: 'ID is required' }, { status: 400 })
        }

        const updateData: any = {};
        if (body.axis_id !== undefined) updateData.axis_id = body.axis_id;
        if (body.name !== undefined) updateData.name = body.name;
        if (body.rule_description !== undefined) updateData.rule_description = body.rule_description;
        if (body.max_points !== undefined) updateData.max_points = body.max_points;
        if (body.difficulty_level !== undefined) updateData.difficulty_level = body.difficulty_level;
        if (body.active !== undefined) updateData.active = body.active;

        if (Object.keys(updateData).length === 0) {
            return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
        }

        const updatedMetric = await sql`
            UPDATE metrics
            SET ${sql(updateData)}
            WHERE id = ${body.id}
            RETURNING *
        `
        
        if (updatedMetric.length === 0) {
            return NextResponse.json({ error: 'Metric not found' }, { status: 404 })
        }

        return NextResponse.json({
            success: true,
            data: updatedMetric[0]
        })

    } catch (error: any) {
        console.error('[PUT /api/metrics] Error:', error)
        return NextResponse.json(
            { error: 'Failed to update metric', details: error.message },
            { status: 500 }
        )
    }
}
