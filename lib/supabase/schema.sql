-- Create tables
CREATE TABLE IF NOT EXISTS config (
    id TEXT PRIMARY KEY,
    source_account TEXT,
    target_language TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE TABLE IF NOT EXISTS tweets (
    id SERIAL PRIMARY KEY,
    user_id TEXT NOT NULL,
    source_tweet_id TEXT NOT NULL,
    original_text TEXT NOT NULL,
    translated_text TEXT,
    image_urls TEXT[] DEFAULT '{}',
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    UNIQUE(user_id, source_tweet_id)
);

-- Create twitter_keys table function
CREATE OR REPLACE FUNCTION create_twitter_keys_table()
RETURNS void AS $$
BEGIN
    CREATE TABLE IF NOT EXISTS twitter_keys (
        user_id TEXT PRIMARY KEY,
        api_key TEXT,
        api_secret TEXT,
        access_token TEXT,
        access_token_secret TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
    );
END;
$$ LANGUAGE plpgsql;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_tweets_user_id ON tweets(user_id);
CREATE INDEX IF NOT EXISTS idx_tweets_status ON tweets(status);

-- Create update trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_config_updated_at
    BEFORE UPDATE ON config
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tweets_updated_at
    BEFORE UPDATE ON tweets
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create trigger for twitter_keys updated_at
CREATE TRIGGER update_twitter_keys_updated_at
    BEFORE UPDATE ON twitter_keys
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column(); 