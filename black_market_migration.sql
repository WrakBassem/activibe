-- 1. Add Gold to Users Table
ALTER TABLE users ADD COLUMN IF NOT EXISTS gold INTEGER DEFAULT 0;

-- 2. Update Items Table for Shop Support
ALTER TABLE items ADD COLUMN IF NOT EXISTS price INTEGER;
ALTER TABLE items ADD COLUMN IF NOT EXISTS is_purchasable BOOLEAN DEFAULT FALSE;
ALTER TABLE items ADD COLUMN IF NOT EXISTS category VARCHAR(50);
ALTER TABLE items DROP CONSTRAINT IF EXISTS items_effect_type_check;

-- 3. Create User Passives Table
CREATE TABLE IF NOT EXISTS user_passives (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    item_id VARCHAR(255) NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    stacks INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, item_id)
);

-- Ensure updated_at trigger exists for user_passives
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_timestamp_user_passives') THEN
        CREATE TRIGGER set_timestamp_user_passives
        BEFORE UPDATE ON user_passives
        FOR EACH ROW
        EXECUTE PROCEDURE trigger_set_timestamp();
    END IF;
END $$;

-- 4. Seed the Shop Inventory into the Items Table
-- Clear existing shop items to make this script idempotent
DELETE FROM items WHERE name IN (
  'Chronos Glass', 
  'Scroll of Alacrity', 
  'Oracle''s Token', 
  'Whetstone of Resolve', 
  'Iron Will Plating', 
  'Focus Gauntlets', 
  'Aura of the Ascendant', 
  'Title: "The Unbreakable"'
);

-- Tactical Consumables
INSERT INTO items (id, name, description, effect_type, icon, rarity, price, is_purchasable, category)
VALUES 
(uuid_generate_v4()::varchar, 'Chronos Glass', 'Protects your habit streaks if you miss exactly one day.', 'streak_freeze', '⏳', 'epic', 300, TRUE, 'consumable'),
(uuid_generate_v4()::varchar, 'Scroll of Alacrity', 'Double all XP earned from all sources for 2 hours.', 'xp_boost_2h', '📜', 'rare', 250, TRUE, 'consumable'),
(uuid_generate_v4()::varchar, 'Oracle''s Token', 'Forces an immediate, deep AI Insight report generation outside of normal schedule.', 'force_insight', '🔮', 'legendary', 150, TRUE, 'consumable');

-- Combat Gear (Permanent Passives)
INSERT INTO items (id, name, description, effect_type, icon, rarity, price, is_purchasable, category)
VALUES 
(uuid_generate_v4()::varchar, 'Whetstone of Resolve', 'Increases damage dealt to bosses by +25% for 24 hours.', 'boss_dmg_boost_24h', '🗡️', 'rare', 200, TRUE, 'combat_gear'),
(uuid_generate_v4()::varchar, 'Iron Will Plating', 'Permanent Passive: Reduces the daily XP penalty from active bosses by 10. (Stacks up to 3 times).', 'resist_boss_drain', '🛡️', 'epic', 800, TRUE, 'combat_gear'),
(uuid_generate_v4()::varchar, 'Focus Gauntlets', 'Permanent Passive: Deep Focus Forge sessions now deal 1.5x damage to bosses. (Stacks up to 2 times).', 'focus_boss_dmg_mult', '🥊', 'legendary', 1200, TRUE, 'combat_gear');

-- The "Flex" Tier (Status & Cosmetics)
INSERT INTO items (id, name, description, effect_type, icon, rarity, price, is_purchasable, category)
VALUES 
(uuid_generate_v4()::varchar, 'Aura of the Ascendant', 'Unlocks a permanent golden glowing border around your Avatar.', 'cosmetic_aura_gold', '✨', 'legendary', 5000, TRUE, 'cosmetic'),
(uuid_generate_v4()::varchar, 'Title: "The Unbreakable"', 'Unlocks a unique, equipable title that displays on the Dashboard.', 'cosmetic_title_unbreakable', '👑', 'epic', 2000, TRUE, 'cosmetic');
