-- Simplify tests.status enum and remove obsolete date columns; update RLS for coming_soon visibility
-- 1) Drop old CHECK constraint (name may vary); standard name used here
ALTER TABLE tests DROP CONSTRAINT IF EXISTS tests_status_check;

-- 2) Migrate any legacy statuses to the new set before re-adding the constraint
UPDATE tests SET status = 'published' WHERE status = 'completed';

-- 3) Re-add CHECK constraint with new allowed values
ALTER TABLE tests ADD CONSTRAINT tests_status_check CHECK (status IN ('draft', 'published', 'coming_soon'));

-- 4) Keep default as draft (explicitly set, in case it was changed)
ALTER TABLE tests ALTER COLUMN status SET DEFAULT 'draft';

-- 5) Remove obsolete scheduling columns no longer used by the application
ALTER TABLE tests DROP COLUMN IF EXISTS starts_at;
ALTER TABLE tests DROP COLUMN IF EXISTS ends_at;

-- 6) Update RLS policies to allow students to view both published and coming_soon tests
-- Drop and recreate affected policies to include coming_soon
DROP POLICY IF EXISTS "Students can view published tests" ON tests;
CREATE POLICY "Students can view published tests" ON tests
  FOR SELECT USING (
    status IN ('published', 'coming_soon') OR 
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- Update dependent policies on questions/options to align with new visibility
DROP POLICY IF EXISTS "Questions visible with tests" ON questions;
CREATE POLICY "Questions visible with tests" ON questions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM tests 
      WHERE tests.id = questions.test_id 
      AND (tests.status IN ('published', 'coming_soon') OR 
           EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'))
    )
  );

DROP POLICY IF EXISTS "Options visible with questions" ON options;
CREATE POLICY "Options visible with questions" ON options
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM questions q
      JOIN tests t ON t.id = q.test_id
      WHERE q.id = options.question_id 
      AND (t.status IN ('published', 'coming_soon') OR 
           EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'))
    )
  );
