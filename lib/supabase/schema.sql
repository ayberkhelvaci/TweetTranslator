-- Drop existing tables if they exist
DROP TABLE IF EXISTS rate_limits CASCADE;
DROP TABLE IF EXISTS tweets CASCADE;
DROP TABLE IF EXISTS twitter_keys CASCADE;
DROP TABLE IF EXISTS config CASCADE;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create config table
CREATE TABLE config (
    user_id UUID PRIMARY KEY,
    source_account TEXT NOT NULL,
    target_language TEXT NOT NULL DEFAULT 'en',
    check_interval INTEGER NOT NULL DEFAULT 5,
    last_tweet_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create tweets table
CREATE TABLE tweets (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES config(user_id) ON DELETE CASCADE,
    source_tweet_id TEXT NOT NULL,
    original_text TEXT NOT NULL,
    translated_text TEXT,
    author_username TEXT NOT NULL,
    author_profile_image TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    error_message TEXT,
    posted_tweet_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    UNIQUE(user_id, source_tweet_id)
);

-- Update tweets table to add conversation_id
ALTER TABLE tweets
ADD COLUMN IF NOT EXISTS conversation_id text,
ADD COLUMN IF NOT EXISTS thread_id text,
ADD COLUMN IF NOT EXISTS thread_position integer,
ADD COLUMN IF NOT EXISTS is_thread_start boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS media_attachments jsonb[];

-- Create twitter_keys table
CREATE TABLE twitter_keys (
    user_id UUID PRIMARY KEY REFERENCES config(user_id) ON DELETE CASCADE,
    api_key TEXT,
    api_secret TEXT,
    access_token TEXT,
    access_token_secret TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create rate_limits table
CREATE TABLE rate_limits (
    user_id UUID PRIMARY KEY REFERENCES config(user_id) ON DELETE CASCADE,
    reset BIGINT NOT NULL,
    remaining INTEGER NOT NULL,
    endpoint TEXT NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Create indexes
CREATE INDEX idx_tweets_user_id ON tweets(user_id);
CREATE INDEX idx_tweets_status ON tweets(status);
CREATE INDEX idx_rate_limits_reset ON rate_limits(reset);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_config_updated_at
    BEFORE UPDATE ON config
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tweets_updated_at
    BEFORE UPDATE ON tweets
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_twitter_keys_updated_at
    BEFORE UPDATE ON twitter_keys
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE config ENABLE ROW LEVEL SECURITY;
ALTER TABLE tweets ENABLE ROW LEVEL SECURITY;
ALTER TABLE twitter_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own config"
    ON config FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own config"
    ON config FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own config"
    ON config FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own tweets"
    ON tweets FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own tweets"
    ON tweets FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tweets"
    ON tweets FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own twitter keys"
    ON twitter_keys FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own twitter keys"
    ON twitter_keys FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own twitter keys"
    ON twitter_keys FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own rate limits"
    ON rate_limits FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own rate limits"
    ON rate_limits FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own rate limits"
    ON rate_limits FOR UPDATE
    USING (auth.uid() = user_id); 