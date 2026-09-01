-- Run these SQL commands in Supabase SQL Editor to set up your database

-- Create forum_posts table
-- Channels: general, suggestions, feedback, bugs, reports
CREATE TABLE forum_posts (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  channel TEXT NOT NULL,
  author TEXT NOT NULL,
  content TEXT NOT NULL,
  image_url TEXT,
  likes INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create active_users table (for tracking live users)
CREATE TABLE active_users (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  session_id TEXT UNIQUE NOT NULL,
  last_seen TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_forum_posts_channel ON forum_posts(channel);
CREATE INDEX idx_forum_posts_created_at ON forum_posts(created_at DESC);
CREATE INDEX idx_active_users_last_seen ON active_users(last_seen DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE forum_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE active_users ENABLE ROW LEVEL SECURITY;

-- Create public read policy for forum_posts
CREATE POLICY "forum_posts_public_read" ON forum_posts
  FOR SELECT USING (true);

-- Create public insert policy for forum_posts
CREATE POLICY "forum_posts_public_insert" ON forum_posts
  FOR INSERT WITH CHECK (true);

-- Create public update policy for forum_posts (for likes)
CREATE POLICY "forum_posts_public_update" ON forum_posts
  FOR UPDATE USING (true) WITH CHECK (true);

-- Create public read policy for active_users
CREATE POLICY "active_users_public_read" ON active_users
  FOR SELECT USING (true);

-- Create public insert policy for active_users
CREATE POLICY "active_users_public_insert" ON active_users
  FOR INSERT WITH CHECK (true);

-- Create public delete policy for active_users (cleanup old sessions)
CREATE POLICY "active_users_public_delete" ON active_users
  FOR DELETE USING (true);

-- Optional: Create a function to clean up old user sessions (runs every hour)
-- This can be set up in Supabase with pg_cron extension
-- CREATE OR REPLACE FUNCTION cleanup_old_sessions()
-- RETURNS void AS $$
-- BEGIN
--   DELETE FROM active_users WHERE last_seen < NOW() - INTERVAL '1 hour';
-- END;
-- $$ LANGUAGE plpgsql;

-- Optional: Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_forum_posts_updated_at BEFORE UPDATE ON forum_posts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
