import { NextResponse } from 'next/server';
import sql from '@/lib/db';
import { getAuthUserId } from '@/lib/auth-utils';
import { ensureAdmin } from '@/lib/admin-utils';

export async function GET() {
  try {
    const userId = await getAuthUserId();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    await ensureAdmin(userId);

    const events = await sql`
        SELECT se.*, u.email as user_email
        FROM smuggler_events se
        JOIN users u ON se.user_id = u.id
        WHERE se.expires_at > CURRENT_TIMESTAMP
        ORDER BY se.expires_at DESC
    `;

    return NextResponse.json({ success: true, data: events });
  } catch (error: any) {
    if (error.message.includes('Forbidden')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    console.error('[GET /api/admin/events] Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// CREATE / FORCE SPAWN EVENT
export async function POST(request: Request) {
    try {
        const userId = await getAuthUserId();
        if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        await ensureAdmin(userId);

        const body = await request.json();
        const { targetUserIds, item1, item2, durationHours } = body;

        if (!targetUserIds || !Array.isArray(targetUserIds) || targetUserIds.length === 0) {
            return NextResponse.json({ error: 'Missing targetUserIds array' }, { status: 400 });
        }

        // Build Payload
        let finalItem1Id, finalItem1Price, finalItem2Id, finalItem2Price;
        const hours = durationHours || 24;
        const expiresAt = new Date(new Date().getTime() + hours * 60 * 60 * 1000);

        // If specific items were passed, use them
        if (item1 && item1.id && item2 && item2.id) {
            finalItem1Id = item1.id;
            finalItem1Price = parseInt(item1.price) || 0;
            finalItem2Id = item2.id;
            finalItem2Price = parseInt(item2.price) || 0;
        } else {
            // Otherwise Auto-Roll (Smart Fill fallback)
            const allItems = await sql`SELECT * FROM items WHERE is_purchasable = TRUE OR id IN ('smoke_bomb', 'time_turner')`;
            if (allItems.length < 2) return NextResponse.json({ error: 'Not enough items to spawn event' }, { status: 500 });

            const picked = allItems.sort(() => 0.5 - Math.random()).slice(0, 2);
            finalItem1Id = picked[0].id;
            finalItem1Price = Math.round(picked[0].price * 0.6);
            finalItem2Id = picked[1].id;
            finalItem2Price = Math.round(picked[1].price * 0.6);
        }

        for (const targetUserId of targetUserIds) {
            await sql`
                INSERT INTO smuggler_events (user_id, item_1_id, item_1_discount_price, item_2_id, item_2_discount_price, expires_at)
                VALUES (${targetUserId}, ${finalItem1Id}, ${finalItem1Price}, ${finalItem2Id}, ${finalItem2Price}, ${expiresAt})
            `;
        }

        return NextResponse.json({ success: true, message: `Smuggler event deployed to ${targetUserIds.length} users` });
    } catch (error: any) {
        if (error.message.includes('Forbidden')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        console.error('[POST /api/admin/events] Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

// UPDATE ACTIVE EVENT
export async function PUT(request: Request) {
    try {
        const userId = await getAuthUserId();
        if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        await ensureAdmin(userId);

        const body = await request.json();
        const { event_id, item_1_id, item_1_discount_price, item_2_id, item_2_discount_price } = body;

        if (!event_id) return NextResponse.json({ error: 'Missing event_id' }, { status: 400 });

        await sql`
            UPDATE smuggler_events 
            SET item_1_id = ${item_1_id},
                item_1_discount_price = ${item_1_discount_price},
                item_2_id = ${item_2_id},
                item_2_discount_price = ${item_2_discount_price}
            WHERE id = ${event_id}
        `;

        return NextResponse.json({ success: true, message: `Event ${event_id} updated successfully.` });
    } catch (error: any) {
        if (error.message.includes('Forbidden')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        console.error('[PUT /api/admin/events] Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

// DELETE (REVOKE) ACTIVE EVENT
export async function DELETE(request: Request) {
    try {
        const userId = await getAuthUserId();
        if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        await ensureAdmin(userId);

        const { searchParams } = new URL(request.url);
        const eventId = searchParams.get('id');

        if (!eventId) return NextResponse.json({ error: 'Missing event id' }, { status: 400 });

        // We "revoke" by setting expiration to now, rather than hard deleting, to preserve history if needed, 
        // or just hard delete. Let's hard delete for a cleaner active events table.
        await sql`DELETE FROM smuggler_events WHERE id = ${eventId}`;

        return NextResponse.json({ success: true, message: `Event ${eventId} revoked.` });
    } catch (error: any) {
        if (error.message.includes('Forbidden')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        console.error('[DELETE /api/admin/events] Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
