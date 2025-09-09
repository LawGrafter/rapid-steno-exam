-- Clear all existing test attempts and answers
-- This will reset the system and remove duplicate attempts

-- Delete all answers first (due to foreign key constraints)
DELETE FROM answers;

-- Delete all attempts
DELETE FROM attempts;

-- Reset any test statuses if needed
UPDATE tests SET status = 'published' WHERE status = 'completed';

-- Verify cleanup
SELECT 
  (SELECT COUNT(*) FROM attempts) as remaining_attempts,
  (SELECT COUNT(*) FROM answers) as remaining_answers;
