import { NextResponse } from 'next/server'
import sql from '@/lib/db'
import { getAuthUserId } from '@/lib/auth-utils'

export async function GET() {
    try {
        const userId = await getAuthUserId();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // 1. Check for active smuggler event
        const now = new Date();
        const activeEvents = await sql`
            SELECT se.*, 
                   i1.name as item_1_name, i1.description as item_1_description, i1.icon as item_1_icon, i1.rarity as item_1_rarity, i1.price as item_1_base_price,
                   i2.name as item_2_name, i2.description as item_2_description, i2.icon as item_2_icon, i2.rarity as item_2_rarity, i2.price as item_2_base_price
            FROM smuggler_events se
            JOIN items i1 ON se.item_1_id = i1.id
            JOIN items i2 ON se.item_2_id = i2.id
            WHERE se.user_id = ${userId} AND se.expires_at > ${now}
            ORDER BY se.expires_at DESC
            LIMIT 1
        `;

        if (activeEvents.length > 0) {
            return NextResponse.json({
                success: true,
                active: true,
                event: activeEvents[0]
            });
        }

        // 2. Check if we should spawn one (20% chance)
        // Only roll if no event was recently expired to avoid spamming? 
        // For simplicity, 20% on every fetch until one spawns.
        const spawnRoll = Math.random();
        if (spawnRoll < 0.20) {
            // Spawn logic: pick 2 random items
            // Include both regular shop items and exclusive smuggler items
            const allItems = await sql`SELECT * FROM items WHERE is_purchasable = TRUE OR id IN ('smoke_bomb', 'time_turner')`;
            
            if (allItems.length < 2) {
                return NextResponse.json({ success: true, active: false });
            }

            // Pick 2 distinct random items
            const indices = new Set<number>();
            while (indices.size < 2) {
                indices.add(Math.floor(Math.random() * allItems.length));
            }
            const [idx1, idx2] = Array.from(indices);
            const item1 = allItems[idx1];
            const item2 = allItems[idx2];

            // Calculate discounts (30-50%)
            const discount1 = 0.5 + (Math.random() * 0.2); // 0.5 to 0.7 of base price
            const discount2 = 0.5 + (Math.random() * 0.2);
            
            const price1 = Math.round((item1.price || 500) * discount1);
            const price2 = Math.round((item2.price || 500) * discount2);

            const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours from now

            const newEvent = await sql`
                INSERT INTO smuggler_events (user_id, item_1_id, item_1_discount_price, item_2_id, item_2_discount_price, expires_at)
                VALUES (${userId}, ${item1.id}, ${price1}, ${item2.id}, ${price2}, ${expiresAt})
                RETURNING *
            `;

            // Return with item details
            return NextResponse.json({
                success: true,
                active: true,
                event: {
                    ...newEvent[0],
                    item_1_name: item1.name,
                    item_1_description: item1.description,
                    item_1_icon: item1.icon,
                    item_1_rarity: item1.rarity,
                    item_1_base_price: item1.price,
                    item_2_name: item2.name,
                    item_2_description: item2.description,
                    item_2_icon: item2.icon,
                    item_2_rarity: item2.rarity,
                    item_2_base_price: item2.price
                }
            });
        }

        return NextResponse.json({
            success: true,
            active: false
        });

    } catch (error: any) {
        console.error('[GET /api/shop/smuggler] Error:', error);
        return NextResponse.json({ error: 'Failed to access the Smuggler', details: error.message }, { status: 500 });
    }
}
