-- ============================================================
-- Hardcore Mode Migration
-- Adds tracking for the high-risk, high-reward "Hardcore Mode".
-- ============================================================

-- 1. Add hardcore tracking columns to the users table
-- We check for existence first to avoid errors if run multiple times
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='hardcore_mode_active') THEN
        ALTER TABLE users ADD COLUMN hardcore_mode_active BOOLEAN DEFAULT FALSE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='hardcore_start_date') THEN
        ALTER TABLE users ADD COLUMN hardcore_start_date TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;

-- 2. Add an index for quick lookup of active hardcore users (useful for cron jobs/scaling)
CREATE INDEX IF NOT EXISTS idx_users_hardcore_active ON users(hardcore_mode_active) WHERE hardcore_mode_active = TRUE;
