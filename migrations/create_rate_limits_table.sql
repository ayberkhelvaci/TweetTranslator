-- Create rate_limits table
CREATE TABLE IF NOT EXISTS rate_limits (
    user_id TEXT PRIMARY KEY,
    reset BIGINT NOT NULL,
    remaining INTEGER NOT NULL,
    endpoint TEXT NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_user_id FOREIGN KEY (user_id) REFERENCES config(user_id) ON DELETE CASCADE
);

-- Add index for reset time
CREATE INDEX IF NOT EXISTS idx_rate_limits_reset ON rate_limits(reset); 