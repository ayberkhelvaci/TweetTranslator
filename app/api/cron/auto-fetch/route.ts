import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { TwitterApi } from 'twitter-api-v2';

export async function POST(req: Request) {
  try {
    // Verify the secret token
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '').trim();
    
    if (!token || token !== process.env.CRON_SECRET) {
      console.log('Auth failed. Received token:', token?.slice(0, 10));
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('Fetching configurations...');
    // Get all active configurations with auto_mode enabled
    const { data: configs, error: configError } = await supabaseAdmin
      .from('config')
      .select('*, twitter_keys(*)')
      .not('registration_timestamp', 'is', null)
      .eq('auto_mode', true);

    console.log('Configs:', JSON.stringify(configs), 'Error:', configError);

    if (configError) {
      console.error('Config error details:', configError);
      throw new Error('Failed to fetch configurations');
    }

    const results = [];

    // Process each configuration
    for (const config of configs || []) {
      try {
        // Initialize Twitter client
        const client = new TwitterApi({
          appKey: config.twitter_keys.api_key,
          appSecret: config.twitter_keys.api_secret,
          accessToken: config.twitter_keys.access_token,
          accessSecret: config.twitter_keys.access_token_secret,
        });

        // Get tweets since registration
        const tweets = await client.v2.userTimeline(config.source_account, {
          'tweet.fields': ['created_at', 'attachments'],
          'user.fields': ['profile_image_url', 'name', 'username'],
          'media.fields': ['url', 'preview_image_url', 'type'],
          expansions: ['attachments.media_keys', 'author_id'],
          start_time: config.registration_timestamp,
        });

        // Process tweets
        for (const tweet of tweets.data.data || []) {
          // Check if tweet already exists
          const { data: existingTweet } = await supabaseAdmin
            .from('tweets')
            .select('id')
            .eq('source_tweet_id', tweet.id)
            .single();

          if (!existingTweet) {
            // Store new tweet with auto status
            const { error: insertError } = await supabaseAdmin
              .from('tweets')
              .insert({
                user_id: config.user_id,
                source_tweet_id: tweet.id,
                original_text: tweet.text,
                created_at: tweet.created_at,
                status: 'pending_auto',
                author: tweets.includes?.users?.find(u => u.id === tweet.author_id),
                image_urls: tweets.includes?.media
                  ?.filter(m => tweet.attachments?.media_keys?.includes(m.media_key))
                  ?.map(m => m.url || m.preview_image_url)
                  ?.filter(Boolean) || [],
              });

            if (insertError) {
              console.error('Error inserting tweet:', insertError);
              results.push({
                account: config.source_account,
                status: 'error',
                message: 'Failed to store tweet'
              });
            } else {
              results.push({
                account: config.source_account,
                status: 'success',
                message: 'New tweet stored'
              });
            }
          }
        }
      } catch (error) {
        console.error('Error processing account:', config.source_account, error);
        results.push({
          account: config.source_account,
          status: 'error',
          message: error instanceof Error ? error.message : 'Failed to fetch tweets'
        });
      }
    }

    return NextResponse.json({
      success: true,
      results
    });
  } catch (error) {
    console.error('Auto fetch error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
} 