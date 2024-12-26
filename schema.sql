-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Clean up existing tables if they exist
DROP TABLE IF EXISTS config CASCADE;
DROP TABLE IF EXISTS tweets CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS api_keys CASCADE;

-- Create users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    twitter_id TEXT NOT NULL UNIQUE,
    twitter_username TEXT NOT NULL,
    name TEXT,
    email TEXT,
    image TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create config table
CREATE TABLE config (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    source_account TEXT NOT NULL,
    target_language TEXT NOT NULL DEFAULT 'en',
    check_interval INTEGER NOT NULL DEFAULT 5,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id)
);

-- Create tweets table
CREATE TABLE tweets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tweet_id TEXT NOT NULL,
    original_text TEXT NOT NULL,
    translated_text TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    image_urls TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, tweet_id)
);

-- Create api_keys table
CREATE TABLE api_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    openai TEXT,
    twitter_api TEXT,
    twitter_api_secret TEXT,
    twitter_access_token TEXT,
    twitter_access_secret TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id)
);

-- Create updated_at function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create updated_at triggers
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_config_updated_at
    BEFORE UPDATE ON config
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tweets_updated_at
    BEFORE UPDATE ON tweets
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_api_keys_updated_at
    BEFORE UPDATE ON api_keys
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE config ENABLE ROW LEVEL SECURITY;
ALTER TABLE tweets ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

-- Create policies for users table
CREATE POLICY "Enable all access for service role" ON users
    FOR ALL USING (
        (SELECT is_service_role() FROM auth.jwt())
    );

CREATE POLICY "Enable insert for authenticated users" ON users
    FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Enable select for authenticated users" ON users
    FOR SELECT
    USING (auth.uid()::text = id::text OR (SELECT is_service_role() FROM auth.jwt()));

CREATE POLICY "Enable update for users based on id" ON users
    FOR UPDATE
    USING (auth.uid()::text = id::text);

-- Create policies for config table
CREATE POLICY "Enable all for service role" ON config
    FOR ALL USING (
        (SELECT is_service_role() FROM auth.jwt())
    );

CREATE POLICY "Enable read access for user's own config" ON config
    FOR SELECT
    USING (auth.uid()::text = user_id::text);

CREATE POLICY "Enable insert access for user's own config" ON config
    FOR INSERT
    WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Enable update access for user's own config" ON config
    FOR UPDATE
    USING (auth.uid()::text = user_id::text);

-- Create policies for tweets table
CREATE POLICY "Enable read access for user's own tweets" ON tweets
    FOR SELECT
    USING (auth.uid()::text = user_id::text);

CREATE POLICY "Enable insert access for user's own tweets" ON tweets
    FOR INSERT
    WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Enable update access for user's own tweets" ON tweets
    FOR UPDATE
    USING (auth.uid()::text = user_id::text);

CREATE POLICY "Enable delete access for user's own tweets" ON tweets
    FOR DELETE
    USING (auth.uid()::text = user_id::text);

-- Create policies for api_keys table
CREATE POLICY "Enable read access for user's own api keys" ON api_keys
    FOR SELECT
    USING (auth.uid()::text = user_id::text);

CREATE POLICY "Enable insert access for user's own api keys" ON api_keys
    FOR INSERT
    WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Enable update access for user's own api keys" ON api_keys
    FOR UPDATE
    USING (auth.uid()::text = user_id::text);

-- Create indexes for better performance
CREATE INDEX idx_users_twitter_id ON users(twitter_id);
CREATE INDEX idx_config_user_id ON config(user_id);
CREATE INDEX idx_tweets_user_id ON tweets(user_id);
CREATE INDEX idx_tweets_status ON tweets(status);
CREATE INDEX idx_api_keys_user_id ON api_keys(user_id);

-- Grant necessary permissions to authenticated and service roles
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO service_role;

GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- Helper function to check if the current role is the service role
CREATE OR REPLACE FUNCTION is_service_role()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN NULLIF(current_setting('request.jwt.claims', true)::json->>'role', '')::text = 'service_role';
EXCEPTION
    WHEN OTHERS THEN RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;