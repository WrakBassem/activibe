import { NextResponse } from 'next/server'
import sql from '@/lib/db'
import { getAuthUserId } from '@/lib/auth-utils'
import { canAccessFeature } from '@/lib/permissions'
import { getUserXPStatus } from '@/lib/gamification'

export async function PUT(request: Request) {
    try {
        const userId = await getAuthUserId()
        if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const body = await request.json()
        const { active } = body

        if (active) {
            // 1. Check if they meet the RPG requirement
            const status = await getUserXPStatus(userId)
            if (!status) return NextResponse.json({ error: 'User not found' }, { status: 404 })

            if (!canAccessFeature('hardcore_mode', status.attributes)) {
                return NextResponse.json({ error: 'Locked: Requires Discipline Level 5' }, { status: 403 })
            }

            // 2. Activate
            await sql`
                UPDATE users 
                SET hardcore_mode_active = TRUE, 
                    hardcore_start_date = CURRENT_TIMESTAMP
                WHERE id = ${userId}
            `
            return NextResponse.json({ success: true, message: 'Hardcore Mode Activated! 💀' })
        } else {
            // 3. Deactivate (Simple toggle off)
            await sql`
                UPDATE users 
                SET hardcore_mode_active = FALSE 
                WHERE id = ${userId}
            `
            return NextResponse.json({ success: true, message: 'Hardcore Mode Disabled.' })
        }

    } catch (error: any) {
        console.error('[PUT /api/settings/hardcore] Error:', error)
        return NextResponse.json({ error: 'Failed to update hardcore mode' }, { status: 500 })
    }
}
