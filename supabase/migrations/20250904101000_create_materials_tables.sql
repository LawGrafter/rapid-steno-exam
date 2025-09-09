-- Create materials system tables

-- Create material_categories table
CREATE TABLE IF NOT EXISTS material_categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create materials table
CREATE TABLE IF NOT EXISTS materials (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  tags TEXT[] DEFAULT '{}',
  pdf_url TEXT NOT NULL,
  category_id UUID REFERENCES material_categories(id) ON DELETE SET NULL,
  associated_test_id UUID REFERENCES tests(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'coming_soon')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_materials_category_id ON materials(category_id);
CREATE INDEX IF NOT EXISTS idx_materials_test_id ON materials(associated_test_id);
CREATE INDEX IF NOT EXISTS idx_materials_status ON materials(status);
CREATE INDEX IF NOT EXISTS idx_materials_created_at ON materials(created_at);

-- Insert default categories
INSERT INTO material_categories (name, description) VALUES 
  ('Computer Awareness', 'Computer fundamentals and IT concepts'),
  ('General Knowledge', 'Current affairs and general awareness'),
  ('English Language', 'Grammar and language skills'),
  ('Quantitative Aptitude', 'Mathematics and numerical ability'),
  ('Reasoning', 'Logical and analytical reasoning')
ON CONFLICT (name) DO NOTHING;

-- Disable RLS (same as tests table)
ALTER TABLE materials DISABLE ROW LEVEL SECURITY;
ALTER TABLE material_categories DISABLE ROW LEVEL SECURITY;

-- Grant permissions
GRANT ALL ON materials TO anon;
GRANT ALL ON materials TO authenticated;
GRANT ALL ON material_categories TO anon;
GRANT ALL ON material_categories TO authenticated;
