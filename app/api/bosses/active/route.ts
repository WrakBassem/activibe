import { NextResponse } from 'next/server'
import sql from '@/lib/db'
import { getAuthUserId } from '@/lib/auth-utils'

export async function GET() {
    try {
        const userId = await getAuthUserId()
        if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        // 1. Fetch active boss for the user
        // We look for any record in active_bosses where defeated_at is NULL
        const activeEncounters = await sql`
            SELECT ab.id as encounter_id, ab.current_health, b.*
            FROM active_bosses ab
            JOIN bosses b ON ab.boss_id = b.id
            WHERE ab.user_id = ${userId} AND ab.defeated_at IS NULL
            LIMIT 1
        `

        if (activeEncounters.length === 0) {
            return NextResponse.json({ success: true, data: null })
        }

        return NextResponse.json({
            success: true,
            data: activeEncounters[0]
        })

    } catch (error: any) {
        console.error('[GET /api/bosses/active] Error:', error)
        return NextResponse.json({ error: 'Failed to fetch active boss' }, { status: 500 })
    }
}
