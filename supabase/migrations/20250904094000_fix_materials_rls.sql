-- Fix RLS policies for materials system - disable RLS temporarily

-- Disable RLS on materials table (same as tests table)
ALTER TABLE materials DISABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON materials;
DROP POLICY IF EXISTS "Allow read access to materials" ON materials;
DROP POLICY IF EXISTS "Allow admin access to materials" ON materials;

-- Disable RLS on material_categories table
ALTER TABLE material_categories DISABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON material_categories;
DROP POLICY IF EXISTS "Allow read access to material_categories" ON material_categories;

-- Grant necessary permissions to anon and authenticated roles
GRANT ALL ON materials TO anon;
GRANT ALL ON materials TO authenticated;
GRANT ALL ON material_categories TO anon;
GRANT ALL ON material_categories TO authenticated;

-- Note: Sequences don't exist for these tables (using UUID or other ID type)
