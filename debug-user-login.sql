-- Debug script to check user login issue for puja.242401@gmail.com

-- 1. Check if user exists in users table
SELECT 
  id, 
  email, 
  full_name, 
  role, 
  created_at
FROM users 
WHERE email = 'puja.242401@gmail.com';

-- 2. Check user subscriptions
SELECT 
  us.id,
  us.user_id,
  us.status,
  us.is_active,
  us.expires_at,
  p.name as plan_name,
  p.display_name
FROM user_subscriptions us
JOIN plans p ON us.plan_id = p.id
JOIN users u ON us.user_id = u.id
WHERE u.email = 'puja.242401@gmail.com';

-- 3. Check if there are any case sensitivity issues
SELECT 
  id, 
  email, 
  full_name, 
  role
FROM users 
WHERE LOWER(email) = LOWER('puja.242401@gmail.com');

-- 4. List all users with similar email pattern
SELECT 
  id, 
  email, 
  full_name, 
  role
FROM users 
WHERE email ILIKE '%puja%' OR email ILIKE '%242401%';
