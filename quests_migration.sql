-- Create 'quests' table for Dynamic RPG Goals
CREATE TABLE IF NOT EXISTS quests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    metric_id UUID REFERENCES metrics(id) ON DELETE SET NULL, -- The specific habit/task required
    target_value INT NOT NULL DEFAULT 1, -- e.g., do it 3 times
    current_value INT NOT NULL DEFAULT 0,
    xp_reward INT NOT NULL DEFAULT 150,
    status VARCHAR(50) NOT NULL DEFAULT 'active', -- 'active', 'completed', 'expired'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- Index for efficient querying of a user's active quests
CREATE INDEX IF NOT EXISTS idx_quests_user_status ON quests(user_id, status);
CREATE INDEX IF NOT EXISTS idx_quests_user_metric ON quests(user_id, metric_id);
