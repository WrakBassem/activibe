import { NextResponse } from 'next/server'
import { getAuthUserId } from '@/lib/auth-utils'
import { generateOnboardingQuestions, generateGoalSuggestions } from '@/lib/gemini'

// POST /api/coach/onboarding — AI-powered onboarding actions
export async function POST(request: Request) {
  try {
    // Auth guard — only logged-in users can access onboarding AI
    const userId = await getAuthUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { action, profile } = body

    if (action === 'generate_questions') {
      const rawResponse = await generateOnboardingQuestions(profile)
      
      let questions
      try {
        const cleaned = rawResponse.replace(/```json\s*/g, '').replace(/```/g, '').trim()
        const parsed = JSON.parse(cleaned)
        questions = parsed.questions || []
      } catch {
        questions = [
          "What's the biggest challenge you're facing right now?",
          "What would success look like for you in 3 months?",
          "What's one small change that could make the biggest difference?",
        ]
      }

      return NextResponse.json({ success: true, questions })
    }

    if (action === 'generate_goals') {
      const rawResponse = await generateGoalSuggestions(profile)

      let goals
      try {
        const cleaned = rawResponse.replace(/```json\s*/g, '').replace(/```/g, '').trim()
        const parsed = JSON.parse(cleaned)
        goals = parsed.goals || []
      } catch {
        goals = []
      }

      return NextResponse.json({ success: true, goals })
    }

    return NextResponse.json(
      { error: 'Invalid action. Use "generate_questions" or "generate_goals"' },
      { status: 400 }
    )

  } catch (error: any) {
    console.error('[POST /api/coach/onboarding] Error:', error)
    return NextResponse.json(
      { error: 'Onboarding action failed', details: error.message },
      { status: 500 }
    )
  }
}
