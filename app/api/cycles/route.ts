import { NextResponse } from 'next/server'
import sql from '@/lib/db'
import { getAuthUserId } from '@/lib/auth-utils'

// GET /api/cycles - List all cycles with their weights (per-user)
export async function GET() {
  try {
    const userId = await getAuthUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const cycles = await sql`
      SELECT * FROM priority_cycles 
      WHERE user_id = ${userId}
      ORDER BY start_date DESC
    `

    const weights = await sql`
        SELECT 
            aw.*,
            a.name as axis_name
        FROM axis_weights aw
        JOIN axes a ON aw.axis_id = a.id
        JOIN priority_cycles pc ON aw.cycle_id = pc.id
        WHERE pc.user_id = ${userId}
    `

    const cyclesWithWeights = cycles.map(cycle => ({
        ...cycle,
        weights: weights.filter(w => w.cycle_id === cycle.id)
    }))

    return NextResponse.json({
      success: true,
      data: cyclesWithWeights
    })
  } catch (error: any) {
    console.error('[GET /api/cycles] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch cycles', details: error.message },
      { status: 500 }
    )
  }
}

// POST /api/cycles - Create new cycle for the current user
export async function POST(request: Request) {
  try {
    const userId = await getAuthUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    
    if (!body.name || !body.start_date || !body.end_date) {
      return NextResponse.json(
        { error: 'Name, Start Date, and End Date are required' },
        { status: 400 }
      )
    }

    const newCycle = await sql`
      INSERT INTO priority_cycles (name, start_date, end_date, user_id)
      VALUES (${body.name}, ${body.start_date}, ${body.end_date}, ${userId})
      RETURNING *
    `
    const cycleId = newCycle[0].id

    let createdWeights: any[] = [];
    if (body.weights && Array.isArray(body.weights)) {
        for (const w of body.weights) {
            if (w.axis_id && w.weight_percentage !== undefined) {
                const newWeight = await sql`
                    INSERT INTO axis_weights (cycle_id, axis_id, weight_percentage)
                    VALUES (${cycleId}, ${w.axis_id}, ${w.weight_percentage})
                    RETURNING *
                `
                createdWeights.push(newWeight[0]);
            }
        }
    }

    return NextResponse.json({
      success: true,
      data: {
          ...newCycle[0],
          weights: createdWeights
      }
    }, { status: 201 })

  } catch (error: any) {
    console.error('[POST /api/cycles] Error:', error)
    return NextResponse.json(
      { error: 'Failed to create cycle', details: error.message },
      { status: 500 }
    )
  }
}

// PUT /api/cycles - Update cycle (owner-only)
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
        if (body.name !== undefined) updateData.name = body.name;
        if (body.start_date !== undefined) updateData.start_date = body.start_date;
        if (body.end_date !== undefined) updateData.end_date = body.end_date;

        let updatedCycle;
        if (Object.keys(updateData).length > 0) {
            updatedCycle = await sql`
                UPDATE priority_cycles
                SET ${sql(updateData)}
                WHERE id = ${body.id} AND user_id = ${userId}
                RETURNING *
            `
        } else {
            updatedCycle = await sql`
                SELECT * FROM priority_cycles WHERE id = ${body.id} AND user_id = ${userId}
            `
        }

        if (updatedCycle.length === 0) {
            return NextResponse.json({ error: 'Cycle not found or access denied' }, { status: 404 })
        }

        let currentWeights: any[] = [];
        if (body.weights && Array.isArray(body.weights)) {
            await sql`DELETE FROM axis_weights WHERE cycle_id = ${body.id}`
            for (const w of body.weights) {
                if (w.axis_id && w.weight_percentage !== undefined) {
                    const newWeight = await sql`
                        INSERT INTO axis_weights (cycle_id, axis_id, weight_percentage)
                        VALUES (${body.id}, ${w.axis_id}, ${w.weight_percentage})
                        RETURNING *
                    `
                    currentWeights.push(newWeight[0]);
                }
            }
        } else {
            currentWeights = await sql`SELECT * FROM axis_weights WHERE cycle_id = ${body.id}`
        }

        return NextResponse.json({
            success: true,
            data: {
                ...updatedCycle[0],
                weights: currentWeights
            }
        })

    } catch (error: any) {
        console.error('[PUT /api/cycles] Error:', error)
        return NextResponse.json(
            { error: 'Failed to update cycle', details: error.message },
            { status: 500 }
        )
    }
}

// DELETE /api/cycles - Delete cycle (owner-only)
export async function DELETE(request: Request) {
    try {
        const userId = await getAuthUserId()
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const id = searchParams.get('id')

        if (!id) {
            return NextResponse.json({ error: 'ID is required' }, { status: 400 })
        }

        const result = await sql`
            DELETE FROM priority_cycles WHERE id = ${id} AND user_id = ${userId} RETURNING id
        `

        if (result.length === 0) {
            return NextResponse.json({ error: 'Cycle not found or access denied' }, { status: 404 })
        }

        return NextResponse.json({ success: true, message: 'Cycle deleted' })
    } catch (error: any) {
        console.error('[DELETE /api/cycles] Error:', error)
        return NextResponse.json(
            { error: 'Failed to delete cycle', details: error.message },
            { status: 500 }
        )
    }
}
