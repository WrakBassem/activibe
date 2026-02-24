-- Achievements Migration

-- 1. Add active_title to the users table so they can display an equipped badge
ALTER TABLE users ADD COLUMN IF NOT EXISTS active_title VARCHAR(255) DEFAULT NULL;

-- 2. Create the user_achievements table to store unlocked badges
CREATE TABLE IF NOT EXISTS user_achievements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    achievement_id VARCHAR(255) NOT NULL,
    unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, achievement_id)
);

-- Index for fast lookup when evaluating or displaying
CREATE INDEX IF NOT EXISTS idx_user_achievements_userid ON user_achievements(user_id);
