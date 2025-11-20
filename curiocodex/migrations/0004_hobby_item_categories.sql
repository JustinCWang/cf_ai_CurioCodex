-- Per-hobby item category definitions
-- Allows users to define item categories on a hobby before any items exist

CREATE TABLE IF NOT EXISTS hobby_item_categories (
  id TEXT PRIMARY KEY,
  hobby_id TEXT NOT NULL,
  name TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  FOREIGN KEY (hobby_id) REFERENCES hobbies(id) ON DELETE CASCADE
);

-- Ensure category names are unique per hobby (case-sensitive comparison)
CREATE UNIQUE INDEX IF NOT EXISTS idx_hobby_item_categories_hobby_name
  ON hobby_item_categories(hobby_id, name);


