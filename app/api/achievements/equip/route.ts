import { NextResponse } from 'next/server'
import sql from '@/lib/db'
import { getAuthUserId } from '@/lib/auth-utils'

// POST /api/achievements/equip
export async function POST(request: Request) {
  try {
    const userId = await getAuthUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { achievement_id } = await request.json()

    // If achievement_id is null/empty, unequip current title
    if (!achievement_id) {
        await sql`UPDATE users SET active_title = NULL WHERE id = ${userId}`
        return NextResponse.json({ success: true, message: 'Title unequipped.' })
    }

    // Verify the user actually unlocked it
    const check = await sql`
        SELECT 1 FROM user_achievements 
        WHERE user_id = ${userId} AND achievement_id = ${achievement_id}
    `

    if (check.length === 0) {
        return NextResponse.json({ error: 'You have not unlocked this title yet.' }, { status: 403 })
    }

    // Equip it
    await sql`UPDATE users SET active_title = ${achievement_id} WHERE id = ${userId}`

    return NextResponse.json({ success: true, message: 'Title equipped!' })

  } catch (error: any) {
    console.error('[POST /api/achievements/equip] Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
