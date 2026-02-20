import { NextResponse } from 'next/server'
import sql from '@/lib/db'
import { getAuthUserId } from '@/lib/auth-utils'

// GET /api/coach/insight - Returns a generated insight based on recent status
export async function GET(request: Request) {
  try {
    const userId = await getAuthUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch latest score
    const result = await sql`
        SELECT * FROM daily_scores 
        WHERE user_id = ${userId} 
        ORDER BY date DESC 
        LIMIT 1
    `
    
    if (result.length === 0) {
         return NextResponse.json({ 
            success: true, 
            data: { message: "Welcome! Log your first day to unlock Coach insights.", type: "info" } 
         })
    }

    const today = result[0];
    let message = "You're doing great! Maintain this momentum.";
    let type = "success";

    if (today.burnout_flag) {
        message = "⚠️ Burnout Risk Detected. High effort but low outcome. Prioritize sleep and disconnect early today.";
        type = "warning";
    } else if (today.procrastination_flag) {
        message = "🛑 Slump Detected. Start with just 5 minutes of focused work to break the inertia.";
        type = "danger";
    } else if (today.mode === 'Growth') {
        message = "🚀 You are in Growth Mode! Push your limits today.";
        type = "success";
    } else if (today.mode === 'Recovery') {
        message = "🌱 Recovery Mode. Be gentle with yourself and focus on basics.";
        type = "info";
    }

    return NextResponse.json({
      success: true,
      data: { message, type }
    })

  } catch (error: any) {
    console.error('[GET /api/coach/insight] Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
