-- The ai_insights table has a check constraint that only allows certain report_types (e.g., 'daily', 'weekly').
-- We need to drop the old constraint and add a new one that includes 'morning'.

ALTER TABLE ai_insights DROP CONSTRAINT IF EXISTS ai_insights_report_type_check;

ALTER TABLE ai_insights ADD CONSTRAINT ai_insights_report_type_check 
CHECK (report_type IN ('daily', 'weekly', 'monthly', 'morning', 'evening'));

-- This allows the Morning Briefing to be correctly cached in the database.
