import { NextResponse } from 'next/server'
import sql from '@/lib/db'
import { getAuthUserId } from '@/lib/auth-utils'

// GET /api/coach/profile — Fetch user profile
export async function GET() {
  try {
    const userId = await getAuthUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const rows = await sql`
      SELECT * FROM user_profile 
      WHERE user_id = ${userId} 
      LIMIT 1
    `
    
    return NextResponse.json({
      success: true,
      data: rows[0] || null,
    })
  } catch (error: any) {
    console.error('[GET /api/coach/profile] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch profile', details: error.message },
      { status: 500 }
    )
  }
}

// POST /api/coach/profile — Save/update user profile
export async function POST(request: Request) {
  try {
    const userId = await getAuthUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()

    // Check if profile exists for this user
    const existing = await sql`
      SELECT id FROM user_profile 
      WHERE user_id = ${userId} 
      LIMIT 1
    `

    let result
    if (existing.length > 0) {
      // Update existing profile
      result = await sql`
        UPDATE user_profile SET
          core_values = COALESCE(${body.values ? JSON.stringify(body.values) : null}::jsonb, core_values),
          goals = COALESCE(${body.goals ? JSON.stringify(body.goals) : null}::jsonb, goals),
          keep = COALESCE(${body.keep ? JSON.stringify(body.keep) : null}::jsonb, keep),
          quit = COALESCE(${body.quit ? JSON.stringify(body.quit) : null}::jsonb, quit),
          life_areas = COALESCE(${body.life_areas ? JSON.stringify(body.life_areas) : null}::jsonb, life_areas),
          onboarding_complete = COALESCE(${body.onboarding_complete ?? null}, onboarding_complete),
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ${existing[0].id}
        RETURNING *
      `
    } else {
      // Create new profile
      result = await sql`
        INSERT INTO user_profile (
          core_values, 
          goals, 
          keep, 
          quit, 
          life_areas, 
          onboarding_complete,
          user_id
        )
        VALUES (
          ${JSON.stringify(body.values || [])}::jsonb,
          ${JSON.stringify(body.goals || [])}::jsonb,
          ${JSON.stringify(body.keep || [])}::jsonb,
          ${JSON.stringify(body.quit || [])}::jsonb,
          ${JSON.stringify(body.life_areas || {})}::jsonb,
          ${body.onboarding_complete || false},
          ${userId}
        )
        RETURNING *
      `
    }

    return NextResponse.json({
      success: true,
      data: result[0],
    })
  } catch (error: any) {
    console.error('[POST /api/coach/profile] Error:', error)
    return NextResponse.json(
      { error: 'Failed to save profile', details: error.message },
      { status: 500 }
    )
  }
}
