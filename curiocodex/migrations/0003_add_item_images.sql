-- Add image support to items table
-- Stores image URL (from R2) for item photos

ALTER TABLE items ADD COLUMN image_url TEXT;

-- Add index for image_url queries (optional, but useful for filtering)
CREATE INDEX IF NOT EXISTS idx_items_image_url ON items(image_url) WHERE image_url IS NOT NULL;

