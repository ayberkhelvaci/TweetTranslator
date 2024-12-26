-- Add is_historical column to tweets table
ALTER TABLE tweets ADD COLUMN IF NOT EXISTS is_historical BOOLEAN DEFAULT false;

-- Add registration_timestamp to config table
ALTER TABLE config ADD COLUMN IF NOT EXISTS registration_timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

-- Create index for is_historical flag
CREATE INDEX IF NOT EXISTS idx_tweets_is_historical ON tweets(is_historical);

-- Update existing tweets to be marked as historical
UPDATE tweets SET is_historical = true WHERE created_at < (
    SELECT registration_timestamp 
    FROM config 
    WHERE user_id = tweets.user_id
); 