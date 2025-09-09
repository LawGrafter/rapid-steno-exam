-- Create material categories table
CREATE TABLE IF NOT EXISTS material_categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create materials table
CREATE TABLE IF NOT EXISTS materials (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  tags TEXT[], -- Array of tags
  pdf_url TEXT NOT NULL,
  category_id UUID REFERENCES material_categories(id) ON DELETE SET NULL,
  associated_test_id UUID REFERENCES tests(id) ON DELETE SET NULL,
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'coming_soon')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default material categories
INSERT INTO material_categories (name, description) VALUES
('Computer Awareness', 'Computer fundamentals, hardware, software, and IT concepts'),
('General Knowledge', 'Current affairs, history, geography, and general awareness'),
('English Language', 'Grammar, vocabulary, comprehension, and language skills'),
('Quantitative Aptitude', 'Mathematics, numerical ability, and problem solving'),
('Reasoning Ability', 'Logical reasoning, analytical thinking, and problem solving'),
('Banking Awareness', 'Banking concepts, financial awareness, and economic knowledge');

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_materials_category_id ON materials(category_id);
CREATE INDEX IF NOT EXISTS idx_materials_status ON materials(status);
CREATE INDEX IF NOT EXISTS idx_materials_associated_test_id ON materials(associated_test_id);
CREATE INDEX IF NOT EXISTS idx_materials_created_at ON materials(created_at);

-- Enable RLS (Row Level Security)
ALTER TABLE material_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE materials ENABLE ROW LEVEL SECURITY;

-- Create policies for material_categories
CREATE POLICY "Allow read access to material categories" ON material_categories
  FOR SELECT USING (true);

CREATE POLICY "Allow admin full access to material categories" ON material_categories
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

-- Create policies for materials
CREATE POLICY "Allow users to read published materials" ON materials
  FOR SELECT USING (
    status IN ('published', 'coming_soon')
  );

CREATE POLICY "Allow admin full access to materials" ON materials
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_material_categories_updated_at 
  BEFORE UPDATE ON material_categories 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_materials_updated_at 
  BEFORE UPDATE ON materials 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
