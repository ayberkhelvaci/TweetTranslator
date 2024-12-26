-- Create a function to create the configurations table if it doesn't exist
CREATE OR REPLACE FUNCTION create_configurations_table()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    -- Check if the table exists
    IF NOT EXISTS (
        SELECT FROM pg_tables
        WHERE schemaname = 'public'
        AND tablename = 'configurations'
    ) THEN
        -- Create the configurations table
        CREATE TABLE public.configurations (
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
        CREATE INDEX idx_configurations_user_id ON public.configurations(user_id);

        -- Add RLS policies
        ALTER TABLE public.configurations ENABLE ROW LEVEL SECURITY;

        -- Create RLS policies
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
    END IF;
END;
$$; 