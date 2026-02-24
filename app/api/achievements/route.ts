import { NextResponse } from 'next/server'
import sql from '@/lib/db'
import { getAuthUserId } from '@/lib/auth-utils'
import { ACHIEVEMENTS } from '@/lib/achievements'

// GET /api/achievements
// Returns the full list of achievements and boolean flags for unlocked/equipped
export async function GET(request: Request) {
  try {
    const userId = await getAuthUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 1. Fetch user's active title
    const userRows = await sql`SELECT active_title FROM users WHERE id = ${userId}`
    const activeTitleId = userRows[0]?.active_title || null

    // 2. Fetch user's unlocked achievements
    const unlockedRows = await sql`SELECT achievement_id, unlocked_at FROM user_achievements WHERE user_id = ${userId}`
    
    const unlockedMap: Record<string, string> = {}
    unlockedRows.forEach(row => {
        unlockedMap[row.achievement_id] = row.unlocked_at
    })

    // 3. Map the static definitions with the dynamic user state
    const responseData = ACHIEVEMENTS.map(ach => ({
        id: ach.id,
        title: ach.title,
        description: ach.description,
        icon: ach.icon,
        xp_reward: ach.xp_reward,
        is_unlocked: !!unlockedMap[ach.id],
        unlocked_at: unlockedMap[ach.id] || null,
        is_equipped: activeTitleId === ach.id
    }))

    return NextResponse.json({
        success: true,
        data: responseData,
        active_title_id: activeTitleId
    })

  } catch (error: any) {
    console.error('[GET /api/achievements] Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
