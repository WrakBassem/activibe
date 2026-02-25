import { NextResponse } from 'next/server'
import sql from '@/lib/db'
import { getAuthUserId } from '@/lib/auth-utils'

// GET: Fetch User Inventory and Active Buffs
export async function GET(request: Request) {
    try {
        const userId = await getAuthUserId()
        if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        // Fetch Inventory
        const inventory = await sql`
            SELECT ui.quantity, i.*
            FROM user_inventory ui
            JOIN items i ON ui.item_id = i.id
            WHERE ui.user_id = ${userId} AND ui.quantity > 0
            ORDER BY 
                CASE i.rarity 
                    WHEN 'legendary' THEN 1 
                    WHEN 'epic' THEN 2 
                    WHEN 'rare' THEN 3 
                    WHEN 'common' THEN 4 
                    ELSE 5 
                END
        `

        // Fetch Active Buffs
        const activeBuffs = await sql`
            SELECT ab.id as buff_id, ab.expires_at, i.*
            FROM active_buffs ab
            JOIN items i ON ab.item_id = i.id
            WHERE ab.user_id = ${userId} AND ab.expires_at > CURRENT_TIMESTAMP
            ORDER BY ab.expires_at ASC
        `

        // Cleanup expired buffs implicitly (fire and forget)
        sql`DELETE FROM active_buffs WHERE expires_at <= CURRENT_TIMESTAMP`.catch(console.error)

        return NextResponse.json({
            success: true,
            data: {
                inventory,
                activeBuffs
            }
        })

    } catch (error: any) {
        console.error('[GET /api/inventory] Error:', error)
        return NextResponse.json({ error: 'Failed to fetch inventory' }, { status: 500 })
    }
}

// POST: Consume an Item
export async function POST(request: Request) {
    try {
        const userId = await getAuthUserId()
        if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const body = await request.json()
        const { itemId } = body

        if (!itemId) return NextResponse.json({ error: 'Missing item ID' }, { status: 400 })

        // 1. Verify Ownership
        const ownership = await sql`
            SELECT quantity FROM user_inventory 
            WHERE user_id = ${userId} AND item_id = ${itemId}
        `
        if (ownership.length === 0 || ownership[0].quantity <= 0) {
            return NextResponse.json({ error: 'You do not own this item' }, { status: 403 })
        }

        // 2. Fetch Item Details
        const items = await sql`SELECT * FROM items WHERE id = ${itemId}`
        const item = items[0]

        // 3. Prevent stacking unique buffs (like streak_freeze) if one is already active
        if (item.effect_type === 'freeze_streak') {
            const activeFreeze = await sql`
                SELECT id FROM active_buffs 
                WHERE user_id = ${userId} AND item_id = ${itemId} 
                AND expires_at > CURRENT_TIMESTAMP
            `
            if (activeFreeze.length > 0) {
                 return NextResponse.json({ error: 'You already have an active Streak Freeze.' }, { status: 400 })
            }
        }

        // 4. Begin Consume Transaction
        // Decrement inventory
        await sql`
            UPDATE user_inventory 
            SET quantity = quantity - 1 
            WHERE user_id = ${userId} AND item_id = ${itemId}
        `

        // Apply Effect
        let effectMessage = `Consumed ${item.name}`

        if (item.effect_type === 'xp_boost') {
            // Apply 24 hour buff
            await sql`
                INSERT INTO active_buffs (user_id, item_id, expires_at)
                VALUES (${userId}, ${itemId}, CURRENT_TIMESTAMP + INTERVAL '24 hours')
            `
            effectMessage = `Gained +${item.effect_value}% XP for 24 hours!`
        } 
        else if (item.effect_type === 'freeze_streak') {
             // Streak freeze lasts a long time (e.g., a week or until used by the cron job)
             await sql`
                INSERT INTO active_buffs (user_id, item_id, expires_at)
                VALUES (${userId}, ${itemId}, CURRENT_TIMESTAMP + INTERVAL '14 days')
            `
            effectMessage = `Next missed day is protected! (Valid for 14 days)`
        }
        else if (item.effect_type === 'instant_insight') {
            // Immediately call the insight generation (or rely on a webhook/background job here depending on time limit)
            // For now, we'll return a specific flag so the frontend knows to fetch the new report
            effectMessage = `Oracle Insight triggered! Generating new roadmap...`
            return NextResponse.json({ success: true, message: effectMessage, trigger_action: 'refresh_insights' })
        }
        else if (item.effect_type === 'hide_negatives_24h') {
            await sql`
                INSERT INTO active_buffs (user_id, item_id, expires_at)
                VALUES (${userId}, ${itemId}, CURRENT_TIMESTAMP + INTERVAL '24 hours')
            `
            effectMessage = `Smoke Bomb deployed! Negatives are now hidden for 24 hours.`
        }
        else if (item.effect_type === 'edit_past_log') {
            // Persist the buff so the daily API can verify it
            await sql`
                INSERT INTO active_buffs (user_id, item_id, expires_at)
                VALUES (${userId}, ${itemId}, CURRENT_TIMESTAMP + INTERVAL '1 hour')
            `
            effectMessage = `Time Turner active! You have 1 hour to edit yesterday's log.`
            return NextResponse.json({ success: true, message: effectMessage, trigger_action: 'edit_yesterday' })
        }

        return NextResponse.json({ success: true, message: effectMessage })

    } catch (error: any) {
        console.error('[POST /api/inventory] Consume Error:', error)
        return NextResponse.json({ error: 'Failed to consume item' }, { status: 500 })
    }
}
