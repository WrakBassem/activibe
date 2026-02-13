import { NextResponse } from 'next/server'
import sql from '@/lib/db'

// DELETE /api/items/[id] - Deactivate an item
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id
    
    // Soft delete by setting is_active = FALSE
    const result = await sql`
      UPDATE tracking_items 
      SET is_active = FALSE 
      WHERE id = ${id}
      RETURNING *
    `

    if (result.length === 0) {
      return NextResponse.json(
        { error: 'Item not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Item deactivated',
      data: result[0]
    })

  } catch (error: any) {
    console.error('[DELETE /api/items/[id]] Error:', error)
    return NextResponse.json(
      { error: 'Failed to delete item', details: error.message },
      { status: 500 }
    )
  }
}
