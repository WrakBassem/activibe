import { NextResponse } from 'next/server'
import sql from '@/lib/db'
import { chatWithCoach, buildCoachSystemPrompt } from '@/lib/gemini'

// POST /api/coach — Chat with AI Coach
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { message, sessionType = 'check-in', sessionId } = body

    if (!message) {
      return NextResponse.json(
        { error: 'message is required' },
        { status: 400 }
      )
    }

    // 1. Load user profile
    const profileRows = await sql`SELECT * FROM user_profile LIMIT 1`
    const profile = profileRows[0] || null

    // 2. Load recent logs (last 7 days)
    const recentLogs = await sql`
      SELECT d.*, s.final_score
      FROM daily_logs d
      LEFT JOIN daily_final_score s ON d.log_date = s.log_date
      ORDER BY d.log_date DESC
      LIMIT 7
    `

    // 3. Load active goals
    const goals = await sql`
      SELECT * FROM coach_goals
      WHERE status = 'active'
      ORDER BY created_at DESC
    `

    // 4. Build system prompt with all context
    const systemPrompt = buildCoachSystemPrompt(profile, recentLogs, goals)

    // 5. Load or create session
    let sessionMessages: { role: string; content: string }[] = []

    if (sessionId) {
      const sessionRows = await sql`
        SELECT messages FROM coach_sessions WHERE id = ${sessionId}
      `
      if (sessionRows[0]) {
        const dbMessages = sessionRows[0].messages
        sessionMessages = typeof dbMessages === 'string' 
          ? JSON.parse(dbMessages) 
          : (dbMessages || [])
      }
    }

    // 6. Add user message
    sessionMessages.push({ role: 'user', content: message })

    // 7. Get AI response
    const aiResponse = await chatWithCoach(sessionMessages, systemPrompt)

    // 8. Add assistant response
    sessionMessages.push({ role: 'assistant', content: aiResponse })

    // 9. Save session
    let savedSessionId = sessionId
    if (sessionId) {
      await sql`
        UPDATE coach_sessions 
        SET messages = ${sql.json(sessionMessages)}
        WHERE id = ${sessionId}
      `
    } else {
      const newSession = await sql`
        INSERT INTO coach_sessions (session_type, messages)
        VALUES (${sessionType}, ${sql.json(sessionMessages)})
        RETURNING id
      `
      savedSessionId = newSession[0].id
    }

    // 10. Check if response contains a goal creation action
    let createdGoal = null
    try {
      const jsonMatch = aiResponse.match(/```json\s*([\s\S]*?)```/)
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[1])
        if (parsed.action === 'create_goal' && parsed.goal) {
          // Auto-create the goal
          const goal = parsed.goal
          const newGoal = await sql`
            INSERT INTO coach_goals (title, category, deadline, milestones, motivation_why)
            VALUES (
              ${goal.title},
              ${goal.category || 'general'},
              ${goal.deadline || null},
              ${sql.json(goal.milestones || [])},
              ${goal.motivation_why || null}
            )
            RETURNING *
          `
          createdGoal = newGoal[0]

          // Create linked tracking items
          if (goal.daily_tasks && Array.isArray(goal.daily_tasks)) {
            for (const task of goal.daily_tasks) {
              await sql`
                INSERT INTO tracking_items (title, type, frequency_days, priority, goal_id)
                VALUES (
                  ${task.title},
                  ${task.type || 'task'},
                  ${sql.json(task.frequency_days || [0,1,2,3,4,5,6])},
                  ${task.priority || 'medium'},
                  ${createdGoal.id}
                )
              `
            }
          }
        }
      }
    } catch (e) {
      // Not a goal creation response, that's fine
    }

    return NextResponse.json({
      success: true,
      response: aiResponse,
      sessionId: savedSessionId,
      createdGoal,
    })

  } catch (error: any) {
    console.error('[POST /api/coach] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to get coach response', details: error.message },
      { status: 500 }
    )
  }
}
