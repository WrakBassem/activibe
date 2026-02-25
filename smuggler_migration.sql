-- 1. Create Smuggler Events Table
CREATE TABLE IF NOT EXISTS smuggler_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    item_1_id VARCHAR(255) NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    item_1_discount_price INTEGER NOT NULL,
    item_2_id VARCHAR(255) NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    item_2_discount_price INTEGER NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Ensure index for fast lookup
CREATE INDEX IF NOT EXISTS idx_smuggler_events_user_id ON smuggler_events(user_id);
CREATE INDEX IF NOT EXISTS idx_smuggler_events_expires_at ON smuggler_events(expires_at);

-- 2. Insert the New Exclusive "Cheat" Items
-- Clear existing versions to make it idempotent
DELETE FROM items WHERE id IN ('smoke_bomb', 'time_turner');

INSERT INTO items (id, name, description, icon, rarity, effect_type, effect_value, price, is_purchasable, category)
VALUES 
('smoke_bomb', 'The Smoke Bomb', 'Temporarily hides all negative (red) scores and metrics on your dashboard for 24 hours. A psychological break.', '💨', 'epic', 'hide_negatives_24h', 1, 600, FALSE, 'consumable'),
('time_turner', 'The Time Turner', 'Allows you to retroactively submit or edit a Daily Log for YESTERDAY, fixing a bad day and saving your streak.', '⏳', 'legendary', 'edit_past_log', 1, 1000, FALSE, 'consumable');
