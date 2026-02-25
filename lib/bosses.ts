import sql from '@/lib/db'
import { awardXP } from '@/lib/gamification'

export interface BossEncounter {
    encounter_id: string
    boss_id: string
    name: string
    current_health: number
    max_health: number
    daily_penalty_xp: number
    reward_xp: number
    reward_item_rarity: string
    image_url: string
}

/**
 * Checks if a user has an active boss encounter.
 */
export async function getActiveBoss(userId: string): Promise<BossEncounter | null> {
    const active = await sql`
        SELECT ab.id as encounter_id, ab.current_health, b.id as boss_id, b.name, b.max_health, b.daily_penalty_xp, b.reward_xp, b.reward_item_rarity, b.image_url
        FROM active_bosses ab
        JOIN bosses b ON ab.boss_id = b.id
        WHERE ab.user_id = ${userId} AND ab.defeated_at IS NULL
        LIMIT 1
    `
    return active.length > 0 ? (active[0] as BossEncounter) : null
}

/**
 * Deals damage to the user's active boss.
 */
export async function dealBossDamage(userId: string, damage: number): Promise<{ defeated: boolean; reward?: any }> {
    const active = await getActiveBoss(userId)
    if (!active) return { defeated: false }

    const newHealth = Math.max(0, active.current_health - damage)
    
    if (newHealth <= 0) {
        // Boss Defeated!
        await sql`
            UPDATE active_bosses 
            SET current_health = 0, defeated_at = CURRENT_TIMESTAMP 
            WHERE id = ${active.encounter_id}
        `

        // Award Rewards
        const xpAmount = active.reward_xp || 1000
        await awardXP(userId, `boss_defeated:${active.name}`, xpAmount)
        
        // Award Boss Bounty (Gold)
        const goldBounty = 500
        const { awardGold } = await import('@/lib/gamification')
        await awardGold(userId, goldBounty)
        
        // Grant a random item of the specified rarity (or better)
        const items = await sql`SELECT * FROM items WHERE rarity = ${active.reward_item_rarity || 'epic'}`
        let rewardItem = null
        if (items.length > 0) {
            const randomIndex = Math.floor(Math.random() * items.length)
            rewardItem = items[randomIndex]
            
            await sql`
                INSERT INTO user_inventory (user_id, item_id, quantity)
                VALUES (${userId}, ${rewardItem.id}, 1)
                ON CONFLICT (user_id, item_id)
                DO UPDATE SET quantity = user_inventory.quantity + 1, last_acquired_at = CURRENT_TIMESTAMP
            `
        }

        return { 
            defeated: true, 
            reward: { 
                xp: xpAmount, 
                item: rewardItem,
                boss_name: active.name
            } 
        }
    } else {
        await sql`
            UPDATE active_bosses 
            SET current_health = ${newHealth} 
            WHERE id = ${active.encounter_id}
        `
        return { defeated: false }
    }
}

/**
 * Checks for boss spawn conditions.
 */
export async function checkBossSpawn(userId: string): Promise<BossEncounter | null> {
    // 1. If already in a fight, don't spawn another
    const active = await getActiveBoss(userId)
    if (active) return null

    // 2. Condition: Missed 2 days in a row
    const recentLogs = await sql`
        SELECT date FROM daily_scores 
        WHERE user_id = ${userId} 
        ORDER BY date DESC 
        LIMIT 5
    `
    
    if (recentLogs.length > 0) {
        const lastLogDate = new Date(recentLogs[0].date)
        const today = new Date()
        const diffDays = Math.floor((today.getTime() - lastLogDate.getTime()) / (1000 * 60 * 60 * 24))
        
        if (diffDays >= 2) {
            const boss = await sql`SELECT * FROM bosses WHERE spawn_condition = 'missed_2_days' LIMIT 1`
            if (boss.length > 0) {
                const b = boss[0]
                const encounter = await sql`
                    INSERT INTO active_bosses (user_id, boss_id, current_health)
                    VALUES (${userId}, ${b.id}, ${b.max_health})
                    RETURNING id
                `
                return { 
                    ...b, 
                    boss_id: b.id,
                    encounter_id: encounter[0].id, 
                    current_health: b.max_health 
                } as BossEncounter
            }
        }
    }

    return null
}

/**
 * Processes the daily XP penalty if a boss is active.
 * Should be called once per day per user (e.g., during dashboard fetch).
 */
export async function processDailyBossPenalty(userId: string): Promise<{ penalty_applied: boolean; amount?: number; boss_name?: string }> {
    const active = await getActiveBoss(userId)
    if (!active) return { penalty_applied: false }

    const today = new Date().toISOString().split('T')[0]
    
    // Check if already applied today
    const existing = await sql`
        SELECT id FROM boss_penalty_log 
        WHERE encounter_id = ${active.encounter_id} AND penalty_date = ${today}
    `
    
    if (existing.length > 0) return { penalty_applied: false }

    // Apply Penalty
    let amount = active.daily_penalty_xp || 50
    const reason = `boss_drain:${active.name}:${today}`

    // Check for Iron Will Plating Passive
    const platingPassives = await sql`
        SELECT up.stacks
        FROM user_passives up
        JOIN items i ON up.item_id = i.id
        WHERE i.name = 'Iron Will Plating' AND up.user_id = ${userId}
    `
    if (platingPassives.length > 0) {
        amount -= (platingPassives[0].stacks * 10)
    }
    amount = Math.max(0, amount)
    
    // Deduct XP using gamification helper
    if (amount > 0) {
        const { deductXP } = await import('@/lib/gamification')
        await deductXP(userId, reason, amount)
    }

    // Log the penalty
    await sql`
        INSERT INTO boss_penalty_log (user_id, encounter_id, penalty_date, xp_drained)
        VALUES (${userId}, ${active.encounter_id}, ${today}, ${amount})
    `

    return { 
        penalty_applied: true, 
        amount, 
        boss_name: active.name 
    }
}

