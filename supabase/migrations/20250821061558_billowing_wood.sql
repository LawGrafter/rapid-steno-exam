/*
  # Rapid Steno MCQ Test System Database Schema

  1. New Tables
    - `users` - Store user information (students and admins)
    - `secret_keys` - Manage student access keys
    - `tests` - Test definitions and scheduling
    - `questions` - MCQ questions for each test
    - `options` - Answer options for each question
    - `attempts` - Track student test attempts
    - `answers` - Store individual question responses

  2. Security
    - Enable RLS on all tables
    - Students can only see their own data
    - Admins can see all data
    - Proper policies for each table
*/

-- Users table (students and admins)
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  role text NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'admin')),
  created_at timestamptz DEFAULT now()
);

-- Secret keys for student access
CREATE TABLE IF NOT EXISTS secret_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  is_used boolean DEFAULT false,
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Tests table
CREATE TABLE IF NOT EXISTS tests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text DEFAULT '',
  duration_minutes integer NOT NULL,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'completed')),
  shuffle_questions boolean DEFAULT true,
  shuffle_options boolean DEFAULT true,
  negative_marking boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Questions table
CREATE TABLE IF NOT EXISTS questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id uuid NOT NULL REFERENCES tests(id) ON DELETE CASCADE,
  text text NOT NULL,
  points decimal DEFAULT 1,
  negative_points decimal DEFAULT 0,
  order_index integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Options table
CREATE TABLE IF NOT EXISTS options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id uuid NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  label text NOT NULL,
  is_correct boolean DEFAULT false,
  order_index integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Student test attempts
CREATE TABLE IF NOT EXISTS attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  test_id uuid NOT NULL REFERENCES tests(id) ON DELETE CASCADE,
  started_at timestamptz DEFAULT now(),
  submitted_at timestamptz,
  total_score decimal DEFAULT 0,
  status text DEFAULT 'active' CHECK (status IN ('active', 'submitted')),
  time_remaining integer, -- in seconds
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, test_id) -- One attempt per student per test
);

-- Individual answers
CREATE TABLE IF NOT EXISTS answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id uuid NOT NULL REFERENCES attempts(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  chosen_option_id uuid REFERENCES options(id) ON DELETE SET NULL,
  is_correct boolean DEFAULT false,
  score decimal DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(attempt_id, question_id)
);

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE secret_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE options ENABLE ROW LEVEL SECURITY;
ALTER TABLE attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE answers ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Users: Students can only see their own data, admins can see all
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (
    auth.uid() = id OR 
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can manage users" ON users
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- Secret keys: Readable by all for validation, manageable by admins
CREATE POLICY "Secret keys readable for validation" ON secret_keys
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage secret keys" ON secret_keys
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- Tests: Published tests visible to students, all tests to admins
CREATE POLICY "Students can view published tests" ON tests
  FOR SELECT USING (
    status = 'published' OR 
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can manage tests" ON tests
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- Questions: Visible based on test visibility
CREATE POLICY "Questions visible with tests" ON questions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM tests 
      WHERE tests.id = questions.test_id 
      AND (tests.status = 'published' OR 
           EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'))
    )
  );

CREATE POLICY "Admins can manage questions" ON questions
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- Options: Visible based on question visibility
CREATE POLICY "Options visible with questions" ON options
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM questions q
      JOIN tests t ON t.id = q.test_id
      WHERE q.id = options.question_id 
      AND (t.status = 'published' OR 
           EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'))
    )
  );

CREATE POLICY "Admins can manage options" ON options
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- Attempts: Students see own attempts, admins see all
CREATE POLICY "Users can view own attempts" ON attempts
  FOR SELECT USING (
    user_id = auth.uid() OR 
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Students can create own attempts" ON attempts
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Students can update own attempts" ON attempts
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Admins can manage attempts" ON attempts
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- Answers: Students see own answers, admins see all
CREATE POLICY "Users can view own answers" ON answers
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM attempts WHERE attempts.id = answers.attempt_id AND attempts.user_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Students can manage own answers" ON answers
  FOR ALL USING (
    EXISTS (SELECT 1 FROM attempts WHERE attempts.id = answers.attempt_id AND attempts.user_id = auth.uid())
  );

CREATE POLICY "Admins can view all answers" ON answers
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- Create default admin user (password should be changed immediately)
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'admin@rapidsteno.com',
  crypt('admin123', gen_salt('bf')),
  now(),
  now(),
  now()
) ON CONFLICT DO NOTHING;

-- Create admin user in our users table
INSERT INTO users (id, full_name, role)
SELECT auth.users.id, 'System Admin', 'admin'
FROM auth.users
WHERE email = 'admin@rapidsteno.com'
ON CONFLICT DO NOTHING;