import sql from '@/lib/db'
import { awardXP, awardGold } from '@/lib/gamification'

export interface CampaignStatus {
    current_stage: number;
    current_boss_health: number;
    boss: {
        id: string;
        name: string;
        description: string;
        max_health: number;
        reward_xp: number;
        reward_gold: number;
        reward_item_rarity: string;
        image_url: string;
    } | null;
}

/**
 * Fetches the user's current campaign progress and boss details.
 * Initializes progress if it doesn't exist.
 */
export async function getCampaignStatus(userId: string): Promise<CampaignStatus> {
    // 1. Get user progress
    let progress = await sql`
        SELECT current_stage, current_boss_health FROM user_campaign_progress
        WHERE user_id = ${userId}
    `

    if (progress.length === 0) {
        // Initialize progress
        await sql`
            INSERT INTO user_campaign_progress (user_id, current_stage)
            VALUES (${userId}, 1)
        `
        progress = [{ current_stage: 1, current_boss_health: null }] as any
    }

    const currentStage = progress[0].current_stage

    // 2. Get boss details for this stage
    const bossQuery = await sql`
        SELECT * FROM campaign_bosses WHERE stage_number = ${currentStage}
    `

    if (bossQuery.length === 0) {
        // No more bosses?
        return {
            current_stage: currentStage,
            current_boss_health: 0,
            boss: null
        }
    }

    const boss = bossQuery[0]
    let currentHealth = progress[0].current_boss_health

    if (currentHealth === null) {
        // Initialize boss health
        currentHealth = boss.max_health
        await sql`
            UPDATE user_campaign_progress
            SET current_boss_health = ${currentHealth}
            WHERE user_id = ${userId}
        `
    }

    return {
        current_stage: currentStage,
        current_boss_health: currentHealth,
        boss: {
            id: boss.id,
            name: boss.name,
            description: boss.description,
            max_health: boss.max_health,
            reward_xp: boss.reward_xp,
            reward_gold: boss.reward_gold,
            reward_item_rarity: boss.reward_item_rarity,
            image_url: boss.image_url
        }
    }
}

/**
 * Deals damage to the user's current campaign boss.
 */
export async function dealCampaignDamage(userId: string, damage: number): Promise<{ defeated: boolean; reward?: any; remaining_health: number }> {
    const status = await getCampaignStatus(userId)
    if (!status.boss) return { defeated: false, remaining_health: 0 }

    const newHealth = Math.max(0, status.current_boss_health - damage)
    
    if (newHealth <= 0) {
        // Boss Defeated!
        await sql`
            UPDATE user_campaign_progress
            SET current_stage = current_stage + 1, current_boss_health = null, updated_at = CURRENT_TIMESTAMP
            WHERE user_id = ${userId}
        `

        // Award Rewards
        await awardXP(userId, `campaign_boss_defeated:${status.boss.name}`, status.boss.reward_xp)
        await awardGold(userId, status.boss.reward_gold)
        
        // Grant a random item of the specified rarity
        const items = await sql`SELECT * FROM items WHERE rarity = ${status.boss.reward_item_rarity || 'rare'}`
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
            remaining_health: 0,
            reward: { 
                xp: status.boss.reward_xp, 
                gold: status.boss.reward_gold,
                item: rewardItem,
                boss_name: status.boss.name
            } 
        }
    } else {
        await sql`
            UPDATE user_campaign_progress
            SET current_boss_health = ${newHealth}, updated_at = CURRENT_TIMESTAMP
            WHERE user_id = ${userId}
        `
        return { defeated: false, remaining_health: newHealth }
    }
}
