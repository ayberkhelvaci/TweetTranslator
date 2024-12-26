-- Enable required extensions if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

DO $$ 
BEGIN
    -- Add is_historical column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'tweets' 
        AND column_name = 'is_historical'
    ) THEN
        ALTER TABLE tweets 
        ADD COLUMN is_historical BOOLEAN NOT NULL DEFAULT false;
    END IF;

    -- Add registration_timestamp if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'config' 
        AND column_name = 'registration_timestamp'
    ) THEN
        ALTER TABLE config 
        ADD COLUMN registration_timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP;
    END IF;

    -- Add check constraint if it doesn't exist
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.check_constraints
        WHERE constraint_name = 'check_interval_positive'
    ) THEN
        ALTER TABLE config 
        ADD CONSTRAINT check_interval_positive 
        CHECK (check_interval > 0);
    END IF;
END
$$;

-- Drop existing indexes if they exist and recreate them
DROP INDEX IF EXISTS idx_tweets_is_historical;
DROP INDEX IF EXISTS idx_tweets_created_at;
DROP INDEX IF EXISTS idx_config_registration;

-- Create optimized indexes
CREATE INDEX idx_tweets_is_historical ON tweets(is_historical) WHERE is_historical = true;
CREATE INDEX idx_tweets_created_at ON tweets(created_at DESC);
CREATE INDEX idx_config_registration ON config(registration_timestamp DESC);

-- Update historical tweets with proper type casting and error handling
UPDATE tweets t
SET is_historical = true
FROM config c
WHERE c.user_id::uuid = t.user_id::uuid
AND t.created_at < c.registration_timestamp;

-- Add trigger to automatically update is_historical based on registration_timestamp
CREATE OR REPLACE FUNCTION update_tweet_historical_status()
RETURNS TRIGGER AS $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM config c 
        WHERE c.user_id::uuid = NEW.user_id::uuid 
        AND NEW.created_at < c.registration_timestamp
    ) THEN
        NEW.is_historical := true;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_tweet_historical_status ON tweets;
CREATE TRIGGER set_tweet_historical_status
    BEFORE INSERT ON tweets
    FOR EACH ROW
    EXECUTE FUNCTION update_tweet_historical_status(); 