-- Create 'bosses' table for Weekly Gamification Duels
CREATE TABLE IF NOT EXISTS bosses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    max_hp INT NOT NULL DEFAULT 500,
    current_hp INT NOT NULL DEFAULT 500,
    attack_power INT NOT NULL DEFAULT 50, -- Damage dealt to player's streak on missed days
    xp_reward INT NOT NULL DEFAULT 1000, -- massive XP reward for defeating
    status VARCHAR(50) NOT NULL DEFAULT 'active', -- 'active', 'defeated', 'escaped'
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for efficient querying of a user's active bosses
CREATE INDEX IF NOT EXISTS idx_bosses_user_status ON bosses(user_id, status);
