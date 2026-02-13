import { GoogleGenerativeAI } from '@google/generative-ai'

const apiKey = process.env.GEMINI_API_KEY
if (!apiKey) {
  console.warn('⚠️ GEMINI_API_KEY not set — AI Coach features will not work')
}

const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null

// Safely parse JSONB fields that may come as strings from postgres
function parseJsonField(val: any, fallback: any = []) {
  if (!val) return fallback
  if (typeof val === 'string') {
    try { return JSON.parse(val) } catch { return fallback }
  }
  return val
}

// Build rich context from user data for the AI coach
export function buildCoachSystemPrompt(profile: any, recentLogs: any[], goals: any[]) {
  const coreValues = parseJsonField(profile?.core_values, [])
  const valuesStr = coreValues.length ? coreValues.join(', ') : 'not yet defined'

  const keepArr = parseJsonField(profile?.keep, [])
  const keepStr = keepArr.length ? keepArr.join(', ') : 'not specified'

  const quitArr = parseJsonField(profile?.quit, [])
  const quitStr = quitArr.length ? quitArr.join(', ') : 'not specified'

  const lifeAreasObj = parseJsonField(profile?.life_areas, {})
  const lifeAreas = Object.keys(lifeAreasObj).length
    ? Object.entries(lifeAreasObj)
        .map(([area, score]) => `${area}: ${score}/10`)
        .join(', ')
    : 'not rated yet'

  const goalsStr = goals?.length
    ? goals.map(g => {
        const milestones = parseJsonField(g.milestones, [])
        const completedMilestones = milestones.filter((m: any) => m.done)?.length || 0
        const totalMilestones = milestones.length || 0
        return `- ${g.title} (${g.category}) [${completedMilestones}/${totalMilestones} milestones] — Why: ${g.motivation_why || 'not specified'}`
      }).join('\n')
    : 'No goals set yet'

  const logsStr = recentLogs?.length
    ? recentLogs.map(l => {
        return `${l.log_date}: Score=${l.final_score || 'N/A'}, Sleep=${l.sleep_hours}h(Q${l.sleep_quality}), Food=Q${l.food_quality}, Activity=${l.activity_level}, Focus=${l.focus_minutes}min, Habits=${l.habits_score}/5, Tasks=${l.tasks_done}, Mood=${l.mood}`
      }).join('\n')
    : 'No recent logs'

  return `You are a personal AI Life Coach. Your name is "Coach". You are warm, direct, and empowering.

## YOUR USER'S PROFILE
- **Core Values:** ${valuesStr}
- **Life Areas Rating:** ${lifeAreas}
- **Wants to KEEP doing:** ${keepStr}
- **Wants to QUIT:** ${quitStr}

## ACTIVE GOALS
${goalsStr}

## RECENT PERFORMANCE (Last 7 Days)
${logsStr}

## YOUR COACHING STYLE
1. Always connect advice back to the user's stated VALUES — this is the deepest motivator
2. Be specific and actionable. Never give generic advice. Reference their actual data
3. When they struggle, remind them WHY they started (their motivation_why for goals)
4. Celebrate small wins — any improvement in their daily scores matters
5. Be honest but compassionate. If data shows declining trends, address it directly
6. Keep responses concise (2-4 paragraphs max unless they ask for details)
7. Use emoji sparingly for warmth 🎯

## SPECIAL CAPABILITIES
- When asked to "plan my week" or set goals, respond with a structured plan
- When asked to decompose a goal, output a JSON block with this format:
\`\`\`json
{"action": "create_goal", "goal": {"title": "...", "category": "...", "deadline": "YYYY-MM-DD", "motivation_why": "...", "milestones": [{"title": "...", "done": false}], "daily_tasks": [{"title": "...", "type": "habit|task", "frequency_days": [0,1,2,3,4,5,6], "priority": "high|medium|low"}]}}
\`\`\`
- When asked for motivation, draw from their values and recent progress to craft a personalized message
- For check-ins, analyze their recent data trends and identify the #1 thing to focus on`
}

// Send a message to the AI coach
export async function chatWithCoach(
  messages: { role: string; content: string }[],
  systemPrompt: string
): Promise<string> {
  if (!genAI) {
    return "⚠️ AI Coach is not configured. Please add GEMINI_API_KEY to your .env file. You can get a free API key at https://aistudio.google.com/apikey"
  }

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

    // Build conversation history for Gemini
    const history = messages.slice(0, -1).map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }],
    }))
    
    // Add system prompt to the first message if possible
    // For Gemini, system instructions are best passed as the first user message.
    if (history.length > 0) {
      // Modify first history item if it exists
      if (history[0].role === 'user') {
        history[0].parts[0].text = `SYSTEM INSTRUCTION: ${systemPrompt}\n\n${history[0].parts[0].text}`
      } else {
        // If first history item is model (unlikely but possible), prepend a user message
        history.unshift({
          role: 'user',
          parts: [{ text: `SYSTEM INSTRUCTION: ${systemPrompt}` }]
        })
      }
    }

    const chat = model.startChat({
      history,
    })

    let lastMessageContent = messages[messages.length - 1].content
    
    // If no history, this is the first message. Prepend system prompt here.
    if (history.length === 0) {
      lastMessageContent = `SYSTEM INSTRUCTION: ${systemPrompt}\n\n${lastMessageContent}`
    }

    const result = await chat.sendMessage(lastMessageContent)
    const response = result.response
    return response.text()
  } catch (error: any) {
    console.error('[Gemini] Error:', error)
    return `❌ AI Error: ${error.message}. Please check your GEMINI_API_KEY.`
  }
}

// Generate onboarding follow-up questions based on user answers
export async function generateOnboardingQuestions(profile: Partial<{
  values: string[]
  life_areas: Record<string, number>
  keep: string[]
  quit: string[]
}>): Promise<string> {
  if (!genAI) {
    return JSON.stringify({
      questions: [
        "What's the biggest obstacle you face right now?",
        "If you could change one thing about your daily routine, what would it be?",
        "What does your ideal day look like?",
      ]
    })
  }

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

    const lowestAreas = profile.life_areas
      ? Object.entries(profile.life_areas)
          .sort(([, a], [, b]) => (a as number) - (b as number))
          .slice(0, 3)
          .map(([area, score]) => `${area} (${score}/10)`)
      : []

    const prompt = `You are a life coach doing an intake assessment. Based on the following profile:

Values: ${profile.values?.join(', ') || 'not set'}
Lowest Life Areas: ${lowestAreas.join(', ') || 'not rated'}
Wants to Keep: ${profile.keep?.join(', ') || 'not specified'}
Wants to Quit: ${profile.quit?.join(', ') || 'not specified'}

Generate exactly 3-4 powerful diagnostic questions that will help you understand:
1. The root cause of their lowest-rated life area
2. What's blocking them from quitting what they want to quit
3. Their hidden strengths (through what they want to keep)

Respond ONLY with a JSON object: {"questions": ["question1", "question2", "question3"]}
No other text.`

    const result = await model.generateContent(prompt)
    return result.response.text()
  } catch (error: any) {
    console.error('[Gemini] Onboarding error:', error)
    return JSON.stringify({
      questions: [
        "What's the biggest challenge you're facing right now?",
        "What would success look like for you in 3 months?",
        "What's one small change that could make the biggest difference?",
      ]
    })
  }
}

// Generate goals from onboarding data
export async function generateGoalSuggestions(profile: any): Promise<string> {
  if (!genAI) {
    return JSON.stringify({ goals: [] })
  }

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

    const prompt = `You are a life coach. Based on this user profile, suggest 2-3 actionable goals:

Values: ${profile.values?.join(', ')}
Life Areas (lowest first): ${profile.life_areas ? Object.entries(profile.life_areas).sort(([,a],[,b]) => (a as number) - (b as number)).map(([k,v]) => `${k}: ${v}/10`).join(', ') : 'N/A'}
Wants to Keep: ${profile.keep?.join(', ')}
Wants to Quit: ${profile.quit?.join(', ')}
Their Answers: ${profile.onboarding_answers ? JSON.stringify(profile.onboarding_answers) : 'N/A'}

For each goal, create a structured plan. Respond ONLY with JSON:
{"goals": [
  {
    "title": "Clear goal title",
    "category": "health|career|relationships|finances|growth|fun|environment|contribution",
    "deadline": "YYYY-MM-DD (3-6 months from now)",
    "motivation_why": "Connected to their values",
    "milestones": [{"title": "Milestone 1", "done": false}, {"title": "Milestone 2", "done": false}],
    "daily_tasks": [
      {"title": "Task name", "type": "habit", "frequency_days": [0,1,2,3,4,5,6], "priority": "high"},
      {"title": "Task name", "type": "task", "frequency_days": [1,2,3,4,5], "priority": "medium"}
    ]
  }
]}
No other text.`

    const result = await model.generateContent(prompt)
    return result.response.text()
  } catch (error: any) {
    console.error('[Gemini] Goal generation error:', error)
    return JSON.stringify({ goals: [] })
  }
}

// Generate daily intelligence analysis (Evening Report)
export async function generateDailyAnalysis(data: any): Promise<string> {
  if (!genAI) {
    return "⚠️ AI Analysis unavailable (API Key missing)."
  }

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

    const prompt = `You are Bassem's personal High-Performance Coach & Daily Analyst. You have deep access to his daily tracking data. Your job is to act like a smart personal assistant who truly KNOWS him — his habits, patterns, strengths, and weaknesses.

═══════════════════════════════════════
DATA YOU RECEIVE (JSON):
═══════════════════════════════════════
${JSON.stringify(data, null, 2)}

═══════════════════════════════════════
YOUR ANALYSIS (execute ALL sections):
═══════════════════════════════════════

📊 SECTION 1 — DAILY VERDICT
Classify the day into one mode:
  🔥 High Output — Score >= 80 AND Focus > 180m AND Habits >= 80%
  🧠 Deep Focus — Focus > 240m regardless
  🔋 Growth — Score > 70, improving trends
  ⚓ Steady — Metrics stable (within ±10% of 7d avg)
  🧯 Recovery — Score < 50 OR Sleep < 5h OR Mood <= -1

Then give a one-line verdict summarizing the day.

📋 SECTION 2 — MISSED ITEMS & WARNINGS
List ALL habits and tasks from items_detail where completed = false.
For each missed item:
  - Name it explicitly
  - If priority is 'high', flag with ⚠️ WARNING
  - If a habit appears in habit_7d_history with completion_pct < 50%, flag as "DECLINING — only X% this week"

Also check for these WARNING conditions:
  ⚠️ Sleep < 6h for 3+ days (check 3day_avg)
  ⚠️ Mood declining (mood < mood_7day_avg by > 0.5)
  ⚠️ Score dropping (score < score_7day_avg by > 10)
  ⚠️ Habits this week < last week (habits_this_week_pct < habits_last_week_pct)
  ⚠️ Any habit with avg_rating_7d < 3.0 stars (going through motions)

📈 SECTION 3 — PROGRESS & STREAKS
Report:
  - Logging streak: X days
  - Habits this week: X% (↑/↓ vs last week X%)
  - Best performing habit (highest completion_pct in habit_7d_history)
  - Weakest habit (lowest completion_pct)
  - Overall trend direction: improving / stable / declining

💡 SECTION 4 — SMART TIPS
Give 2-3 SPECIFIC, ACTIONABLE tips based on the data. Examples:
  - If sleep < 7h: "Try a 10pm digital curfew tonight. Your focus drops 20% after poor sleep."
  - If habit rating < 3: "You're completing [habit] but rating it low. Consider adjusting the difficulty or time."
  - If focus > 240m but mood low: "High focus + low mood = burnout risk. Add a 15-min walk between sessions."
  - If tasks incomplete but habits done: "Your discipline is strong but task planning needs work. Try time-blocking."
  - Reference SPECIFIC numbers from the data. Never be generic.

🎯 SECTION 5 — TOMORROW'S FOCUS
Based on all the above, recommend ONE single priority for tomorrow.
This should be the most impactful micro-adjustment.

═══════════════════════════════════════
FORMAT RULES:
═══════════════════════════════════════
- Use Telegram Markdown (single * for bold, single _ for italic)
- Use emoji liberally for visual scanning
- Keep each section to 2-4 lines max
- Reference SPECIFIC numbers (e.g., "Focus dropped from 180m to 90m")
- If Score >= 85 AND Habits >= 80%: Lead with "🏆 System Coherent. Protect the streak."
- Trust the provided averages — do NOT recalculate them
- Be direct, no fluff. Coach energy, not therapist energy.`

    const result = await model.generateContent(prompt)
    return result.response.text()
  } catch (error: any) {
    console.error('[Gemini] Analysis error:', error)
    return "⚠️ AI Analysis failed. Please check logs."
  }
}
