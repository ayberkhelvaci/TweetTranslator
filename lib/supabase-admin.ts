import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL');
}

if (!supabaseServiceRoleKey) {
  throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY');
}

export const supabaseAdmin = createClient<Database>(
  supabaseUrl,
  supabaseServiceRoleKey,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  }
);

// Initialize database tables
async function initializeTables() {
  try {
    // Create tweets table
    await supabaseAdmin.from('tweets').select('count').then(async ({ error }) => {
      if (error && error.code === '42P01') {
        await supabaseAdmin.query(`
          CREATE TABLE IF NOT EXISTS tweets (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            source_tweet_id TEXT NOT NULL,
            original_text TEXT NOT NULL,
            translated_text TEXT,
            image_urls TEXT[] DEFAULT '{}',
            status TEXT NOT NULL DEFAULT 'pending',
            created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
          );
        `);
      }
    });

    // Create config table
    await supabaseAdmin.from('config').select('count').then(async ({ error }) => {
      if (error && error.code === '42P01') {
        await supabaseAdmin.query(`
          CREATE TABLE IF NOT EXISTS config (
            id TEXT PRIMARY KEY DEFAULT 'default',
            source_account TEXT NOT NULL,
            target_language TEXT NOT NULL,
            check_interval INTEGER NOT NULL DEFAULT 5,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
          );
        `);
      }
    });

    // Create api_keys table
    await supabaseAdmin.from('api_keys').select('count').then(async ({ error }) => {
      if (error && error.code === '42P01') {
        await supabaseAdmin.query(`
          CREATE TABLE IF NOT EXISTS api_keys (
            id TEXT PRIMARY KEY DEFAULT 'default',
            openai TEXT,
            twitter_api TEXT,
            twitter_api_secret TEXT,
            twitter_access_token TEXT,
            twitter_access_secret TEXT,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
          );
        `);
      }
    });
  } catch (error) {
    console.error('Error initializing tables:', error);
  }
}

// Initialize storage
async function initialize() {
  try {
    // Create bucket if it doesn't exist
    const { data: buckets } = await supabaseAdmin.storage.listBuckets();
    
    if (!buckets?.find(b => b.name === 'tweet-images')) {
      await supabaseAdmin.storage.createBucket('tweet-images', {
        public: true,
        fileSizeLimit: 10485760, // 10MB
        allowedMimeTypes: ['image/jpeg', 'image/png']
      });
    }

    // Initialize tables
    await initializeTables();
  } catch (error) {
    console.error('Initialization error:', error);
  }
}

// Run initialization
initialize().catch(console.error); 