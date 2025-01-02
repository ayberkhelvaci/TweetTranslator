-- Add posted_tweet_id column to tweets table
ALTER TABLE tweets ADD COLUMN IF NOT EXISTS posted_tweet_id TEXT; 