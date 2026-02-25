import { NextResponse } from 'next/server'
import sql from '@/lib/db'
import { getAuthUserId } from '@/lib/auth-utils'

// GET /api/axes - List all axes for the current user
export async function GET() {
  try {
    const userId = await getAuthUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const axes = await sql`
      SELECT * FROM axes 
      WHERE user_id = ${userId}
      ORDER BY created_at ASC
    `

    return NextResponse.json({
      success: true,
      data: axes
    })
  } catch (error: any) {
    console.error('[GET /api/axes] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch axes', details: error.message },
      { status: 500 }
    )
  }
}

// POST /api/axes - Create new axis for the current user
export async function POST(request: Request) {
  try {
    const userId = await getAuthUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    
    if (!body.name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      )
    }

    const newAxis = await sql`
      INSERT INTO axes (name, description, active, user_id)
      VALUES (${body.name}, ${body.description || null}, ${body.active !== false}, ${userId})
      RETURNING *
    `

    return NextResponse.json({
      success: true,
      data: newAxis[0]
    }, { status: 201 })

  } catch (error: any) {
    console.error('[POST /api/axes] Error:', error)
    return NextResponse.json(
      { error: 'Failed to create axis', details: error.message },
      { status: 500 }
    )
  }
}

// PUT /api/axes - Update axis (owner-only)
export async function PUT(request: Request) {
    try {
      const userId = await getAuthUserId()
      if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
  
      const body = await request.json()
      
      if (!body.id) {
        return NextResponse.json(
          { error: 'ID is required' },
          { status: 400 }
        )
      }
  
      const updateData: any = {};
      if (body.name !== undefined) updateData.name = body.name;
      if (body.description !== undefined) updateData.description = body.description;
      if (body.active !== undefined) updateData.active = body.active;

      if (Object.keys(updateData).length === 0) {
          return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
      }

      const updatedAxis = await sql`
        UPDATE axes 
        SET ${sql(updateData)}
        WHERE id = ${body.id} AND user_id = ${userId}
        RETURNING *
      `
  
      if (updatedAxis.length === 0) {
        return NextResponse.json({ error: 'Axis not found or access denied' }, { status: 404 })
      }

      return NextResponse.json({
        success: true,
        data: updatedAxis[0]
      })
  
    } catch (error: any) {
      console.error('[PUT /api/axes] Error:', error)
      return NextResponse.json(
        { error: 'Failed to update axis', details: error.message },
        { status: 500 }
      )
    }
  }

// DELETE /api/axes - Delete axis (owner-only)
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

        const result = await sql`DELETE FROM axes WHERE id = ${id} AND user_id = ${userId} RETURNING id`

        if (result.length === 0) {
            return NextResponse.json({ error: 'Axis not found or access denied' }, { status: 404 })
        }

        return NextResponse.json({
            success: true,
            message: 'Axis deleted'
        })
    } catch (error: any) {
        console.error('[DELETE /api/axes] Error:', error)
        return NextResponse.json(
            { error: 'Failed to delete axis', details: error.message },
            { status: 500 }
        )
    }
}
