-- Add auto_mode column to config table
ALTER TABLE config 
ADD COLUMN auto_mode boolean DEFAULT false;

-- Add comment for the column
COMMENT ON COLUMN config.auto_mode IS 'Whether the configuration should be processed automatically';

-- Update existing rows to have auto_mode set to false
UPDATE config SET auto_mode = false WHERE auto_mode IS NULL; 