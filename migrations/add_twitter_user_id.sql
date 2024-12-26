-- Add twitter_user_id column to config table
ALTER TABLE config ADD COLUMN IF NOT EXISTS twitter_user_id TEXT;

-- Add index for twitter_user_id
CREATE INDEX IF NOT EXISTS idx_config_twitter_user_id ON config(twitter_user_id); 