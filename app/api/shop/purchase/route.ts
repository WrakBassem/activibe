import { NextResponse } from 'next/server'
import sql from '@/lib/db'
import { getAuthUserId } from '@/lib/auth-utils'
import { deductGold } from '@/lib/gamification'

export async function POST(request: Request) {
    try {
        const userId = await getAuthUserId();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { item_id, smuggler_event_id } = body;

        if (!item_id) {
            return NextResponse.json({ error: 'item_id is required' }, { status: 400 });
        }

        // 1. Fetch item details & determine price
        let price = 0;
        let item = null;

        if (smuggler_event_id) {
            const now = new Date();
            const events = await sql`
                SELECT * FROM smuggler_events 
                WHERE id = ${smuggler_event_id} AND user_id = ${userId} AND expires_at > ${now}
            `;
            if (events.length === 0) {
                return NextResponse.json({ error: 'Smuggler event not found or expired' }, { status: 404 });
            }
            const event = events[0];

            if (event.item_1_id === item_id) {
                price = event.item_1_discount_price;
            } else if (event.item_2_id === item_id) {
                price = event.item_2_discount_price;
            } else {
                return NextResponse.json({ error: 'Item not part of this smuggler event' }, { status: 400 });
            }

            const items = await sql`SELECT * FROM items WHERE id = ${item_id}`;
            item = items[0];
        } else {
            const items = await sql`SELECT * FROM items WHERE id = ${item_id} AND is_purchasable = TRUE`;
            if (items.length === 0) {
                return NextResponse.json({ error: 'Item not found or not purchasable' }, { status: 404 });
            }
            item = items[0];
            price = item.price || 0;
        }

        // 2. Enforce Stack Limits for Passives/Cosmetics
        if (item.category === 'combat_gear' || item.category === 'cosmetic') {
            const existingPassives = await sql`SELECT stacks FROM user_passives WHERE user_id = ${userId} AND item_id = ${item_id}`;
            let currentStacks = 0;
            if (existingPassives.length > 0) {
                currentStacks = existingPassives[0].stacks;
            }

            let maxStacks = 1;
            if (item.name === 'Iron Will Plating') maxStacks = 3;
            if (item.name === 'Focus Gauntlets') maxStacks = 2;

            if (currentStacks >= maxStacks) {
                return NextResponse.json({ error: 'You have reached the maximum stacks for this item.' }, { status: 400 });
            }
        }

        // 3. Deduct Gold securely
        try {
            await deductGold(userId, price);
        } catch (err: any) {
            if (err.message === 'Insufficient Gold') {
                return NextResponse.json({ error: 'Insufficient Gold' }, { status: 400 });
            }
            throw err;
        }

        // 4. Grant Item
        if (item.category === 'consumable') {
            await sql`
                INSERT INTO user_inventory (user_id, item_id, quantity)
                VALUES (${userId}, ${item_id}, 1)
                ON CONFLICT (user_id, item_id)
                DO UPDATE SET quantity = user_inventory.quantity + 1, last_acquired_at = CURRENT_TIMESTAMP
            `;
        } else if (item.category === 'combat_gear' || item.category === 'cosmetic') {
            await sql`
                INSERT INTO user_passives (user_id, item_id, stacks)
                VALUES (${userId}, ${item_id}, 1)
                ON CONFLICT (user_id, item_id)
                DO UPDATE SET stacks = user_passives.stacks + 1, updated_at = CURRENT_TIMESTAMP
            `;
        }

        return NextResponse.json({
            success: true,
            message: `Successfully purchased ${item.name}!`
        });

    } catch (error: any) {
        console.error('[POST /api/shop/purchase] Error:', error);
        return NextResponse.json({ error: 'Failed to complete purchase', details: error.message }, { status: 500 });
    }
}
