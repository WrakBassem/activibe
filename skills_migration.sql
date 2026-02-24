-- 1. Add rpg_attribute column to the existing metrics table
-- We'll default to 'vitality' to prevent nulls, but these can be updated later via UI/scripts.
-- Common attributes: strength, intellect, vitality, charisma, focus
ALTER TABLE metrics 
ADD COLUMN IF NOT EXISTS rpg_attribute VARCHAR(50) DEFAULT 'vitality';

-- 2. Create the user_attributes tracking table for RPG Skill XP
CREATE TABLE IF NOT EXISTS user_attributes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    attribute_name VARCHAR(50) NOT NULL,
    total_xp INT NOT NULL DEFAULT 0,
    level INT NOT NULL DEFAULT 1,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, attribute_name)
);

-- Note: We don't overwrite existing metrics, but let's do a basic update 
-- if they happen to have names that match common RPG tropes.
UPDATE metrics SET rpg_attribute = 'strength' WHERE name ILIKE '%workout%' OR name ILIKE '%exercise%' OR name ILIKE '%gym%';
UPDATE metrics SET rpg_attribute = 'intellect' WHERE name ILIKE '%read%' OR name ILIKE '%study%' OR name ILIKE '%learn%';
UPDATE metrics SET rpg_attribute = 'focus' WHERE name ILIKE '%work%' OR name ILIKE '%code%' OR name ILIKE '%deep work%';
UPDATE metrics SET rpg_attribute = 'vitality' WHERE name ILIKE '%sleep%' OR name ILIKE '%water%' OR name ILIKE '%meditate%';
UPDATE metrics SET rpg_attribute = 'charisma' WHERE name ILIKE '%social%' OR name ILIKE '%call%' OR name ILIKE '%network%';
