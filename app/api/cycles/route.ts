import { NextResponse } from 'next/server'
import sql from '@/lib/db'
import { getAuthUserId } from '@/lib/auth-utils'

// GET /api/cycles - List all cycles with their weights
export async function GET() {
  try {
    const userId = await getAuthUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch cycles
    const cycles = await sql`
      SELECT * FROM priority_cycles 
      ORDER BY start_date DESC
    `

    // Fetch weights for all cycles
    // (Optimization: could be a join, but separate queries are often cleaner for 1-to-many formatting)
    const weights = await sql`
        SELECT 
            aw.*,
            a.name as axis_name
        FROM axis_weights aw
        JOIN axes a ON aw.axis_id = a.id
    `

    // Group weights by cycle_id
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

// POST /api/cycles - Create new cycle (optionally with weights)
export async function POST(request: Request) {
  try {
    const userId = await getAuthUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    
    // Validation
    if (!body.name || !body.start_date || !body.end_date) {
      return NextResponse.json(
        { error: 'Name, Start Date, and End Date are required' },
        { status: 400 }
      )
    }

    // Transaction-like approach (manual rollback if needed, or just sequential)
    // 1. Create Cycle
    const newCycle = await sql`
      INSERT INTO priority_cycles (name, start_date, end_date)
      VALUES (${body.name}, ${body.start_date}, ${body.end_date})
      RETURNING *
    `
    const cycleId = newCycle[0].id

    // 2. Create Weights if provided
    let createdWeights: any[] = [];
    if (body.weights && Array.isArray(body.weights)) {
        for (const w of body.weights) {
            // w should have { axis_id, weight_percentage }
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

// PUT /api/cycles - Update cycle (including weights replacement)
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

        // 1. Update Cycle details
        const updateData: any = {};
        if (body.name !== undefined) updateData.name = body.name;
        if (body.start_date !== undefined) updateData.start_date = body.start_date;
        if (body.end_date !== undefined) updateData.end_date = body.end_date;

        let updatedCycle;
        if (Object.keys(updateData).length > 0) {
            updatedCycle = await sql`
                UPDATE priority_cycles
                SET ${sql(updateData)}
                WHERE id = ${body.id}
                RETURNING *
            `
        } else {
            // If no fields to update, just fetch existing
            updatedCycle = await sql`SELECT * FROM priority_cycles WHERE id = ${body.id}`
        }

        if (updatedCycle.length === 0) {
            return NextResponse.json({ error: 'Cycle not found' }, { status: 404 })
        }

        // 2. Update Weights if provided
        // Strategy: Delete existing and insert new if "weights" array is present
        let currentWeights: any[] = [];
        if (body.weights && Array.isArray(body.weights)) {
            // Delete old weights
            await sql`DELETE FROM axis_weights WHERE cycle_id = ${body.id}`

            // Insert new weights
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
            // If weights not provided, fetch existing to return consistent object
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
