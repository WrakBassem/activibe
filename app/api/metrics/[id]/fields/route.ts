import { NextResponse } from 'next/server'
import sql from '@/lib/db'
import { getAuthUserId } from '@/lib/auth-utils'

export const dynamic = 'force-dynamic'

// GET /api/metrics/[id]/fields - list all fields for a metric
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getAuthUserId()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params

    const fields = await sql`
      SELECT * FROM metric_fields
      WHERE metric_id = ${id}
      ORDER BY sort_order ASC, created_at ASC
    `
    return NextResponse.json({ success: true, data: fields })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// POST /api/metrics/[id]/fields - create a new field
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getAuthUserId()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const body = await request.json()
    const { name, label, field_type, sort_order } = body

    if (!name || !field_type) {
      return NextResponse.json({ error: 'name and field_type are required' }, { status: 400 })
    }

    const validTypes = ['int', 'boolean', 'scale_0_5', 'text']
    if (!validTypes.includes(field_type)) {
      return NextResponse.json({ error: `field_type must be one of: ${validTypes.join(', ')}` }, { status: 400 })
    }

    const created = await sql`
      INSERT INTO metric_fields (metric_id, name, label, field_type, sort_order)
      VALUES (${id}, ${name}, ${label || name}, ${field_type}, ${sort_order ?? 0})
      RETURNING *
    `
    return NextResponse.json({ success: true, data: created[0] }, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// PUT /api/metrics/[id]/fields - update a field
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getAuthUserId()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const body = await request.json()
    const { field_id, ...updates } = body

    if (!field_id) return NextResponse.json({ error: 'field_id required' }, { status: 400 })

    const allowed: any = {}
    if (updates.name !== undefined) allowed.name = updates.name
    if (updates.label !== undefined) allowed.label = updates.label
    if (updates.field_type !== undefined) allowed.field_type = updates.field_type
    if (updates.active !== undefined) allowed.active = updates.active
    if (updates.sort_order !== undefined) allowed.sort_order = updates.sort_order

    if (Object.keys(allowed).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
    }

    const updated = await sql`
      UPDATE metric_fields SET ${sql(allowed)}
      WHERE id = ${field_id} AND metric_id = ${id}
      RETURNING *
    `
    if (updated.length === 0) return NextResponse.json({ error: 'Field not found' }, { status: 404 })

    return NextResponse.json({ success: true, data: updated[0] })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// DELETE /api/metrics/[id]/fields?field_id=xxx
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getAuthUserId()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const { searchParams } = new URL(request.url)
    const field_id = searchParams.get('field_id')
    if (!field_id) return NextResponse.json({ error: 'field_id query param required' }, { status: 400 })

    await sql`
      DELETE FROM metric_fields WHERE id = ${field_id} AND metric_id = ${id}
    `
    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
