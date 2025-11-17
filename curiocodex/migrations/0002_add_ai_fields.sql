-- Add AI-related fields to hobbies and items tables
-- Supports embeddings, categorization, and tagging

-- Add fields to hobbies table
ALTER TABLE hobbies ADD COLUMN embedding_id TEXT;
ALTER TABLE hobbies ADD COLUMN category TEXT;
ALTER TABLE hobbies ADD COLUMN tags TEXT; -- JSON array stored as text

-- Add fields to items table
ALTER TABLE items ADD COLUMN embedding_id TEXT;
ALTER TABLE items ADD COLUMN category TEXT;
ALTER TABLE items ADD COLUMN tags TEXT; -- JSON array stored as text

-- Add indexes for category filtering
CREATE INDEX IF NOT EXISTS idx_hobbies_category ON hobbies(category);
CREATE INDEX IF NOT EXISTS idx_items_category ON items(category);
CREATE INDEX IF NOT EXISTS idx_hobbies_user_category ON hobbies(user_id, category);

