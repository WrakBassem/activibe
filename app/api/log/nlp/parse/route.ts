import { NextResponse } from 'next/server'
import sql from '@/lib/db'
import { getAuthUserId } from '@/lib/auth-utils'
import { parseJournalEntry } from '@/lib/gemini'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
    try {
        const userId = await getAuthUserId()
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const { text, date } = body

        if (!text || text.trim() === '') {
            return NextResponse.json({ error: 'Journal text is required.' }, { status: 400 })
        }

        // We need to fetch the user's metrics schema to pass to the AI
        // We only pass the fields the AI needs to know about to save prompt size.
        const metrics = await sql`
            SELECT m.id, m.name, m.input_type, m.max_points 
            FROM metrics m
            WHERE m.active = true
        `

        // And fetch the active submetric fields
        const fields = await sql`
            SELECT f.id as field_id, f.metric_id, f.name, f.field_type
            FROM metric_fields f
            JOIN metrics m ON f.metric_id = m.id
            WHERE f.active = true AND m.active = true
        `

        console.log(`[NLP] Found ${metrics.length} metrics and ${fields.length} fields to prompt AI with.`);

        // Send to Gemini
        const parsedData = await parseJournalEntry(text, metrics, fields)
        console.log(`[NLP] Gemini Parsed Data:`, JSON.stringify(parsedData, null, 2));

        if (!parsedData) {
            return NextResponse.json({ error: 'Failed to consult the AI Oracle.' }, { status: 500 })
        }

        return NextResponse.json({
            success: true,
            data: parsedData
        })

    } catch (error: any) {
        console.error('[POST /api/log/nlp/parse] Error:', error)
        return NextResponse.json(
            { error: 'Failed to parse journal entry', details: error.message },
            { status: 500 }
        )
    }
}
