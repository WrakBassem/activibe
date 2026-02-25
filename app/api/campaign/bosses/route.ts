import { NextResponse } from 'next/server'
import sql from '@/lib/db'

export async function GET() {
    try {
        const bosses = await sql`
            SELECT stage_number, name, description, max_health, reward_xp, reward_gold, reward_item_rarity, image_url 
            FROM campaign_bosses 
            ORDER BY stage_number ASC
        `
        return NextResponse.json({ success: true, data: bosses })
    } catch (error: any) {
        console.error('[GET /api/campaign/bosses] Error:', error)
        return NextResponse.json({ error: 'Failed to fetch bosses', details: error.message }, { status: 500 })
    }
}
