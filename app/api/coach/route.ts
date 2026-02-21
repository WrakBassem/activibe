import { NextResponse } from 'next/server'
import sql from '@/lib/db'
import { chatWithCoach, buildCoachSystemPrompt } from '@/lib/gemini'
import { getAuthUserId } from '@/lib/auth-utils'

// POST /api/coach — Chat with AI Coach
export async function POST(request: Request) {
  try {
    const userId = await getAuthUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { message, sessionType = 'check-in', sessionId } = body

    if (!message) {
      return NextResponse.json(
        { error: 'message is required' },
        { status: 400 }
      )
    }

    // 1. Load user profile
    const profileRows = await sql`
      SELECT * FROM user_profile 
      WHERE user_id = ${userId} 
      LIMIT 1
    `
    const profile = profileRows[0] || null

    // 2. Load recent scores (last 7 days)
    const recentLogs = await sql`
      SELECT ds.date as log_date, ds.total_score as final_score, ds.mode,
             ds.burnout_flag, ds.procrastination_flag
      FROM daily_scores ds
      WHERE ds.user_id = ${userId}
      ORDER BY ds.date DESC
      LIMIT 7
    `

    // 3. Load active goals
    const goals = await sql`
      SELECT * FROM coach_goals
      WHERE status = 'active'
        AND user_id = ${userId}
      ORDER BY created_at DESC
    `
    // 4. Load recent metric reviews and score values (last 7 days)
    const recentReviews = await sql`
      SELECT de.date, m.name as metric_name, m.input_type, de.score_value, de.review
      FROM daily_entries de
      JOIN metrics m ON de.metric_id = m.id
      WHERE de.user_id = ${userId}
        AND de.review IS NOT NULL AND de.review != ''
      ORDER BY de.date DESC
      LIMIT 20
    `

    // 5. Build system prompt with all context
    const systemPrompt = buildCoachSystemPrompt(profile, recentLogs, goals, recentReviews)

    // 5. Load or create session
    let sessionMessages: { role: string; content: string }[] = []

    if (sessionId) {
      const sessionRows = await sql`
        SELECT messages FROM coach_sessions 
        WHERE id = ${sessionId}
          AND user_id = ${userId}
      `
      if (sessionRows[0]) {
        const dbMessages = sessionRows[0].messages
        sessionMessages = typeof dbMessages === 'string' 
          ? JSON.parse(dbMessages) 
          : (dbMessages || [])
      } else {
        // If session exists but not for this user, simple empty array or error
        // Let's verify ownership first? 
        // effectively if rows is empty, treat as new or error.
        // For robustness, let's just proceed with empty if not found, or maybe error.
        // But logic below will create new if sessionId not found? No, logic updates if sessionId is present.
        // If passed sessionId is invalid for user, update will return 0 rows.
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
      // Ensure we only update if we own it
      const updateResult = await sql`
        UPDATE coach_sessions 
        SET messages = ${sql.json(sessionMessages)}
        WHERE id = ${sessionId}
          AND user_id = ${userId}
        RETURNING id
      `
      if (updateResult.length === 0) {
        // Did not update, maybe session doesn't exist or not owned.
        // Create new instead? Or fail?
        // Let's create new to be safe.
        const newSession = await sql`
            INSERT INTO coach_sessions (session_type, messages, user_id)
            VALUES (${sessionType}, ${sql.json(sessionMessages)}, ${userId})
            RETURNING id
        `
        savedSessionId = newSession[0].id
      }
    } else {
      const newSession = await sql`
        INSERT INTO coach_sessions (session_type, messages, user_id)
        VALUES (${sessionType}, ${sql.json(sessionMessages)}, ${userId})
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
            INSERT INTO coach_goals (title, category, deadline, milestones, motivation_why, user_id)
            VALUES (
              ${goal.title},
              ${goal.category || 'general'},
              ${goal.deadline || null},
              ${sql.json(goal.milestones || [])},
              ${goal.motivation_why || null},
              ${userId}
            )
            RETURNING *
          `
          createdGoal = newGoal[0]

          // Create linked tracking items
          if (goal.daily_tasks && Array.isArray(goal.daily_tasks)) {
            for (const task of goal.daily_tasks) {
              await sql`
                INSERT INTO tracking_items (title, type, frequency_days, priority, goal_id, user_id)
                VALUES (
                  ${task.title},
                  ${task.type || 'task'},
                  ${sql.json(task.frequency_days || [0,1,2,3,4,5,6])},
                  ${task.priority || 'medium'},
                  ${createdGoal.id},
                  ${userId}
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
