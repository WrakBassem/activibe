-- ============================================================
-- Multi-User Isolation Migration
-- Adds user_id to axes, metrics, priority_cycles tables so
-- each user has their own independent configuration.
-- ============================================================

-- Step 1: Add user_id column to axes (nullable first to allow existing row updates)
ALTER TABLE axes ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE;

-- Step 2: Add user_id column to metrics (nullable first)
ALTER TABLE metrics ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE;

-- Step 3: Add user_id column to priority_cycles
ALTER TABLE priority_cycles ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE;

-- Step 4: Assign all existing rows to the primary (oldest) user account.
-- This preserves all historical data.
UPDATE axes
SET user_id = (SELECT id FROM users ORDER BY created_at ASC LIMIT 1)
WHERE user_id IS NULL;

UPDATE metrics
SET user_id = (SELECT id FROM users ORDER BY created_at ASC LIMIT 1)
WHERE user_id IS NULL;

UPDATE priority_cycles
SET user_id = (SELECT id FROM users ORDER BY created_at ASC LIMIT 1)
WHERE user_id IS NULL;

-- Step 5: Make the columns NOT NULL (all rows now have a user)
ALTER TABLE axes ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE metrics ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE priority_cycles ALTER COLUMN user_id SET NOT NULL;

-- Step 6: Add performance indexes
CREATE INDEX IF NOT EXISTS idx_axes_user_id ON axes(user_id);
CREATE INDEX IF NOT EXISTS idx_metrics_user_id ON metrics(user_id);
CREATE INDEX IF NOT EXISTS idx_priority_cycles_user_id ON priority_cycles(user_id);

-- Done! All existing data is preserved and assigned to the primary user account.
-- New axes/metrics/cycles created via Settings will be scoped to the logged-in user.
