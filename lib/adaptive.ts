
import sql from './db';

export type AdaptiveSuggestion = {
    metric_id: string;
    metric_name: string;
    current_difficulty: number;
    suggested_difficulty: number;
    type: 'increase' | 'decrease';
    reason: string;
}

export async function analyzeDifficulty(userId: string): Promise<AdaptiveSuggestion[]> {
    // 1. Fetch metrics and their recent history (last 14 days)
    // We look for consistent completion (too easy) or consistent failure (too hard)
    
    const stats = await sql`
        SELECT 
            m.id, 
            m.name, 
            m.difficulty_level,
            COUNT(de.id) as total_days,
            SUM(CASE WHEN de.completed THEN 1 ELSE 0 END) as completed_days
        FROM metrics m
        JOIN daily_entries de ON m.id = de.metric_id
        WHERE de.user_id = ${userId}
          AND de.date >= CURRENT_DATE - INTERVAL '14 days'
          AND m.active = TRUE
        GROUP BY m.id
        HAVING COUNT(de.id) >= 7 -- Need at least 7 days of data
    `;

    const suggestions: AdaptiveSuggestion[] = [];

    for (const s of stats) {
        const rate = parseInt(s.completed_days) / parseInt(s.total_days);
        
        // CASE 1: Too Easy (Level Up)
        // > 85% completion AND difficulty < 5
        if (rate >= 0.85 && s.difficulty_level < 5) {
            suggestions.push({
                metric_id: s.id,
                metric_name: s.name,
                current_difficulty: s.difficulty_level,
                suggested_difficulty: s.difficulty_level + 1,
                type: 'increase',
                reason: `You've completed this ${Math.round(rate * 100)}% of the time recently. You're ready for the next level!`
            });
        }

        // CASE 2: Too Hard (Level Down)
        // < 20% completion AND difficulty > 1
        else if (rate <= 0.20 && s.difficulty_level > 1) {
            suggestions.push({
                metric_id: s.id,
                metric_name: s.name,
                current_difficulty: s.difficulty_level,
                suggested_difficulty: s.difficulty_level - 1,
                type: 'decrease',
                reason: `Completion is low (${Math.round(rate * 100)}%). Lowering the difficulty might help you build momentum.`
            });
        }
    }

    return suggestions;
}
