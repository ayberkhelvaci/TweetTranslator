import { supabaseAdmin } from '@/lib/supabase-admin';

export async function checkLatestTweet(userId: string) {
  try {
    // Get user's configuration
    const { data: config, error: configError } = await supabaseAdmin
      .from('configurations')
      .select('target_account')
      .eq('user_id', userId)
      .single();

    if (configError || !config?.target_account) {
      throw new Error('Target account not configured');
    }

    // Get the last processed tweet
    const { data: lastTweet } = await supabaseAdmin
      .from('tweets')
      .select('tweet_id')
      .eq('user_id', userId)
      .order('posted_at', { ascending: false })
      .limit(1)
      .single();

    // Get user's Twitter API keys
    const { data: keys, error: keysError } = await supabaseAdmin
      .from('twitter_keys')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (keysError || !keys) {
      throw new Error('Twitter API keys not found');
    }

    // Return empty array for now - actual Twitter API implementation will be added later
    return [];
  } catch (error) {
    console.error('Error checking latest tweet:', error);
    throw error;
  }
} 