-- Migration to add Topics layer between Categories and Tests
-- This creates the proper structure: Categories → Topics → Tests

-- Step 1: Create proper categories table (replacing the simple text field)
CREATE TABLE IF NOT EXISTS test_categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 2: Create topics table (the missing layer)
CREATE TABLE IF NOT EXISTS test_topics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  category_id UUID NOT NULL REFERENCES test_categories(id) ON DELETE CASCADE,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(category_id, name)
);

-- Step 3: Add topic_id to tests table and make category_id reference the new table
ALTER TABLE tests ADD COLUMN IF NOT EXISTS topic_id UUID REFERENCES test_topics(id) ON DELETE SET NULL;
ALTER TABLE tests ADD COLUMN IF NOT EXISTS category_id_new UUID REFERENCES test_categories(id) ON DELETE SET NULL;

-- Step 4: Migrate existing data
-- First, insert existing categories into the new categories table
INSERT INTO test_categories (name, description, display_order)
SELECT DISTINCT 
  category as name,
  'Migrated from existing tests' as description,
  ROW_NUMBER() OVER (ORDER BY category) as display_order
FROM tests 
WHERE category IS NOT NULL AND category != ''
ON CONFLICT (name) DO NOTHING;

-- Step 5: For each existing category, create a default topic and migrate tests
DO $$
DECLARE
    cat_record RECORD;
    new_topic_id UUID;
BEGIN
    -- Loop through each category
    FOR cat_record IN 
        SELECT DISTINCT category FROM tests WHERE category IS NOT NULL AND category != ''
    LOOP
        -- Insert a default topic for this category
        INSERT INTO test_topics (name, description, category_id)
        SELECT 
            cat_record.category || ' - General',
            'Default topic for ' || cat_record.category || ' tests',
            tc.id
        FROM test_categories tc 
        WHERE tc.name = cat_record.category
        RETURNING id INTO new_topic_id;
        
        -- Update all tests in this category to use the new topic
        UPDATE tests 
        SET 
            topic_id = new_topic_id,
            category_id_new = (SELECT id FROM test_categories WHERE name = cat_record.category)
        WHERE category = cat_record.category;
    END LOOP;
END $$;

-- Step 6: Handle tests without categories
INSERT INTO test_categories (name, description, display_order)
VALUES ('General', 'General tests without specific category', 0)
ON CONFLICT (name) DO NOTHING;

INSERT INTO test_topics (name, description, category_id)
SELECT 
    'Uncategorized',
    'Tests without specific topic',
    tc.id
FROM test_categories tc 
WHERE tc.name = 'General'
ON CONFLICT (category_id, name) DO NOTHING;

-- Update tests without category
UPDATE tests 
SET 
    topic_id = (
        SELECT tt.id 
        FROM test_topics tt 
        JOIN test_categories tc ON tt.category_id = tc.id 
        WHERE tc.name = 'General' AND tt.name = 'Uncategorized'
    ),
    category_id_new = (SELECT id FROM test_categories WHERE name = 'General')
WHERE category IS NULL OR category = '' OR topic_id IS NULL;

-- Step 7: Clean up - drop old category column and rename new one
ALTER TABLE tests DROP COLUMN IF EXISTS category;
ALTER TABLE tests RENAME COLUMN category_id_new TO category_id;

-- Step 8: Make topic_id required now that all tests have been migrated
ALTER TABLE tests ALTER COLUMN topic_id SET NOT NULL;

-- Step 9: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_test_categories_display_order ON test_categories(display_order);
CREATE INDEX IF NOT EXISTS idx_test_topics_category_id ON test_topics(category_id);
CREATE INDEX IF NOT EXISTS idx_test_topics_display_order ON test_topics(display_order);
CREATE INDEX IF NOT EXISTS idx_tests_topic_id ON tests(topic_id);
CREATE INDEX IF NOT EXISTS idx_tests_category_id ON tests(category_id);

-- Step 10: Disable RLS and grant permissions (consistent with existing tables)
ALTER TABLE test_categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE test_topics DISABLE ROW LEVEL SECURITY;

GRANT ALL ON test_categories TO anon;
GRANT ALL ON test_categories TO authenticated;
GRANT ALL ON test_topics TO anon;
GRANT ALL ON test_topics TO authenticated;

-- Step 11: Add some sample data structure for demonstration
INSERT INTO test_categories (name, description, display_order) VALUES 
  ('Computer Awareness', 'Computer fundamentals and IT concepts', 1),
  ('General Knowledge', 'Current affairs and general awareness', 2),
  ('English Language', 'Grammar and language skills', 3),
  ('Quantitative Aptitude', 'Mathematics and numerical ability', 4),
  ('Reasoning', 'Logical and analytical reasoning', 5)
ON CONFLICT (name) DO UPDATE SET 
  description = EXCLUDED.description,
  display_order = EXCLUDED.display_order;

-- Add some sample topics for Computer Awareness
INSERT INTO test_topics (name, description, category_id, display_order)
SELECT 
  topic_name,
  topic_description,
  tc.id,
  topic_order
FROM test_categories tc,
(VALUES 
  ('Computer Fundamentals', 'Basic computer concepts and terminology', 1),
  ('Operating Systems', 'Windows, Linux, and OS concepts', 2),
  ('Internet & Networking', 'Web technologies and networking basics', 3),
  ('MS Office', 'Word, Excel, PowerPoint applications', 4),
  ('Computer Hardware', 'Hardware components and peripherals', 5)
) AS topics(topic_name, topic_description, topic_order)
WHERE tc.name = 'Computer Awareness'
ON CONFLICT (category_id, name) DO NOTHING;
