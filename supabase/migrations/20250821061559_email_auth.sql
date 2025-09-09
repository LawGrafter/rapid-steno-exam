/*
  # Rapid Steno MCQ Test System - Email Authentication Migration

  This migration updates the system to use email-based authentication instead of secret keys.
  
  Changes:
  1. Add email field to users table
  2. Make password_hash optional (for future admin authentication if needed)
  3. Remove secret_keys table (no longer needed)
  4. Update RLS policies for email-based auth
*/

-- Add email field to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS email text UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash text;

-- Update existing users to have placeholder email (for migration)
UPDATE users SET email = 'user_' || id || '@placeholder.com' WHERE email IS NULL;

-- Make email required for new users
ALTER TABLE users ALTER COLUMN email SET NOT NULL;

-- Drop the secret_keys table (no longer needed)
DROP TABLE IF EXISTS secret_keys CASCADE;

-- Update RLS policies for email-based authentication
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Admins can manage users" ON users;

-- New RLS policies for email-based auth
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (
    id = auth.uid() OR 
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can manage users" ON users
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- Allow users to update their own profile
CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Create index on email for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Update the default admin user to have proper email
UPDATE users 
SET email = 'admin@rapidsteno.com' 
WHERE role = 'admin' AND email LIKE '%placeholder%';

-- Comment on password_hash field (optional for future use)
COMMENT ON COLUMN users.password_hash IS 'Optional field for future admin authentication. Currently not used for student login.';
