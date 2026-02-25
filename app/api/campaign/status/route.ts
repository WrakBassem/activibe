import { NextResponse } from 'next/server'
import { getAuthUserId } from '@/lib/auth-utils'
import { getCampaignStatus } from '@/lib/campaign'

export async function GET() {
    try {
        const userId = await getAuthUserId()
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const status = await getCampaignStatus(userId)
        return NextResponse.json({ success: true, data: status })
    } catch (error: any) {
        console.error('[GET /api/campaign/status] Error:', error)
        return NextResponse.json({ error: 'Failed to fetch campaign status', details: error.message }, { status: 500 })
    }
}
