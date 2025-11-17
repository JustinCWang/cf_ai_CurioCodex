-- Initial database schema for CurioCodex
-- Creates tables for users, hobbies, and items

-- Users table: Stores user account information
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- Hobbies table: Stores user hobbies
CREATE TABLE IF NOT EXISTS hobbies (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Items table: Stores items within hobbies
CREATE TABLE IF NOT EXISTS items (
  id TEXT PRIMARY KEY,
  hobby_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER,
  FOREIGN KEY (hobby_id) REFERENCES hobbies(id) ON DELETE CASCADE
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_hobbies_user_id ON hobbies(user_id);
CREATE INDEX IF NOT EXISTS idx_items_hobby_id ON items(hobby_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

