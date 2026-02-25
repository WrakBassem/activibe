-- ============================================================
-- Loot Drops & Inventory System Migration
-- Creates the static items catalog and user-specific inventory.
-- ============================================================

-- 1. Create the static Items catalog
CREATE TABLE IF NOT EXISTS items (
    id VARCHAR PRIMARY KEY,
    name VARCHAR NOT NULL,
    description TEXT NOT NULL,
    icon VARCHAR NOT NULL, -- Emoji or icon name
    rarity VARCHAR NOT NULL CHECK (rarity IN ('common', 'rare', 'epic', 'legendary')),
    effect_type VARCHAR NOT NULL CHECK (effect_type IN ('freeze_streak', 'xp_boost', 'score_boost', 'instant_insight')),
    effect_value INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Create the User Inventory tracking table
CREATE TABLE IF NOT EXISTS user_inventory (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    item_id VARCHAR REFERENCES items(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
    last_acquired_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, item_id)
);

-- 3. Create the Active Buffs tracking table
CREATE TABLE IF NOT EXISTS active_buffs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    item_id VARCHAR REFERENCES items(id) ON DELETE CASCADE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indices for performance
CREATE INDEX IF NOT EXISTS idx_user_inventory_user_id ON user_inventory(user_id);
CREATE INDEX IF NOT EXISTS idx_active_buffs_user_id ON active_buffs(user_id);
CREATE INDEX IF NOT EXISTS idx_active_buffs_expires_at ON active_buffs(expires_at);

-- ============================================================
-- Seed the Base Items
-- ============================================================
INSERT INTO items (id, name, description, icon, rarity, effect_type, effect_value)
VALUES 
    ('focus_shard', 'Focus Shard', 'Consume to gain a temporary +20% XP boost for the next 24 hours.', '⚡', 'common', 'xp_boost', 20),
    ('oracles_insight', 'Oracle''s Insight', 'Instantly forces the AI to generate a highly detailed recovery roadmap based on your weakest habits.', '👁️', 'rare', 'instant_insight', 0),
    ('streak_freeze', 'Streak Freeze', 'Automatically protects your longest streak from breaking for one missed day. Max 1 active.', '🛡️', 'epic', 'freeze_streak', 1)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    icon = EXCLUDED.icon,
    rarity = EXCLUDED.rarity,
    effect_type = EXCLUDED.effect_type,
    effect_value = EXCLUDED.effect_value;

-- Note: The implementation of consuming these items is handled in the API logic.
