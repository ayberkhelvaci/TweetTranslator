-- Add last_tweet_id column to config table
ALTER TABLE config ADD COLUMN IF NOT EXISTS last_tweet_id TEXT; 