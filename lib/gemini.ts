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
export function buildCoachSystemPrompt(profile: any, recentLogs: any[], goals: any[], recentReviews: any[] = []) {
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
        let entry = `${l.log_date}: Score=${l.final_score || 'N/A'}`
        if (l.mode) entry += `, Mode=${l.mode}`
        if (l.burnout_flag) entry += ` ⚠️BURNOUT`
        if (l.procrastination_flag) entry += ` ⚠️SLUMP`
        return entry
      }).join('\n')
    : 'No recent logs'

  const reviewsStr = recentReviews?.length
    ? recentReviews.map(r => {
        const scoreInfo = r.input_type !== 'boolean' && r.score_value != null
          ? ` [${r.input_type}: ${r.score_value}]`
          : ''
        return `${r.date} — ${r.metric_name}${scoreInfo}: "${r.review}"`
      }).join('\n')
    : 'No reviews written yet'

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

## RECENT METRIC REVIEWS (User's Own Words)
These are the user's written reflections on their metrics — this is GOLDEN context for coaching:
${reviewsStr}

## YOUR COACHING STYLE
1. Always connect advice back to the user's stated VALUES — this is the deepest motivator
2. Be specific and actionable. Never give generic advice. Reference their actual data
3. When they struggle, remind them WHY they started (their motivation_why for goals)
4. Celebrate small wins — any improvement in their daily scores matters
5. Be honest but compassionate. If data shows declining trends, address it directly
6. Keep responses concise (2-4 paragraphs max unless they ask for details)
7. Use emoji sparingly for warmth 🎯
8. **LEVERAGE REVIEWS**: When the user wrote reviews, reference their own words back. This shows you truly listen.
   - If they wrote frustrated reviews: acknowledge the frustration, then redirect to solutions
   - If they wrote positive reviews: reinforce the momentum
   - If reviews mention blockers: proactively address them in your advice
9. Understand input types: emoji_5 metrics reflect emotional self-assessment, scale metrics reflect effort/quality ratings

## SPECIAL CAPABILITIES
- When asked to "plan my week" or set goals, respond with a structured plan
- When asked to decompose a goal, output a JSON block with this format:
\`\`\`json
{"action": "create_goal", "goal": {"title": "...", "category": "...", "deadline": "YYYY-MM-DD", "motivation_why": "...", "milestones": [{"title": "...", "done": false}], "daily_tasks": [{"title": "...", "type": "habit|task", "frequency_days": [0,1,2,3,4,5,6], "priority": "high|medium|low"}]}}
\`\`\`
- When asked for motivation, draw from their values, recent progress, AND their own review words to craft a personalized message
- For check-ins, analyze their recent data trends, reviews, and identify the #1 thing to focus on`
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
UNDERSTANDING INPUT TYPES:
═══════════════════════════════════════
Each metric item has an "input_type" that determines how it was scored:
  - "boolean" = Done/Not Done (binary). completed=true means full points.
  - "emoji_5" = 5-point emoji scale (😞=1, 😕=2, 😐=3, 🙂=4, 😄=5). score_value shows the selection.
  - "scale_0_5" = Numeric 0-5 scale. score_value shows the rating.
  - "scale_0_10" = Numeric 0-10 scale. score_value shows the rating.
For non-boolean types, analyze the SCORE VALUE not just completed/not completed.
A score_value of 2/5 is "mediocre", 4/5 is "strong", 5/5 is "excellent".
A score_value of 3/10 is "weak", 7/10 is "solid", 9+/10 is "exceptional".

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

🔬 SECTION 2 — METRIC DEEP DIVE (Score-Aware)
Analyze EACH metric item from the data, paying attention to input_type:
  - For boolean metrics: report completed ✅ or missed ❌
  - For emoji_5 metrics: interpret the emoji level (e.g., "😐 Neutral (3/5) — you're going through the motions")
  - For scale_0_5 metrics: evaluate the score (e.g., "4/5 — Strong performance. Consistent.")
  - For scale_0_10 metrics: evaluate depth (e.g., "6/10 — Room to push harder here")
  - For any metric scoring below 50% of its max scale, flag as ⚠️ concern
  - For metrics scoring above 80% of max scale, highlight as 💪 strength
  - Report streak data if available

If sub_metric_fields data exists, also analyze those (listing values, flagging low scales, etc.) and especially focus on any reviews provided for these sub-metrics.

📝 SECTION 3 — USER VOICE (Review Mining)
This is GOLDEN DATA. The user wrote personal reviews/notes for some metrics.
For each item that has a non-null "review" field:
  - Quote the review briefly
  - Identify EMOTIONAL SIGNALS (frustration, pride, anxiety, boredom, motivation)
  - Detect HIDDEN BLOCKERS the user mentions (time pressure, distractions, fatigue, lack of resources)
  - Connect the review sentiment to the score: does the review match the score? (e.g., high score but frustrated review = unsustainable)
  - If the review mentions wanting to change something, acknowledge it and give tactical advice
If NO reviews were written, mention "No reviews today — consider writing brief reflections to help me coach you better."

📋 SECTION 4 — MISSED ITEMS & WARNINGS
List ALL metrics where completed = false OR score_value is very low (bottom 20% of scale).
For each:
  - Name it explicitly with its score_value context
  - If a metric has been declining over recent history, flag it

Also check for WARNING conditions:
  ⚠️ Score dropping (score < score_7day_avg by > 10)
  ⚠️ Any scale metric scored ≤ 1 (minimal effort)
  ⚠️ Multiple emoji_5 metrics at 😞 or 😕 level (emotional low day)

📈 SECTION 5 — PROGRESS & PATTERNS
Report:
  - Overall trend direction: improving / stable / declining
  - Best performing metric (highest % of max points)
  - Weakest metric (lowest % of max points)
  - Any patterns between reviews and scores (e.g., days with long reviews tend to score higher)

💡 SECTION 6 — SMART TIPS (Review-Informed)
Give 2-3 SPECIFIC, ACTIONABLE tips. PRIORITIZE insights from reviews:
  - If a review mentions a blocker: address it directly with a solution
  - If a review shows frustration with a metric: suggest adjusting difficulty or approach
  - If score_value is mediocre (mid-range): suggest what "leveling up" looks like for that metric
  - Reference SPECIFIC numbers and quotes from reviews. Never be generic.
  - Connect tips to the user's stated emotional state

🎯 SECTION 7 — TOMORROW'S FOCUS
Based on all the above (scores, reviews, patterns), recommend ONE single priority.
This should address the biggest gap OR build on the strongest momentum.
If a review hinted at something the user wants to improve, reference it.

═══════════════════════════════════════
FORMAT RULES:
═══════════════════════════════════════
- Use Telegram Markdown (single * for bold, single _ for italic)
- Use emoji liberally for visual scanning
- Keep each section to 2-4 lines max (reviews section can be longer if there's rich data)
- Reference SPECIFIC numbers and quote reviews (e.g., "You wrote: 'felt rushed' — this explains the 2/5 score")
- If Score >= 85 AND all metrics above 70%: Lead with "🏆 System Coherent. Protect the streak."
- Trust the provided averages — do NOT recalculate them
- Be direct, no fluff. Coach energy, not therapist energy.
- Treat user reviews as the MOST VALUABLE data — they reveal what numbers cannot.`

    const result = await model.generateContent(prompt)
    return result.response.text()
  } catch (error: any) {
    console.error('[Gemini] Analysis error:', error)
    return "⚠️ AI Analysis failed. Please check logs."
  }
}

// Generate WEEKLY intelligence analysis
export async function generateWeeklyAnalysis(data: any): Promise<string> {
    if (!genAI) {
      return "⚠️ AI Analysis unavailable (API Key missing)."
    }
  
    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })
  
      const prompt = `You are Bassem's Lead Performance Coach. This is the WEEKLY REVIEW.
  
  ═══════════════════════════════════════
  WEEKLY DATA (JSON):
  ═══════════════════════════════════════
  ${JSON.stringify(data, null, 2)}
  
  ═══════════════════════════════════════
  UNDERSTANDING METRIC TYPES:
  ═══════════════════════════════════════
  Each metric has an "input_type":
    - "boolean" = Done/Not Done
    - "emoji_5" = 5-point emoji scale (1=😞 to 5=😄). avg_score_value shows the weekly average.
    - "scale_0_5" = Numeric 0-5. avg_score_value shows the weekly average.
    - "scale_0_10" = Numeric 0-10. avg_score_value shows the weekly average.
  For scale-based metrics, analyze the avg_score_value relative to the scale max.
  Some metrics also include a "reviews" array with the user's personal written reflections.
  
  ═══════════════════════════════════════
  YOUR REPORT (Markdown):
  ═══════════════════════════════════════
  
  # 🗓️ Weekly Performance Review
  
  ## 🏆 Key Wins & Bright Spots
  Identify 2-3 specific things that went well. Look for:
  - Metrics with high avg_score_value relative to their scale
  - High consistency (completed_days close to total_days)
  - Scale metrics trending upward
  - Be specific! (e.g., "Meditation averaged 4.2/5 emoji — consistently good self-assessment")
  
  ## ⚠️ Areas for Focus
  Identify 1-2 bottlenecks or declining trends.
  - Metrics with low avg_score_value (below 50% of scale max)
  - Emoji metrics averaging 😕 or below (≤ 2.0)
  - Boolean metrics with low completion rate
  
  ## 📝 Review Insights (User Voice)
  If any metrics have a "reviews" array, this is GOLDEN qualitative data:
  - Summarize recurring THEMES across the week's reviews (e.g., "3 reviews mention feeling rushed")
  - Identify EMOTIONAL PATTERNS: Is the user frustrated, motivated, bored, anxious?
  - Detect HIDDEN BLOCKERS mentioned in reviews (time, energy, distractions, resources)
  - Find CONTRADICTIONS between scores and reviews (e.g., "Scored 4/5 but wrote 'felt it was rushed'")
  - Quote 1-2 standout reviews that reveal the most insight
  - If no reviews exist: "📝 No reviews this week. Writing brief reflections after metrics helps me coach you better."
  
  ## 🔬 Sub-Metric Analysis
  If "sub_metric_fields_weekly" contains data, analyze each metric's sub-fields:
  - For integer fields: report total and daily average
  - For scale fields: report the weekly average and flag if below target
  - For boolean fields: report completion rate
  - For text notes: summarize themes
  - For text reviews: summarize recurring themes and sentiments from the sub-metric reviews
  - Identify STRONGEST and WEAKEST sub-metrics
  
  ## 📊 System Calibration
  - **Difficulty Check**: Are any scale metrics consistently scoring max (too easy) or near-zero (too hard)?
  - **Input Type Check**: For emoji_5 metrics — is the user always selecting 😐 (3)? That suggests disengagement.
  - **Balance Check**: Are reviews mostly about one life area while others go unreviewed?
  
  ## 🚀 Strategy for Next Week
  - Give 3 bullet points of TACTICAL advice informed by reviews + scores
  - If a user's review mentioned wanting to change something, address it directly
  - Suggest ONE specific "Theme of the Week" that emerges from the data
  - Connect strategy to emotional patterns found in reviews
  
  Format with clear headings, emoji, and bold text for readability. Keep it encouraging but analytical.
  Treat user reviews as the MOST VALUABLE data — they reveal what numbers cannot.
  `
  
      const result = await model.generateContent(prompt)
      return result.response.text()
    } catch (error: any) {
      console.error('[Gemini] Weekly Analysis error:', error)
      return "⚠️ AI Analysis failed. Please check logs."
    }
  }

// Extract structured insights from an existing analysis text
export interface WeeklyMagazine {
  title: string;
  theme_color: string;
  theme: string;
  highlights: { title: string; description: string }[];
  narrative: string;
  intention: string;
}

export type ParsedJournalData = {
    predicted_entries: {
        metric_id: string;
        completed: boolean;
        time_spent_minutes: number | null;
        score_value: number | null;
        review: string | null;
    }[];
    predicted_fields: {
        field_id: string;
        metric_id: string;
        value_int: number | null;
        value_bool: boolean | null;
        value_text: string | null;
        review: string | null;
    }[];
};

export async function parseJournalEntry(journalText: string, metricsContext: any[], fieldsContext: any[]): Promise<ParsedJournalData | null> {
    if (!genAI) {
        console.warn("⚠️ AI Analysis unavailable (API Key missing).");
        return null;
    }

    try {
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash', generationConfig: { responseMimeType: "application/json" } })

        const prompt = `You are a highly analytical NLP parsing agent. Your job is to read a user's natural language journal entry and map their statements to a strict pre-defined schema of habits/metrics.

═══════════════════════════════════════
AVAILABLE METRICS SCHEMA:
═══════════════════════════════════════
${JSON.stringify(metricsContext, null, 2)}

═══════════════════════════════════════
AVAILABLE SUBMETRIC FIELDS SCHEMA:
═══════════════════════════════════════
${JSON.stringify(fieldsContext, null, 2)}

═══════════════════════════════════════
USER'S RAW JOURNAL ENTRY:
═══════════════════════════════════════
"""${journalText}"""

═══════════════════════════════════════
YOUR TASK:
═══════════════════════════════════════
Read the journal entry. If the user explicitly or implicitly indicates they completed one of the 'metrics', add it to the 'predicted_entries' array.
**CRITICAL: Use high-level semantic, fuzzy inference.** The user will rarely use the exact formal metric name. E.g., if they say "did web dev", match it to a metric named "Coding" or "Work". If they say "got out of bed", match it to "Morning Routine". Be smart, lenient, and read between the lines!
- For metrics with input_type 'boolean', set completed: true, score_value: null.
- For metrics with input_type 'emoji_5' (1-5 scale) or 'scale_0_5', try to deduce the score (e.g. "I felt awful" -> score_value: 1. "It was perfect" -> score_value: 5). If they completed it but don't specify quality, default to the max points or a middle value.
- If they mention duration (e.g., "ran for 45 mins"), set time_spent_minutes.
- Set 'review' to a short excerpt of their text relating to that habit.

Do the same for 'predicted_fields' matching the submetric fields. If they answered a submetric (e.g. "drank 3 cups of coffee" where field is "Cups of Coffee" integer), map it to value_int.

Output EXACTLY AND ONLY this JSON structure (Do NOT wrap in markdown \`\`\`json block):
{
  "predicted_entries": [
    {
      "metric_id": "uuid-from-schema",
      "completed": true,
      "time_spent_minutes": 45,
      "score_value": null,
      "review": "Brief note based on their text"
    }
  ],
  "predicted_fields": [
    {
      "field_id": "uuid-from-schema",
      "metric_id": "uuid-assoc",
      "value_int": 3,
      "value_bool": null,
      "value_text": null,
      "review": null
    }
  ]
}
`
        const result = await model.generateContent(prompt)
        const text = result.response.text().trim()
        return JSON.parse(text) as ParsedJournalData
    } catch (error: any) {
        console.error('[Gemini] Journal Parser error:', error)
        return null;
    }
}

export async function generateWeeklyMagazine(data: any): Promise<WeeklyMagazine | null> {
  if (!genAI) {
      console.warn("⚠️ AI Analysis unavailable (API Key missing).");
      return null;
  }

  try {
      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash', generationConfig: { responseMimeType: "application/json" } })

      const prompt = `You are an elite gamification and storytelling AI. You are creating a "Weekly Oracle Magazine" for the user.
This is meant to be an editorial, beautiful, and inspiring recap of their completed week.

═══════════════════════════════════════
WEEKLY DATA (JSON):
═══════════════════════════════════════
${JSON.stringify(data, null, 2)}

═══════════════════════════════════════
YOUR TASK:
═══════════════════════════════════════
Analyze the user's data and write a cohesive, narrative-driven newsletter.

Output EXACTLY AND ONLY this JSON structure (Do NOT wrap in markdown \`\`\`json block):
{
  "title": "A catchy, magazine-style title for the week (e.g. 'The Iron Fortitude', 'Week of the Scholar')",
  "theme_color": "A hex color code representing the week's vibe (e.g. #ef4444 for intense action, #3b82f6 for focus)",
  "theme": "A 1-sentence description of what this week was fundamentally about.",
  "highlights": [
      { "title": "Highlight 1 (e.g. 'Flawless Sleep')", "description": "1-2 sentences detailing the victory." },
      { "title": "Highlight 2", "description": "Another specific data-backed highlight." },
      { "title": "Highlight 3", "description": "A final highlight or a 'battle fought' if they struggled but tried." }
  ],
  "narrative": "A 2-3 paragraph editorial piece summarizing their journey this week. Make it sound like a narrator in an RPG recounting the hero's deeds. Weave the metrics into the story.",
  "intention": "A 1-sentence powerful intention or quest objective for the upcoming week based on where they fell short."
}
`

      const result = await model.generateContent(prompt)
      const text = result.response.text().trim()
      return JSON.parse(text) as WeeklyMagazine
  } catch (error: any) {
      console.error('[Gemini] Weekly Magazine error:', error)
      return null;
  }
}

export interface MorningBriefing {
  greeting: string;
  theme: string;
  priorities: {
    habit_name: string;
    reason: string;
  }[];
}

export async function generateMorningBriefing(userData: any): Promise<MorningBriefing | null> {
  if (!genAI) {
      console.warn("⚠️ AI Analysis unavailable (API Key missing).");
      return null;
  }

  try {
      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash', generationConfig: { responseMimeType: "application/json" } })

      const prompt = `You are a stoic, strategic, and highly analytical AI Coach. You are delivering a concise "Morning Briefing" to the user as they wake up and start their day.
      
═══════════════════════════════════════
USER'S RECENT DATA (JSON):
═══════════════════════════════════════
${JSON.stringify(userData, null, 2)}

═══════════════════════════════════════
YOUR TASK:
═══════════════════════════════════════
Analyze the user's data (yesterday's log, their active quests, and their lowest performing axes/metrics). 
Your sole objective is to cut through the noise and give them EXACTLY 3 specific habits they must prioritize today to maintain balance or achieve growth.

Output EXACTLY AND ONLY this JSON structure (Do NOT wrap in markdown \`\`\`json block):
{
  "greeting": "A short, powerful, stoic greeting. E.g., 'The sun is up, Commander. Time to forge the day.'",
  "theme": "A single focus word for the day based on their data (e.g., 'Discipline', 'Recovery', 'Consistency')",
  "priorities": [
    {
      "habit_name": "The exact name of a real metric from their data to focus on",
      "reason": "1 concise sentence explaining WHY based on their data (e.g., 'You skipped this yesterday' or 'This aligns with your active quest.')"
    },
    // exactly 3 items here
  ]
}
`

      const result = await model.generateContent(prompt)
      const text = result.response.text().trim()
      return JSON.parse(text) as MorningBriefing
  } catch (error: any) {
      console.error('[Gemini] Morning Briefing error:', error)
      return null;
  }
}

// Extract structured insights from an existing analysis text
// Returns { tips, strategies, focus_areas } as a typed object
export interface AiInsightStructured {
  tips: string[]
  strategies: string[]
  focus_areas: { area: string; reason: string }[]
}

export async function generateStructuredInsights(
  rawAnalysis: string
): Promise<AiInsightStructured> {
  const fallback: AiInsightStructured = { tips: [], strategies: [], focus_areas: [] }

  if (!genAI || !rawAnalysis || rawAnalysis.startsWith('⚠️')) return fallback

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

    const prompt = `You are a data extractor. Read the following performance analysis report and extract ONLY:
1. "tips" — 2-3 specific, actionable tips for the user (short bullet phrases, not full sentences)
2. "strategies" — 1-3 medium-term strategy recommendations (slightly broader than tips)
3. "focus_areas" — 1-3 areas the user should focus on, each with a brief reason

Respond ONLY with a valid JSON object in this exact format, no markdown fences, no explanation:
{"tips":["tip1","tip2"],"strategies":["strategy1"],"focus_areas":[{"area":"Area Name","reason":"Why to focus here"}]}

ANALYSIS TO EXTRACT FROM:
${rawAnalysis.substring(0, 4000)}`

    const result = await model.generateContent(prompt)
    const text = result.response.text().trim()

    // Strip any accidental markdown fences
    const cleaned = text.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim()
    const parsed = JSON.parse(cleaned)

    return {
      tips: Array.isArray(parsed.tips) ? parsed.tips.slice(0, 3) : [],
      strategies: Array.isArray(parsed.strategies) ? parsed.strategies.slice(0, 3) : [],
      focus_areas: Array.isArray(parsed.focus_areas)
        ? parsed.focus_areas.slice(0, 3).map((f: any) => ({
            area: String(f.area || ''),
            reason: String(f.reason || ''),
          }))
        : [],
    }
  } catch (error: any) {
    console.error('[Gemini] Structured insights extraction error:', error)
    return fallback
  }
}
