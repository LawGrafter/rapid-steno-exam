-- Add category field to tests table for organizing tests into folders
ALTER TABLE tests ADD COLUMN category text DEFAULT 'General';

-- Create index for better performance when filtering by category
CREATE INDEX idx_tests_category ON tests(category);

-- Update existing tests to have a default category
UPDATE tests SET category = 'General' WHERE category IS NULL;
