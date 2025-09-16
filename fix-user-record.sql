-- Fix user record for puja.242401@gmail.com
-- Ensure the user exists in users table with correct role

-- Insert or update user record to ensure it exists with correct role
INSERT INTO users (email, full_name, role, created_at)
VALUES ('puja.242401@gmail.com', 'Puja Kumari', 'student', NOW())
ON CONFLICT (email) 
DO UPDATE SET 
  role = 'student',
  full_name = COALESCE(EXCLUDED.full_name, users.full_name);

-- Verify the user record
SELECT 
  id, 
  email, 
  full_name, 
  role, 
  created_at
FROM users 
WHERE email = 'puja.242401@gmail.com';
