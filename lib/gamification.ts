import sql from '@/lib/db'

// --- XP CONSTANTS ---
export const XP_PER_LOG = 10
export const XP_PER_PERFECT_SCORE = 50    // Score of 100
export const XP_PER_STREAK_BONUS = 5      // Per day of streak (applied to total streak at save time)

// --- LEVEL THRESHOLDS (quadratic curve) ---
// Level N requires N^2 * 75 XP total
export const getLevelThreshold = (level: number) => level * level * 75

export const getLevelFromXP = (xp: number): number => {
  let level = 1
  while (xp >= getLevelThreshold(level + 1)) {
    level++
    if (level >= 100) break // cap at 100
  }
  return level
}

// --- TITLE DEFINITIONS ---
const TITLES: { id: string; name: string; description: string; condition: (stats: UserStats) => boolean }[] = [
  {
    id: 'first_log',
    name: '🌱 First Step',
    description: 'Logged your first day',
    condition: (s) => s.totalLogs >= 1,
  },
  {
    id: 'week_warrior',
    name: '📅 Week Warrior',
    description: 'Logged 7 days in a row',
    condition: (s) => s.longestStreak >= 7,
  },
  {
    id: 'perfect_day',
    name: '💯 Perfect Day',
    description: 'Achieved a perfect score of 100',
    condition: (s) => s.perfectDays >= 1,
  },
  {
    id: 'momentum',
    name: '🔥 Momentum',
    description: 'Logged 30 total days',
    condition: (s) => s.totalLogs >= 30,
  },
  {
    id: 'deep_work',
    name: '🧠 Deep Work Master',
    description: 'Achieved level 5',
    condition: (s) => s.level >= 5,
  },
  {
    id: 'elite',
    name: '🏆 Elite',
    description: 'Achieved level 10',
    condition: (s) => s.level >= 10,
  },
]

interface UserStats {
  totalLogs: number
  longestStreak: number
  perfectDays: number
  level: number
}

// --- AWARD XP ---
export async function awardXP(
  userId: string,
  reason: string,
  amount: number
): Promise<{ xp: number; level: number; leveledUp: boolean; newTitles: string[] }> {
  // 1. Get current XP/level
  const users = await sql`SELECT xp, level, titles FROM users WHERE id = ${userId}`
  if (users.length === 0) throw new Error(`User ${userId} not found`)
  
  const user = users[0]
  const currentXP: number = user.xp || 0
  const currentLevel: number = user.level || 1
  const currentTitles: string[] = user.titles || []

  const newXP = currentXP + amount
  const newLevel = getLevelFromXP(newXP)
  const leveledUp = newLevel > currentLevel

  // 2. Check for new titles
  const stats: UserStats = await getUserStats(userId, newLevel)
  const earnedTitles = TITLES
    .filter(t => !currentTitles.includes(t.id) && t.condition(stats))
    .map(t => t.id)

  const allTitles = [...currentTitles, ...earnedTitles]

  // 3. Update user
  await sql`
    UPDATE users 
    SET xp = ${newXP}, level = ${newLevel}, titles = ${allTitles}
    WHERE id = ${userId}
  `

  // 4. Log XP
  await sql`
    INSERT INTO user_xp_log (user_id, xp_gained, reason) 
    VALUES (${userId}, ${amount}, ${reason})
  `

  return { xp: newXP, level: newLevel, leveledUp, newTitles: earnedTitles }
}

async function getUserStats(userId: string, currentLevel: number): Promise<UserStats> {
  const [logResult, streakResult, perfectResult] = await Promise.all([
    sql`SELECT COUNT(*) as count FROM daily_scores WHERE user_id = ${userId}`,
    sql`SELECT MAX(longest_streak) as max FROM streaks WHERE user_id = ${userId}`,
    sql`SELECT COUNT(*) as count FROM daily_scores WHERE user_id = ${userId} AND total_score = 100`,
  ])

  return {
    totalLogs: Number(logResult[0]?.count || 0),
    longestStreak: Number(streakResult[0]?.max || 0),
    perfectDays: Number(perfectResult[0]?.count || 0),
    level: currentLevel,
  }
}

// --- GET USER XP STATUS (for dashboard) ---
export async function getUserXPStatus(userId: string) {
  const users = await sql`SELECT xp, level, titles FROM users WHERE id = ${userId}`
  if (users.length === 0) return null

  const user = users[0]
  const xp: number = user.xp || 0
  const level: number = user.level || 1
  const titles: string[] = user.titles || []

  const currentThreshold = getLevelThreshold(level)
  const nextThreshold = getLevelThreshold(level + 1)
  const xpIntoLevel = xp - currentThreshold
  const xpNeeded = nextThreshold - currentThreshold
  const progressPercent = Math.min(100, Math.round((xpIntoLevel / xpNeeded) * 100))

  const unlockedTitles = TITLES.filter(t => titles.includes(t.id))

  return {
    xp,
    level,
    progressPercent,
    xpIntoLevel,
    xpNeeded,
    titles: unlockedTitles,
  }
}
