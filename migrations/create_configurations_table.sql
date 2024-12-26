-- Create configurations table
CREATE TABLE IF NOT EXISTS public.configurations (
    id BIGSERIAL PRIMARY KEY,
    user_id TEXT NOT NULL,
    source_account TEXT NOT NULL,
    check_interval INTEGER NOT NULL,
    target_language TEXT NOT NULL,
    registration_timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
    last_check_time TIMESTAMP WITH TIME ZONE NOT NULL,
    UNIQUE(user_id)
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_configurations_user_id ON public.configurations(user_id);

-- Add RLS policies
ALTER TABLE public.configurations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own configurations"
    ON public.configurations FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own configurations"
    ON public.configurations FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own configurations"
    ON public.configurations FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own configurations"
    ON public.configurations FOR DELETE
    USING (auth.uid() = user_id); 