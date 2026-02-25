-- ============================================================
-- Adversarial Boss Fights Schema
-- Adds the registry of bosses and tracks active boss encounters.
-- ============================================================

-- 1. Create the Boss Registry Table
CREATE TABLE IF NOT EXISTS bosses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    max_health INTEGER NOT NULL DEFAULT 500,
    daily_penalty_xp INTEGER NOT NULL DEFAULT 50,
    reward_xp INTEGER NOT NULL DEFAULT 1000,
    reward_item_rarity VARCHAR(50) DEFAULT 'epic',
    spawn_condition VARCHAR(100) NOT NULL,
    image_url VARCHAR(500),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Create the Active Encounters Table
CREATE TABLE IF NOT EXISTS active_bosses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    boss_id UUID NOT NULL REFERENCES bosses(id) ON DELETE CASCADE,
    current_health INTEGER NOT NULL,
    spawned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    defeated_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT unique_active_boss UNIQUE (user_id, boss_id, defeated_at)
);
-- Ensure the trigger function exists first
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Ensure updated_at triggers exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_timestamp_bosses') THEN
        CREATE TRIGGER set_timestamp_bosses
        BEFORE UPDATE ON bosses
        FOR EACH ROW
        EXECUTE PROCEDURE trigger_set_timestamp();
    END IF;
END $$;

-- 3. Seed Initial Bosses
-- Only insert if the table is empty to avoid duplicates on re-runs
INSERT INTO bosses (name, description, max_health, daily_penalty_xp, reward_xp, reward_item_rarity, spawn_condition, image_url)
SELECT 'The Procrastination Demon', 'A massive beast built from unstarted tasks and endless scrolling. It feeds on inaction.', 500, 50, 1000, 'epic', 'missed_2_days', '👹'
WHERE NOT EXISTS (SELECT 1 FROM bosses WHERE spawn_condition = 'missed_2_days');

INSERT INTO bosses (name, description, max_health, daily_penalty_xp, reward_xp, reward_item_rarity, spawn_condition, image_url)
SELECT 'The Burnout Behemoth', 'A towering titan of absolute exhaustion. It spawns when you push too hard without recovery.', 800, 100, 2000, 'legendary', 'low_score_streak_3', '🧟'
WHERE NOT EXISTS (SELECT 1 FROM bosses WHERE spawn_condition = 'low_score_streak_3');
