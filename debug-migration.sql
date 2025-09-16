-- Debug script to check migration results
-- Run this to see what happened to your tests

-- Check if tests still exist
SELECT COUNT(*) as total_tests FROM tests;

-- Check categories created
SELECT * FROM test_categories ORDER BY display_order;

-- Check topics created  
SELECT * FROM test_topics ORDER BY category_id, display_order;

-- Check tests with their new relationships
SELECT 
  t.id,
  t.title,
  t.status,
  t.topic_id,
  t.category_id,
  tt.name as topic_name,
  tc.name as category_name
FROM tests t
LEFT JOIN test_topics tt ON t.topic_id = tt.id
LEFT JOIN test_categories tc ON t.category_id = tc.id
ORDER BY t.created_at;

-- Check for tests without proper relationships
SELECT COUNT(*) as tests_without_topic FROM tests WHERE topic_id IS NULL;
SELECT COUNT(*) as tests_without_category FROM tests WHERE category_id IS NULL;
