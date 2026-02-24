import { NextResponse } from 'next/server'
import sql from '@/lib/db'
import { getAuthUserId } from '@/lib/auth-utils'

// Helper to determine XP needed for a specific level.
// Matches the logic in api/daily ( Level = floor(sqrt(total_xp) / 10) + 1 )
// So total_xp needed for level L = ((L - 1) * 10)^2
function getXpForLevel(level: number) {
    if (level <= 1) return 0;
    return Math.pow((level - 1) * 10, 2);
}

export async function GET(request: Request) {
  try {
    const userId = await getAuthUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Default attributes
    const ALL_ATTRIBUTES = ['strength', 'intellect', 'vitality', 'charisma', 'focus'];

    // Fetch user's current attributes
    const dbAttributes = await sql`
        SELECT attribute_name, total_xp, level
        FROM user_attributes
        WHERE user_id = ${userId}
    `;

    // Map db results into an easy lookup object
    const userAttrMap: Record<string, any> = {};
    dbAttributes.forEach(attr => {
        userAttrMap[attr.attribute_name] = attr;
    });

    // Populate the final array, ensuring all standard attributes exist even if 0 XP.
    const structuredAttributes = ALL_ATTRIBUTES.map(name => {
        const raw = userAttrMap[name] || { total_xp: 0, level: 1 };
        
        const xpForCurrentLevel = getXpForLevel(raw.level);
        const xpForNextLevel = getXpForLevel(raw.level + 1);
        
        const xpIntoLevel = Math.max(0, raw.total_xp - xpForCurrentLevel);
        const xpNeededForLevel = xpForNextLevel - xpForCurrentLevel;
        
        const progressPercent = Math.min((xpIntoLevel / xpNeededForLevel) * 100, 100);

        return {
            name,
            total_xp: raw.total_xp,
            level: raw.level,
            progressPercent,
            xpIntoLevel,
            xpNeededForLevel
        }
    });

    return NextResponse.json({
        success: true,
        data: structuredAttributes
    });

  } catch (error: any) {
    console.error('[GET /api/skills] Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
