import { NextResponse } from 'next/server'
import sql from '@/lib/db'
import { getAuthUserId } from '@/lib/auth-utils'

export async function GET() {
    try {
        const userId = await getAuthUserId();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Fetch all purchasable items
        const shopItems = await sql`
            SELECT id, name, description, effect_type, icon, rarity, price, category
            FROM items
            WHERE is_purchasable = TRUE
            ORDER BY price ASC
        `;

        // Fetch user's current gold balance
        const users = await sql`SELECT gold FROM users WHERE id = ${userId}`;
        const gold = users.length > 0 ? (users[0].gold || 0) : 0;

        // Fetch user's passives to know what combat gear they already own
        const passives = await sql`
            SELECT up.item_id, up.stacks, i.name
            FROM user_passives up
            JOIN items i ON up.item_id = i.id
            WHERE up.user_id = ${userId}
        `;

        return NextResponse.json({
            success: true,
            data: {
                gold,
                items: shopItems,
                passives
            }
        });

    } catch (error: any) {
        console.error('[GET /api/shop] Error:', error);
        return NextResponse.json({ error: 'Failed to fetch shop inventory', details: error.message }, { status: 500 });
    }
}
