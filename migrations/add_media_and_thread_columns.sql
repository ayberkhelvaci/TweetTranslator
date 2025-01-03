-- Add columns for media handling
ALTER TABLE tweets ADD COLUMN IF NOT EXISTS tweet_structure JSONB;
ALTER TABLE tweets ADD COLUMN IF NOT EXISTS media_attachments JSONB;

-- Add columns for thread relationships
ALTER TABLE tweets ADD COLUMN IF NOT EXISTS thread_id TEXT;
ALTER TABLE tweets ADD COLUMN IF NOT EXISTS thread_position INTEGER;

-- Add index for thread lookups
CREATE INDEX IF NOT EXISTS idx_tweets_thread_id ON tweets(thread_id);

-- Add comment explaining the column purposes
COMMENT ON COLUMN tweets.tweet_structure IS 'JSON array describing the sequence of text and media in the tweet';
COMMENT ON COLUMN tweets.media_attachments IS 'JSON array containing details of media attachments';
COMMENT ON COLUMN tweets.thread_id IS 'ID of the thread this tweet belongs to';
COMMENT ON COLUMN tweets.thread_position IS 'Position of this tweet in the thread (0 for first tweet)'; 