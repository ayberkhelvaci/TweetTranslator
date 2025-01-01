-- Add error_message column to tweets table
ALTER TABLE tweets ADD COLUMN IF NOT EXISTS error_message TEXT; 