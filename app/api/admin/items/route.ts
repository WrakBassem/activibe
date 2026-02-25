import { NextResponse } from 'next/server';
import sql from '@/lib/db';
import { getAuthUserId } from '@/lib/auth-utils';
import { ensureAdmin } from '@/lib/admin-utils';

export async function GET() {
  try {
    const userId = await getAuthUserId();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    await ensureAdmin(userId);

    const items = await sql`SELECT * FROM items ORDER BY category, price ASC`;

    return NextResponse.json({ success: true, data: items });
  } catch (error: any) {
    if (error.message.includes('Forbidden')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    console.error('[GET /api/admin/items] Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
    try {
        const userId = await getAuthUserId();
        if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        await ensureAdmin(userId);

        const body = await request.json();
        const { id, name, icon, rarity, category, price, description, is_purchasable } = body;

        if (!id || !name) return NextResponse.json({ error: 'Missing item id or name' }, { status: 400 });

        // Upsert Item: Create if it doesn't exist, update if it does.
        await sql`
            INSERT INTO items (id, name, description, category, icon, rarity, price, is_purchasable)
            VALUES (${id}, ${name}, ${description || ''}, ${category || 'consumable'}, ${icon || '✨'}, ${rarity || 'common'}, ${price || 0}, ${is_purchasable})
            ON CONFLICT (id) DO UPDATE 
            SET name = EXCLUDED.name,
                description = EXCLUDED.description,
                category = EXCLUDED.category,
                icon = EXCLUDED.icon,
                rarity = EXCLUDED.rarity,
                price = EXCLUDED.price,
                is_purchasable = EXCLUDED.is_purchasable,
                updated_at = CURRENT_TIMESTAMP
        `;

        return NextResponse.json({ success: true, message: `Item ${id} saved` });
    } catch (error: any) {
        if (error.message.includes('Forbidden')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        console.error('[POST /api/admin/items] Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
