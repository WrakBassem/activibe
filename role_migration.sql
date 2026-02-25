-- 1. Add role column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'user';

-- 2. Create index for performance
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- 3. Promote the first user to admin (usually the one setting up the dashboard)
-- We will update the user with the earliest creation date to admin if none exist
UPDATE users 
SET role = 'admin' 
WHERE id IN (
  SELECT id FROM users ORDER BY created_at ASC LIMIT 1
) AND NOT EXISTS (SELECT 1 FROM users WHERE role = 'admin');
