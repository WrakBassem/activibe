-- ============================================================
-- Campaign Mode Schema
-- Sequential boss fights for long-term progression.
-- ============================================================

-- 1. Create the Campaign Boss Registry
CREATE TABLE IF NOT EXISTS campaign_bosses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stage_number INTEGER NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    max_health INTEGER NOT NULL,
    reward_xp INTEGER NOT NULL DEFAULT 500,
    reward_gold INTEGER NOT NULL DEFAULT 200,
    reward_item_rarity VARCHAR(50) DEFAULT 'uncommon',
    image_url VARCHAR(500),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Create User Campaign Progress Table
CREATE TABLE IF NOT EXISTS user_campaign_progress (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    current_stage INTEGER NOT NULL DEFAULT 1,
    current_boss_health INTEGER,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Seed initial campaign bosses
INSERT INTO campaign_bosses (stage_number, name, description, max_health, reward_xp, reward_gold, reward_item_rarity, image_url)
VALUES 
(1, 'Slime of Sloth', 'A jelly-like creature composed of postponed alarms and unmade beds. Slow and squishy.', 200, 300, 100, 'common', '🧪'),
(2, 'The Social Scroll-Serpent', 'A flickering snake that distracts with endless blue light. Dealing damage requires deep focus.', 500, 600, 250, 'uncommon', '🐍'),
(3, 'Knight of Distraction', 'An armored spirit carrying a shield of notifications. Only consistent high logs can pierce its armor.', 1200, 1200, 500, 'rare', '🛡️'),
(4, 'The Procrastination Dragon', 'A mountain-sized beast that sleeps on a pile of unfinished goals. Its breath causes extreme fatigue.', 3000, 2500, 1000, 'epic', '🐲'),
(5, 'Shadow of the Ego', 'Your most formidable foe. A direct reflection of your own resistance to change. Absolute consistency is required.', 7500, 5000, 2500, 'legendary', '👤')
ON CONFLICT (stage_number) DO NOTHING;
