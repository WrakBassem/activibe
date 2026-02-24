import sql from './db';

// We write SQL directly here to grant XP to avoid circular dependencies.

export type AchievementDef = {
    id: string;
    title: string;
    description: string;
    icon: string;
    xp_reward: number;
    // A function that returns true if the user meets the condition
    evaluate: (userId: string) => Promise<boolean>;
};

export const ACHIEVEMENTS: AchievementDef[] = [
    {
        id: 'first_blood',
        title: 'The Initiate',
        description: 'Log your very first day of data.',
        icon: '🌱',
        xp_reward: 100,
        evaluate: async (userId: string) => {
            const result = await sql`SELECT count(id) FROM daily_scores WHERE user_id = ${userId}`;
            return Number(result[0].count) >= 1;
        }
    },
    {
        id: 'streak_7',
        title: 'The Consistent',
        description: 'Maintain a 7-day logging streak on any metric.',
        icon: '🔥',
        xp_reward: 500,
        evaluate: async (userId: string) => {
            const result = await sql`SELECT max(longest_streak) as max_streak FROM streaks WHERE user_id = ${userId}`;
            return Number(result[0]?.max_streak || 0) >= 7;
        }
    },
    {
        id: 'streak_30',
        title: 'The Ironclad',
        description: 'Maintain an epic 30-day logging streak on any metric.',
        icon: '🛡️',
        xp_reward: 2500,
        evaluate: async (userId: string) => {
            const result = await sql`SELECT max(longest_streak) as max_streak FROM streaks WHERE user_id = ${userId}`;
            return Number(result[0]?.max_streak || 0) >= 30;
        }
    },
    {
        id: 'level_5_strength',
        title: 'The Brawler',
        description: 'Reach Level 5 in the Strength attribute.',
        icon: '💪',
        xp_reward: 1000,
        evaluate: async (userId: string) => {
            const result = await sql`SELECT level FROM user_attributes WHERE user_id = ${userId} AND attribute_name = 'strength'`;
            return Number(result[0]?.level || 0) >= 5;
        }
    },
    {
        id: 'level_10_intellect',
        title: 'The Sage',
        description: 'Reach Level 10 in the Intellect attribute.',
        icon: '🧠',
        xp_reward: 3000,
        evaluate: async (userId: string) => {
            const result = await sql`SELECT level FROM user_attributes WHERE user_id = ${userId} AND attribute_name = 'intellect'`;
            return Number(result[0]?.level || 0) >= 10;
        }
    },
    {
        id: 'perfect_day',
        title: 'Flawless Victory',
        description: 'Achieve a 100% perfect score on a daily log.',
        icon: '🏆',
        xp_reward: 1000,
        evaluate: async (userId: string) => {
            const result = await sql`SELECT count(id) FROM daily_scores WHERE user_id = ${userId} AND total_score = 100`;
            return Number(result[0].count) >= 1;
        }
    }
];

export async function checkAndUnlockAchievements(userId: string): Promise<AchievementDef[]> {
    const newlyUnlocked: AchievementDef[] = [];

    // 1. Get already unlocked achievements for this user
    const existingRows = await sql`SELECT achievement_id FROM user_achievements WHERE user_id = ${userId}`;
    const unlockedIds = new Set(existingRows.map(r => r.achievement_id));

    // 2. Iterate through ALL achievements. If not unlocked, evaluate condition.
    for (const achievement of ACHIEVEMENTS) {
        if (!unlockedIds.has(achievement.id)) {
            try {
                const isMet = await achievement.evaluate(userId);
                if (isMet) {
                    // Unlock it!
                    await sql`
                        INSERT INTO user_achievements (user_id, achievement_id)
                        VALUES (${userId}, ${achievement.id})
                        ON CONFLICT DO NOTHING
                    `;

                    // Grant XP directly
                    await sql`
                        INSERT INTO xp_transactions (user_id, amount, reason)
                        VALUES (${userId}, ${achievement.xp_reward}, ${'achievement:' + achievement.id})
                    `;
                    await sql`
                        UPDATE users 
                        SET total_xp = total_xp + ${achievement.xp_reward}
                        WHERE id = ${userId}
                    `;
                    // Note: This won't trigger the level-up notification on the frontend immediately 
                    // unless the frontend also checks for level changes on ping. 
                    // But the daily log response handles global level ups usually.

                    newlyUnlocked.push(achievement);
                }
            } catch (error) {
                console.error(`Error evaluating achievement ${achievement.id} for user ${userId}:`, error);
            }
        }
    }

    return newlyUnlocked;
}
