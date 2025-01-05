-- Add note_tweet column to tweets table
ALTER TABLE tweets ADD COLUMN IF NOT EXISTS note_tweet JSONB;

-- Add comment explaining the column purpose
COMMENT ON COLUMN tweets.note_tweet IS 'JSON object containing the full text and metadata for long-form tweets'; 